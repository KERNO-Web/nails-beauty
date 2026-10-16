// Скриншоты первого экрана: node qa/hero.mjs (нужен запущенный dev-сервер на 5193)
import { chromium } from 'playwright'
const browser = await chromium.launch()
for (const [w, h, tag] of [[1440, 900, 'desktop'], [1024, 768, 'laptop'], [390, 844, 'phone']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' })
  await page.goto('http://localhost:5193/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `qa/hero-${tag}.png` })
  const over = await page.evaluate(() => document.documentElement.scrollWidth)
  console.log(tag, 'scrollWidth', over)
  await page.close()
}
await browser.close()
