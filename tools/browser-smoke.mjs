import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { freshState, startTrip, settleTrip, BAGS, DURATIONS, updateCardStory } from '../core.js'
const KEY='dsh-travel-frog.state.v1'
await mkdir('artifacts',{recursive:true})
const log=await readFile('.verification/harness.log','utf8')
const url=log.match(/http:\/\/127\.0\.0\.1:3088\/\?token=\S+/)?.[0]
assert.ok(url,'Isolated local Harness startup URL required')
const browser=await chromium.launch({channel:'chrome',headless:true})
const context=await browser.newContext({viewport:{width:1440,height:1000}})
const page=await context.newPage(), errors=[], results=[]
page.setDefaultTimeout(15000)
let aiRequests=0
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)))
page.on('pageerror',e=>errors.push(e.message))
context.on('request',r=>{if(new URL(r.url()).pathname==='/travel-frog/story')aiRequests++})
const check=name=>{results.push(name);console.log('PASS '+name)}
const open=async p=>{
  await p.goto(url)
  await p.getByRole('button',{name:'蛙旅',exact:true}).waitFor()
  const intro=p.getByRole('button',{name:'继续',exact:true})
  if(await intro.isVisible())await intro.click()
  await p.getByRole('button',{name:'蛙旅',exact:true}).click()
  await p.locator('[data-travel-frog]').waitFor()
}
const state=async p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)
const importState=async(p,s)=>{
  p.once('dialog',d=>d.accept())
  await p.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))})
  await p.waitForFunction(({key,a,b})=>{const current=localStorage.getItem(key);return current===a||current===b},{key:KEY,a:JSON.stringify(s),b:JSON.stringify(settleTrip(s,Date.now()))})
}
try {
  await open(page)
  await page.getByLabel('想带回什么灵感？').fill('听雨，也听自己')
  await page.screenshot({path:'artifacts/01-home.png'})
  check('真实 DSH 侧栏与原生主面板挂载')
  await page.getByRole('button',{name:'装好行囊，出发',exact:true}).click()
  await page.getByText('小蛙出门了',{exact:true}).waitFor()
  const initial=await state(page)
  assert.equal(initial.trip.theme,'听雨，也听自己')
  await page.getByRole('button',{name:'新建会话',exact:true}).first().click()
  // Real elapsed time, not a mocked model or simulated browser clock.
  await page.waitForTimeout(61000)
  await page.reload()
  await page.getByRole('button',{name:'蛙旅',exact:true}).click()
  await page.locator('[data-card-id]').waitFor()
  assert.equal((await state(page)).cards.length,1)
  assert.equal(aiRequests,0)
  check('真实一分钟旅行，离开面板再刷新归来，一张收藏，零模型调用')
  await page.getByRole('button',{name:'请模型写一封信',exact:true}).click()
  await page.getByRole('button',{name:'这封信已收藏',exact:true}).waitFor()
  assert.equal((await state(page)).cards[0].ai,true)
  assert.equal(aiRequests,1)
  await page.screenshot({path:'artifacts/02-postcard.png'})
  check('真实 ctx.llm 流式 fixture 写信与存档，成功禁止重复调用')
  const response=await fetch('http://127.0.0.1:3088/travel-frog/story',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})
  assert.equal(response.status,401)
  check('无宿主认证直接请求返回401')
  const second=await context.newPage();await open(second)
  await Promise.all([
    page.getByRole('button',{name:'装好行囊，出发',exact:true}).click(),
    second.getByRole('button',{name:'装好行囊，出发',exact:true}).click()
  ])
  await page.waitForFunction(key=>!!JSON.parse(localStorage.getItem(key)).trip,KEY)
  const active=await state(page)
  assert.ok(active.trip)
  assert.equal(active.cards.length,1)
  assert.equal((await state(second)).trip.id,active.trip.id)
  // Simulate reopening after a long absence with valid, elapsed trip timestamps.
  active.trip.startedAt-=120000;active.trip.returnAt-=120000
  await importState(second,active)
  await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).cards.length===2,KEY)
  await second.waitForTimeout(1200)
  assert.equal((await state(page)).cards.length,2)
  assert.equal(new Set((await state(page)).cards.map(c=>c.id)).size,2)
  check('双窗口同时出发与离线跳跃归来：无重复旅程或收藏')
  const before=await state(page)
  await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')})
  await page.getByRole('alert').waitFor()
  assert.deepEqual(await state(page),before)
  check('损坏存档导入安全拒绝且保留当前数据')
  // Delay the real server response; another tab restores a newer same-ID card.
  await page.waitForTimeout(5100)
  let release, arrived, deliveredStatus, deliveredBody
  const gate=new Promise(r=>release=r), arrival=new Promise(r=>arrived=r)
  await page.route('**/travel-frog/story',async route=>{
    const fetched=await route.fetch();deliveredStatus=fetched.status();deliveredBody=await fetched.json();arrived();await gate;await route.fulfill({response:fetched})
  })
  await page.getByRole('button',{name:'请模型写一封信',exact:true}).first().click()
  await arrival
  assert.equal(deliveredStatus,200,'Race must delay a SUCCESSFUL real model response')
  assert.equal(typeof deliveredBody.text,'string')
  const restored=await state(second), target=restored.cards.find(c=>!c.ai)
  const newer=updateCardStory(restored,target.id,'这是另一窗口刚恢复的新版本，不能被旧响应覆盖。')
  await importState(second,newer)
  await second.waitForFunction(({key,id})=>JSON.parse(localStorage.getItem(key)).cards.find(c=>c.id===id)?.story==='这是另一窗口刚恢复的新版本，不能被旧响应覆盖。',{key:KEY,id:target.id})
  release()
  await page.getByRole('button',{name:'正在写信…',exact:true}).waitFor({state:'hidden'})
  assert.equal((await state(page)).cards.find(c=>c.id===target.id).story,'这是另一窗口刚恢复的新版本，不能被旧响应覆盖。')
  await page.unroute('**/travel-frog/story')
  check('延迟真实模型响应遇到另一窗口导入：保留更新后的明信片')
  // Only the model error response is injected; baseline postcard remains usable.
  const newTrip=startTrip(freshState(),{bagId:BAGS[1].id,durationMs:DURATIONS[0].durationMs,theme:''},1000,'failure-card',()=>0)
  const ready=settleTrip(newTrip,61000)
  await importState(page,ready)
  await page.route('**/travel-frog/story',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"no-model"}'}))
  await page.getByRole('button',{name:'请模型写一封信',exact:true}).click()
  await page.getByRole('alert').waitFor()
  assert.deepEqual(await state(page),ready)
  check('模型不可用时保留完整本地明信片（注入503响应）')
  await page.unroute('**/travel-frog/story')
  await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'})
  await page.setViewportSize({width:700,height:900})
  await page.screenshot({path:'artifacts/03-dark-narrow.png'})
  const overflow=await page.locator('[data-travel-frog]').evaluate(e=>e.scrollWidth>e.clientWidth+1)
  assert.equal(overflow,false)
  check('深色、窄窗口无横向溢出')
  await page.evaluate(key=>localStorage.setItem(key,'{broken'),KEY)
  await page.reload();await page.getByRole('button',{name:'蛙旅',exact:true}).click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),'{broken')
  assert.ok(await page.getByRole('button',{name:'装好行囊，出发',exact:true}).isDisabled())
  check('损坏现有存档不静默覆盖，并阻止继续写入')
  assert.deepEqual(errors,[])
  check('浏览器无 pageerror')
  await writeFile('artifacts/browser-results.json',JSON.stringify({results,errors},null,2))
} finally {await browser.close()}
