// Образец шрифтов: кириллица, Ё/Й/Ъ, ₽, тире и кавычки — каждым шрифтом сайта
import { chromium, webkit } from 'playwright'
const t = 'Съешь же ещё этих мягких французских булок, да выпей чаю — 2 200 ₽. Ёж, Й, ъ. «Маникюр»'
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const b = await engine.launch()
  const p = await b.newPage({ viewport: { width: 1100, height: 420 } })
  await p.goto(process.env.BASE ?? 'http://localhost:5191/', { waitUntil: 'networkidle' })
  await p.evaluate((t) => {
    document.body.innerHTML = `<div style="padding:32px;background:#f7f4f0;color:#241c20">
      <p style="font:400 44px 'Tenor Sans';margin:0 0 18px">${t}</p>
      <p style="font:500 28px 'Onest Variable';margin:0 0 12px">${t}</p>
      <p style="font:400 17px 'Onest Variable';margin:0">${t}</p></div>`
  }, t)
  await p.evaluate(() => document.fonts.ready)
  const used = await p.evaluate(() => ['Tenor Sans', 'Onest Variable'].map((f) => `${f}: ${document.fonts.check(`16px '${f}'`, 'Ёй₽')}`))
  await p.screenshot({ path: `qa/shots/specimen-${name}.png` })
  console.log(name, used.join(', '))
  await b.close()
}
