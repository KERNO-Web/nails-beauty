// Скриншот всей страницы: node qa/full.mjs [ширина]
import { chromium } from 'playwright'
const w = Number(process.argv[2] || 1440)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' })
await page.goto('http://localhost:5193/', { waitUntil: 'networkidle' })
await page.evaluate(async () => {
  document.querySelectorAll('.wrap').forEach((e) => e.classList.add('is-in'))
  document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager'))
  for (let y = 0; y < document.body.scrollHeight; y += 700) (window.scrollTo(0, y), await new Promise((r) => setTimeout(r, 120)))
})
await page.waitForLoadState('networkidle')
await page.screenshot({ path: `qa/full-${w}.png`, fullPage: true })
await browser.close()
console.log(`qa/full-${w}.png`)
