import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const KEY = 'dsh-travel-frog.state.v1'
const log = await readFile('.verification/harness.log', 'utf8')
const url = log.match(/http:\/\/127\.0\.0\.1:3088\/\?token=\S+/)?.[0]
assert.ok(url, 'Start the isolated local DSH profile first')
await mkdir('artifacts', { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: 'light' })
const errors = []
const checks = []
const check = name => { checks.push(name); console.log('PASS ' + name) }
context.on('page', page => page.on('pageerror', error => errors.push(error.message)))
const page = await context.newPage()
page.setDefaultTimeout(15000)
let storyRequests = 0
context.on('request', request => {
  if (new URL(request.url()).pathname === '/travel-frog/story') storyRequests++
})

const openFrog = p => p.getByRole('button', { name: '蛙旅', exact: true }).click()
const getSave = p => p.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)
const heading = (p, name) => p.getByRole('heading', { name, exact: true })
const button = (p, name) => p.getByRole('button', { name, exact: true })

try {
  await page.goto(url)
  await button(page, '蛙旅').waitFor()
  if (await button(page, '继续').isVisible()) await button(page, '继续').click()
  await openFrog(page)
  await heading(page, '小蛙在家').waitFor()
  await page.locator('.tf-art').evaluate(img => img.decode())
  await page.screenshot({ path: 'artifacts/01-home.png' })
  check('DSH sidebar opens the single-card home with local artwork')

  await page.getByRole('button', { name: '新建会话', exact: true }).first().click()
  const fixture = page.getByRole('button', { name: /选择模型，当前 Travel frog fixture/u })
  if (!await fixture.isVisible()) {
    await page.getByRole('button', { name: /选择模型/u }).first().click()
    await page.getByText('Travel frog fixture', { exact: true }).last().click()
  }
  await fixture.waitFor()
  const message = '订单导出失败排查 · 蛙旅验证'
  await page.locator('[contenteditable="true"]').last().fill(message)
  await button(page, '发送消息').click()
  await page.getByText(message, { exact: true }).waitFor()
  await button(page, '给小蛙备便当').click()
  const note = '下次先验证断网后是否重复导出。'
  await page.getByLabel('留一句下次要做的事（选填）').fill(note)
  await page.clock.install()
  // Pick the same illustrated destination as the visual reference.
  await page.evaluate(() => {
    const random = Math.random
    let calls = 0
    Math.random = () => {
      if (++calls === 2) Math.random = random
      return 0.9
    }
  })
  await button(page, '备好便当').click()
  await heading(page, '便当备好了').waitFor()
  const packed = await getSave(page)
  assert.ok(packed.trip.sessionId)
  assert.equal(packed.trip.note, note)
  await page.clock.fastForward(20_000)
  await heading(page, '小蛙出门了').waitFor()
  await page.screenshot({ path: 'artifacts/02-travel.png' })
  check('Conversation entry keeps the selected session and the frog departs on its own')

  await page.getByRole('button', { name: '新建会话', exact: true }).first().click()
  await page.clock.fastForward(65_000)
  await page.reload()
  await openFrog(page)
  await heading(page, '小蛙回来了').waitFor()
  await page.locator('.tf-art').evaluate(img => img.decode())
  const returned = await getSave(page)
  assert.equal(returned.cards.length, 1)
  assert.equal(returned.cards[0].sessionId, packed.trip.sessionId)
  assert.equal(returned.cards[0].note, note)
  await page.screenshot({ path: 'artifacts/03-postcard.png', animations: 'disabled' })
  await button(page, '回到会话').click()
  await page.getByText(message, { exact: true }).waitFor()
  check('Elapsed trip returns once after a reload and opens the original real conversation')

  await openFrog(page)
  await button(page, '相册').click()
  const album = page.getByRole('region', { name: '明信片相册' })
  await album.locator('li button').first().click()
  await album.getByText(note, { exact: true }).waitFor()
  await album.getByText('管理存档', { exact: true }).click()
  const backup = page.waitForEvent('download')
  await button(page, '导出存档').click()
  assert.equal((await backup).suggestedFilename(), 'frog-travel-backup.json')

  const broken = structuredClone(returned)
  broken.cards[0].sessionId = 'missing-test-session'
  page.once('dialog', dialog => dialog.accept())
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(broken)),
  })
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).cards[0].sessionId === 'missing-test-session', KEY)
  await album.locator('li button').first().click()
  await button(page, '回到会话').click()
  await page.getByRole('alert').getByText(/会话当前无法打开/).waitFor()
  await heading(page, '相册').waitFor()
  check('Album, backup and unavailable-session fallback work')

  await button(page, '回到小屋').click()
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 700, height: 850 })
  await page.screenshot({ path: 'artifacts/04-dark-narrow.png' })
  assert.equal(await page.locator('.tf').evaluate(el => el.scrollWidth > el.clientWidth + 1), false)
  assert.equal(storyRequests, 0)
  assert.deepEqual(errors, [])
  check('Dark narrow layout, no story model calls, no browser errors')
  await writeFile('artifacts/browser-results.json', JSON.stringify({ checks, errors }, null, 2))
} finally {
  await browser.close()
}
