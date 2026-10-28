const React = require('react')
const h = React.createElement
const KEY = 'dsh-travel-frog.state.v1'
const LOCK = 'dsh-travel-frog.state'
const EVENT = 'dsh-travel-frog:change'
const CSS = `
.tf{--ink:#263c32;--muted:#63786a;--paper:#faf9f2;--line:#dce2d3;color:var(--ink);background:var(--paper);height:100%;overflow:auto;font:14px/1.6 system-ui,sans-serif;container-type:inline-size}
.tf *{box-sizing:border-box}.tf-wrap{max-width:1060px;margin:auto;padding:40px 32px 64px}.tf-top{display:flex;align-items:center;justify-content:space-between;gap:16px}.tf-kicker{font-size:11px;letter-spacing:.2em;color:var(--muted)}.tf h1{font-size:32px;letter-spacing:-.04em;margin:5px 0}.tf h2{font-size:20px;margin:0 0 10px}.tf p{margin:8px 0}.tf-muted{color:var(--muted);font-size:13px}.tf-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:26px;margin:28px 0}.tf-scene{background:#e4eddb;border-radius:24px;min-height:290px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}.tf-scene::after{content:'';position:absolute;bottom:-55px;left:-10%;width:120%;height:135px;border-radius:50%;background:#cedcbd}.tf-scene svg{width:250px;height:240px;z-index:1}.tf-stamp{position:absolute;left:20px;top:18px;font:11px/1.4 monospace;letter-spacing:.15em;color:#56704d}.tf-status{position:absolute;bottom:16px;z-index:2;background:#f8fbefda;border-radius:20px;padding:5px 14px;font-size:12px}.tf-box{padding:24px;border:1px solid var(--line);border-radius:20px;background:#fffdf7}.tf-options{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.tf button{font:inherit;cursor:pointer;border:1px solid var(--line);border-radius:10px;background:#fffdf7;color:var(--ink);padding:9px 14px}.tf button:hover{border-color:#658767}.tf button:focus-visible,.tf input:focus-visible{outline:3px solid #a2b778;outline-offset:3px}.tf button:disabled{opacity:.55;cursor:default}.tf button[aria-pressed=true]{background:#e5ecd9;border-color:#789064}.tf .tf-primary{background:#345942;color:white;border-color:#345942}.tf label{display:block;font-size:12px;color:var(--muted);margin-top:14px}.tf input{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:white;color:#263c32;font:inherit;margin:6px 0}.tf-progress{height:6px;border-radius:5px;background:#e2e7d9;overflow:hidden;margin:20px 0}.tf-progress span{display:block;height:100%;background:#6d8c51}.tf-atlas{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0 28px}.tf-place{border:1px solid var(--line);border-radius:12px;padding:13px}.tf-place[data-visited=false]{border-style:dashed;color:#78836e}.tf-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.tf-card{border:1px solid var(--line);border-radius:16px;background:#fffdf7;overflow:hidden}.tf-card-head{padding:14px 20px;background:#e8eddc;display:flex;justify-content:space-between;gap:8px}.tf-card-body{padding:18px 20px}.tf-story{white-space:pre-wrap;overflow-wrap:anywhere;min-height:68px}.tf-footer{display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:20px;margin-top:30px}.tf-alert{padding:12px 16px;border-radius:10px;background:#f4e8cf;white-space:pre-wrap;margin:14px 0}.tf-empty{padding:24px;border:1px dashed var(--line);border-radius:14px;color:var(--muted)}
@container(max-width:650px){.tf-wrap{padding:24px 16px}.tf-grid,.tf-cards{grid-template-columns:1fr}.tf-atlas{grid-template-columns:repeat(2,1fr)}.tf-scene{min-height:230px}.tf-top{align-items:flex-start}.tf h1{font-size:28px}}
@media(prefers-color-scheme:dark){.tf{--ink:#e4e9dc;--muted:#acb9a5;--paper:#202820;--line:#475240}.tf-box,.tf button,.tf-card{background:#293427}.tf button[aria-pressed=true],.tf-card-head{background:#3d4e33}.tf-alert{background:#4d422c}.tf-place[data-visited=false]{color:#b4c2aa}.tf-scene{background:#384c34}.tf-scene::after{background:#2b3f26}.tf-stamp{color:#cedbbf}.tf-status{color:#263c32}.tf input{background:#202820;color:#e4e9dc}}
`
function Frog({ traveling }) {
  return h('svg', {viewBox:'0 0 260 240',role:'img','aria-label':traveling?'小蛙背着行囊旅行':'小蛙在家等你'},
    h('circle',{cx:205,cy:45,r:22,fill:'#f5d98d'}),
    h('path',{d:'M0 180 Q60 100 125 170 Q190 110 260 175 V240 H0',fill:'#b2c69a'}),
    h('ellipse',{cx:132,cy:200,rx:65,ry:13,fill:'#9db486'}),
    h('rect',{x:170,y:139,width:34,height:48,rx:13,fill:'#bf995f',transform:'rotate(-10 170 139)'}),
    h('ellipse',{cx:130,cy:157,rx:50,ry:49,fill:'#7c9f64'}),
    h('ellipse',{cx:130,cy:170,rx:30,ry:32,fill:'#dce5b7'}),
    h('circle',{cx:102,cy:108,r:23,fill:'#7c9f64'}),h('circle',{cx:157,cy:108,r:23,fill:'#7c9f64'}),
    h('circle',{cx:105,cy:110,r:6,fill:'#2c4432'}),h('circle',{cx:154,cy:110,r:6,fill:'#2c4432'}),
    h('path',{d:'M115 135 Q130 146 145 135',stroke:'#35563b',strokeWidth:3,fill:'none',strokeLinecap:'round'}),
    h('path',{d:'M81 150 L175 150 L168 164 L88 161 Z',fill:'#d6a25f'}),
    h('ellipse',{cx:95,cy:199,rx:23,ry:9,fill:'#7c9f64'}),h('ellipse',{cx:163,cy:199,rx:23,ry:9,fill:'#7c9f64'}),
    h('path',{d:'M52 196 V171 M52 183 Q34 171 39 166 Q53 164 52 183 M53 178 Q70 163 73 172 Q66 181 53 178',stroke:'#678951',fill:'#678951',strokeWidth:2})
  )
}
function readState() {
  const raw = localStorage.getItem(KEY)
  return raw === null ? freshState() : validateState(JSON.parse(raw))
}
async function transact(fn) {
  if (!navigator.locks) throw new Error('当前环境不支持安全存档锁，请使用新版浏览器和 localhost 或 HTTPS。')
  return navigator.locks.request(LOCK, () => {
    const current = readState()
    const next = fn(current)
    if (next !== current) localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(EVENT))
    return next
  })
}
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], {type:'application/json'}))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function TravelHouse() {
  const [state,setState] = React.useState(null)
  const [error,setError] = React.useState('')
  const [now,setNow] = React.useState(Date.now())
  const [bag,setBag] = React.useState(BAGS[0].id)
  const [duration,setDuration] = React.useState(DURATIONS[0].durationMs)
  const [theme,setTheme] = React.useState('')
  const [busy,setBusy] = React.useState('')
  const [working,setWorking] = React.useState(false)
  const abort = React.useRef(null)
  const fileInput = React.useRef(null)
  React.useEffect(() => {
    let active=true
    const read=()=>{try {if(active) setState(readState())} catch {if(active) {setState(null);setError('存档无法读取。请先导出原始备份，再导入有效存档或重置。')}}}
    const tick=()=>{setNow(Date.now());transact(s=>settleTrip(s,Date.now())).catch(()=>{if(active)setError('无法保存或读取进度；请导出备份并检查浏览器存储权限。')})}
    read();tick()
    const timer=setInterval(tick,1000)
    const sync=e=>{if(!e.key||e.key===KEY)read()}
    window.addEventListener('storage',sync);window.addEventListener(EVENT,read)
    return()=>{active=false;clearInterval(timer);abort.current?.abort();window.removeEventListener('storage',sync);window.removeEventListener(EVENT,read)}
  },[])
  const change=async fn=>{setWorking(true);try {await transact(fn);setError('')}catch(e){setError(e.message||'操作失败，原存档已保留。')}finally{setWorking(false)}}
  const generate=async card=>{
    if(busy||card.ai)return
    const controller=new AbortController();abort.current=controller;setBusy(card.id);setError('')
    try {
      // Serialize generation across tabs; re-read the card after acquiring the lock.
      if(!navigator.locks)throw new Error('当前环境不支持安全存档锁。')
      await navigator.locks.request(LOCK+'.story',{signal:controller.signal},async()=>{
        const latest=readState().cards.find(c=>c.id===card.id)
        if(!latest||latest.ai)return
        const res=await fetch('/travel-frog/story',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:latest.id,placeId:latest.placeId,bagId:latest.bagId,theme:latest.theme}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(25000)])})
        const payload=await res.json()
        if(!res.ok||typeof payload.text!=='string')throw new Error('模型暂不可用或请求受限，原来的明信片已保留。请检查宿主模型配置后手动重试。')
        controller.signal.throwIfAborted()
        await transact(s=>{
          controller.signal.throwIfAborted()
          const current=s.cards.find(c=>c.id===card.id)
          return current && JSON.stringify(current)===JSON.stringify(latest) ? updateCardStory(s,card.id,payload.text) : s
        })
      })
    }catch(e){if(!controller.signal.aborted)setError(e.message||'生成失败，已保留原明信片。')}
    finally{if(!controller.signal.aborted)setBusy('');if(abort.current===controller)abort.current=null}
  }
  const reset=async()=>{
    if(!window.confirm('重置会删除当前浏览器的全部旅行和明信片。建议先导出存档。确认重置？'))return
    abort.current?.abort();setBusy('')
    try {if(!navigator.locks)throw Error();await navigator.locks.request(LOCK,()=>{localStorage.setItem(KEY,JSON.stringify(freshState()));window.dispatchEvent(new Event(EVENT))});setError('')}
    catch {setError('重置失败，请检查浏览器存储权限。')}
  }
  const importSave=async event=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return
    try {
      if(file.size>1024*1024)throw new Error('存档超过 1 MB，无法导入。')
      const parsed=validateState(JSON.parse(await file.text()))
      if(!window.confirm('导入会覆盖当前浏览器的存档。确认继续？'))return
      abort.current?.abort();setBusy('')
      if(!navigator.locks)throw new Error('当前环境不支持安全存档锁。')
      await navigator.locks.request(LOCK,()=>{localStorage.setItem(KEY,JSON.stringify(parsed));window.dispatchEvent(new Event(EVENT))})
      setError('')
    }catch{setError('导入失败：存档无效或无法写入，当前存档未改变。')}
  }
  const exportSave=()=>{try{download('frog-travel-backup.json',localStorage.getItem(KEY)||JSON.stringify(freshState()))}catch{setError('无法读取存档，导出失败。')}}
  const visited=new Set(state?.cards.map(c=>c.placeId)||[])
  const trip=state?.trip
  const left=state?remainingMs(state,now):0
  const bagInfo=BAGS.find(b=>b.id===bag)
  return h('div',{className:'tf','data-travel-frog':''},h('style',null,CSS),h('div',{className:'tf-wrap'},
    h('header',{className:'tf-top'},h('div',null,h('div',{className:'tf-kicker'},'A LITTLE JOURNEY · 蛙旅'),h('h1',null,'你忙你的，它去看看世界。'),h('p',{className:'tf-muted'},'准备一点行囊，留一点期待。回来时，一张明信片在等你。')),h('span',{className:'tf-muted'},`${visited.size} / ${PLACES.length} 处足迹`)),
    error?h('div',{className:'tf-alert',role:'alert'},error):null,
    h('div',{className:'tf-grid'},h('div',{className:'tf-scene'},h('span',{className:'tf-stamp'},trip?'ON THE ROAD / 旅途中':'HOME SWEET HOME / 小小旅舍'),h(Frog,{traveling:!!trip}),h('span',{className:'tf-status'},trip?'带着你的心愿，慢慢走。':'不必每天来，小蛙会好好休息。')),
      h('section',{className:'tf-box'},trip?h(React.Fragment,null,h('h2',null,'小蛙出门了'),h('p',null,`${BAGS.find(b=>b.id===trip.bagId)?.name}已经装好，下一站留个惊喜。`),h('p',{className:'tf-muted'},trip.theme?`带回的灵感：${trip.theme}`:'今天就随风走一走。'),h('div',{className:'tf-progress'},h('span',{style:{width:`${Math.max(0,Math.min(100,100*(1-left/(trip.returnAt-trip.startedAt))))}%`}})),h('p',{'data-remaining':''},left?`约 ${Math.ceil(left/60000)} 分钟后回来`:'正在整理明信片…'),h('p',{className:'tf-muted'},'可以关闭 DSH。再次打开旅舍时，按时间结算这一趟旅行。')):
        h(React.Fragment,null,h('h2',null,'这次带什么？'),h('div',{className:'tf-options'},BAGS.map(b=>h('button',{key:b.id,'aria-pressed':bag===b.id,onClick:()=>setBag(b.id)},b.name))),h('p',{className:'tf-muted'},bagInfo?.description),h('label',null,'旅行时长'),h('div',{className:'tf-options'},DURATIONS.map(d=>h('button',{key:d.id,'aria-pressed':duration===d.durationMs,onClick:()=>setDuration(d.durationMs)},d.name))),h('label',{htmlFor:'tf-theme'},'想带回什么灵感？（可选，最多 80 字）'),h('input',{id:'tf-theme',value:theme,maxLength:80,placeholder:'比如：慢下来，发现日常的小惊喜',onChange:e=>setTheme(e.target.value)}),h('button',{className:'tf-primary',disabled:!state||working,onClick:()=>change(s=>startTrip(s,{bagId:bag,durationMs:duration,theme},Date.now(),crypto.randomUUID(),Math.random))},'装好行囊，出发'),h('p',{className:'tf-muted'},'旅行本身不调用模型，也不读取聊天或工作文件。')))),
    h('section',null,h('h2',null,'下一站，还没见过的风景'),h('p',{className:'tf-muted'},'每件行囊通向两处风景，优先拜访未收藏的地点。'),h('div',{className:'tf-atlas'},PLACES.map(p=>h('div',{key:p.id,className:'tf-place','data-visited':visited.has(p.id)},h('div',null,`${visited.has(p.id)?p.icon:'◌'} ${p.name}`),h('div',{className:'tf-muted'},visited.has(p.id)?`已收藏 · ${p.souvenir}`:'还没到访'))))),
    h('section',null,h('h2',null,'寄回来的明信片'),h('p',{className:'tf-muted'},'保留最近 200 张。AI 写信会使用宿主当前默认模型并消耗额度，只发送这张卡的旅行信息和你填写的主题。'),
      state?.cards.length?h('div',{className:'tf-cards'},[...state.cards].reverse().map(card=>{const place=PLACES.find(p=>p.id===card.placeId);return h('article',{key:card.id,className:'tf-card','data-card-id':card.id},h('div',{className:'tf-card-head'},h('strong',null,`${place.icon} ${place.name}`),h('span',{className:'tf-muted'},new Date(card.returnedAt).toLocaleDateString())),h('div',{className:'tf-card-body'},h('div',{className:'tf-kicker'},`小小伴手礼 / ${place.souvenir}`),h('p',{className:'tf-story'},card.story),h('p',{className:'tf-muted'},card.ai?'AI 写信 · 已保存':'小蛙的本地手记'),h('button',{disabled:!!busy||card.ai,onClick:()=>generate(card)},busy===card.id?'正在写信…':card.ai?'这封信已收藏':'请模型写一封信')))})):
      h('div',{className:'tf-empty'},'第一张明信片还在路上。选一分钟的小旅行，很快就能收到。')),
    h('footer',{className:'tf-footer'},h('button',{onClick:exportSave},'导出存档'),h('button',{onClick:()=>fileInput.current?.click()},'导入存档'),h('button',{onClick:reset},'重置'),h('input',{ref:fileInput,type:'file',accept:'.json,application/json',onChange:importSave,style:{display:'none'},'aria-label':'导入存档文件'})),h('p',{className:'tf-muted'},'存档只保存在当前浏览器、当前 DSH 地址下，不会跨设备同步。关闭页面不会运行后台任务。')
  ))
}
return {
  inject:['slots'],
  apply(ctx){
    ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:'travel-frog'},TravelHouse))
    ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:'travel-frog',order:50,label:()=> '蛙旅'},({size})=>h('span',{'aria-hidden':true,style:{fontSize:size||20}},'☘')))
  }
}
