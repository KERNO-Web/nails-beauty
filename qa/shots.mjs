// Скриншоты для визуальной проверки: node qa/shots.mjs [url-suffix] [name] [widths...]
// Пример: node qa/shots.mjs "?fixture=nogtevoy-dom" nogtevoy 1440x900 390x844
import { chromium, webkit } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.env.BASE ?? 'http://localhost:5191/'
const [suffix = '', name = 'lumi', ...sizes] = process.argv.slice(2)
const list = sizes.length ? sizes : ['1440x900', '390x844']
const full = process.env.FULL === '1'
const engine = process.env.ENGINE === 'webkit' ? webkit : chromium
mkdirSync('qa/shots', { recursive: true })
const browser = await engine.launch()
for (const s of list) {
  const [w, h] = s.split('x').map(Number)
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 768 && process.env.ENGINE !== 'webkit', hasTouch: w < 768 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(base + suffix, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  // Для снимков: показать всё сразу (без анимации появления)
  await page.addStyleTag({ content: '.enter,.band .tile{opacity:1!important;transform:none!important;transition:none!important}' })
  if (process.env.SCROLL) {
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), process.env.SCROLL)
  }
  if (full) {
    // Подгрузить ленивые картинки и появления
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 120))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(600)
  } else await page.waitForTimeout(900)
  if (process.env.CLICK) {
    const b = await page.$(process.env.CLICK)
    if (b) (await b.click(), await page.waitForTimeout(500))
  }
  if (process.env.SECTIONS) {
    for (const id of process.env.SECTIONS.split(',')) {
      const el = await page.$('#' + id)
      if (!el) {
        console.log('no #' + id)
        continue
      }
      await el.scrollIntoViewIfNeeded()
      await page.waitForTimeout(700)
      await page.addStyleTag({ content: '.hdr{position:static!important}' })
      await el.screenshot({ path: `qa/shots/${name}-${s}-${id}.png` })
      console.log(`qa/shots/${name}-${s}-${id}.png`)
    }
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const file = `qa/shots/${name}-${s}${full ? '-full' : ''}${process.env.SCROLL ? '-' + process.env.SCROLL : ''}.png`
  await page.screenshot({ path: file, fullPage: full })
  console.log(file, overflow > 0 ? `HORIZONTAL OVERFLOW ${overflow}px` : 'ok', errors.length ? 'ERRORS: ' + errors.join(' | ') : '')
  await page.close()
}
await browser.close()
