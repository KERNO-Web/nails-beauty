// Подбор положения руки: node qa/tune.mjs zoom py "доп. css" [ширина высота] — скриншот qa/tune.png
import { chromium } from 'playwright'
const [zoom, py, css = '', w = 1440, h = 900] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: +w, height: +h }, reducedMotion: 'reduce' })
await page.goto('http://localhost:5193/', { waitUntil: 'networkidle' })
await page.addStyleTag({ content: `.hero-layer{--zoom:${zoom};--py:${py}} ${css}` })
await page.waitForTimeout(300)
await page.screenshot({ path: 'qa/tune.png' })
await browser.close()
