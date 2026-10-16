// Сценарии записи и ссылок: node qa/flow.mjs (dev-сервер на :5191)
import { chromium } from 'playwright'
const base = process.env.BASE ?? 'http://localhost:5191/'
const browser = await chromium.launch()
let fails = 0
const ok = (cond, msg) => (console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`), cond || fails++)

async function open(suffix = '', opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/unsplash|ERR_/.test(m.text()) && errors.push(m.text()))
  await page.goto(base + suffix, { waitUntil: 'networkidle' })
  return { page, ctx, errors }
}

{
  const { page, ctx, errors } = await open()
  // 1. Цены
  const prices = await page.$$eval('.menu-item', (rows) => rows.map((r) => r.querySelector('.menu-name').firstChild.textContent + '=' + r.querySelector('.menu-price').textContent.replace(/\s/g, ' ').replace(/^от/, 'от ')))
  const want = ['Маникюр + покрытие=2 200 ₽', 'Маникюр=1 200 ₽', 'Наращивание=от 3 200 ₽', 'Коррекция=от 2 800 ₽', 'Педикюр + покрытие=2 600 ₽', 'Дизайн=от 400 ₽', 'Снятие=400 ₽']
  ok(JSON.stringify(prices) === JSON.stringify(want), `7 цен из демо: ${prices.join('; ')}`)
  ok(!(await page.content()).includes('4 000'), '4 000 ₽ нигде на странице')
  // 2. Услуга из меню → запись
  await page.click('.menu-item >> nth=0')
  await page.waitForTimeout(800)
  ok((await page.textContent('.bk-svc[aria-checked="true"] b')) === 'Маникюр + покрытие', 'Маникюр + покрытие подставился в запись')
  // 3. Мастер: Анна; ограничение услуг Веры
  await page.click('.bk-svc:has-text("Наращивание")')
  const masters = await page.$$eval('.bk-mp b', (b) => b.map((x) => x.textContent))
  const hint = await page.textContent('.bk-hint')
  ok(!masters.includes('Вера') && hint?.includes('Анна'), `Наращивание: выбора нет, «${hint}»`)
  // 4. Время → контакты с ошибкой → исправление → успех
  await page.click('.bk-slot:not([disabled]) >> nth=0')
  await page.click('.bk-submit')
  ok((await page.textContent('#bk-name-err'))?.includes('обращаться'), 'пустое имя — понятная ошибка')
  await page.fill('#bk-name', 'Тест')
  await page.fill('#bk-contact', '+7 (123')
  await page.click('.bk-submit')
  ok(!!(await page.textContent('#bk-contact-err')), `неполный номер: «${await page.textContent('#bk-contact-err')}»`)
  await page.fill('#bk-contact', '@ab')
  await page.click('.bk-submit')
  ok((await page.textContent('#bk-contact-err'))?.includes('Telegram'), 'короткий ник Telegram — ошибка')
  await page.fill('#bk-contact', '+79131234567')
  await page.click('.bk-submit')
  await page.waitForTimeout(400)
  ok((await page.textContent('.bk-done h3'))?.includes('Тест'), 'успех: «Тест, вы записаны»')
  ok((await page.textContent('.bk-done-k'))?.includes('Демо'), 'успех честно помечен как демо')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Добавить в')])
  const ics = await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c).toString())
  ok(/DTSTART:\d{8}T\d{6}Z/.test(ics) && ics.includes('VALARM'), '.ics в UTC с напоминаниями')
  // 5. Занятое после выбора: повторная запись на то же время невозможна
  const booked = await page.evaluate(() => JSON.parse(Object.entries(localStorage).find(([k]) => k.startsWith('nail-studio'))[1]).bookings.length)
  ok(booked === 1, 'запись сохранена (localStorage, демо)')
  ok(errors.length === 0, `ошибок в консоли нет ${errors.join(' | ')}`)
  await ctx.close()
}

{
  // 6. Работа → запись с мастером и услугой
  const { page, ctx } = await open()
  await page.click('.chip-a:has-text("Анна")')
  const n = await page.$$eval('.wk-item', (t) => t.length)
  await page.click('.wk-img >> nth=0')
  ok(await page.isVisible('.lb'), `лайтбокс открылся (работ Анны: ${n})`)
  await page.keyboard.press('ArrowRight')
  ok((await page.textContent('.lb-top span'))?.startsWith('2 /'), 'стрелка → следующая')
  await page.click('.lb .btn-a')
  await page.waitForTimeout(700)
  const sum = await page.$$eval('.bk-sum dd', (d) => d.map((x) => x.textContent))
  ok(sum[1] === 'Анна', `из работы: мастер Анна, услуга ${sum[0]}`)
  await page.goto(base)
  await page.click('.wk-img >> nth=0')
  await page.keyboard.press('Escape')
  ok(!(await page.isVisible('.lb')), 'Esc закрывает лайтбокс')
  await ctx.close()
}

{
  // 7. Москва смотрит студию в Красноярске около полуночи: «сегодня» — по Красноярску
  const { page, ctx } = await open('', { timezoneId: 'Europe/Moscow' })
  const r = await page.evaluate(() => {
    const ru = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Krasnoyarsk' }).format(new Date())
    return { ru, first: document.querySelector('.bk-day')?.getAttribute('data-iso') }
  })
  ok(r.ru === r.first, `первый день в ленте = сегодня по Красноярску (${r.first})`)
  await ctx.close()
}

{
  // 8. Внешняя запись: нет своей сетки, кнопки ведут в сервис
  const { page, ctx } = await open('?fixture=ekaterina')
  ok((await page.$$('.bk-day')).length === 0, 'внешняя запись: ленты дат нет')
  const hrefs = await page.$$eval('a.btn-a', (a) => a.map((x) => x.getAttribute('href')))
  ok(hrefs.filter((h) => h.includes('fake-dikidi')).length >= 3, `кнопки «Записаться» → DIKIDI (${hrefs.length})`)
  await ctx.close()
}

{
  // 8б. Запись через WhatsApp: ссылки wa.me с готовым текстом, своей сетки нет
  const { page, ctx } = await open('?fixture=whatsapp')
  const hrefs = await page.$$eval('a.btn-a', (a) => a.map((x) => x.getAttribute('href')))
  ok((await page.$$('.bk-day')).length === 0 && hrefs.some((h) => h.startsWith('https://wa.me/79000000005')), 'запись через WhatsApp: кнопки → wa.me')
  await ctx.close()
}

{
  // 9. Настоящая студия: нет демо-отзывов, мастеров LUMI и демо-пометки записи
  const { page, ctx } = await open('?fixture=sparse')
  const html = await page.content()
  ok(!html.includes('Не должно появиться') && !html.includes('Анна') && !html.includes('Вера'), 'нет вымышленного содержимого LUMI')
  ok(!(await page.$('.bk-demo')), 'нет пометки «демо» (настоящая студия)')
  ok((await page.textContent('#masters h2')) === 'Ваш мастер', 'один мастер — «Ваш мастер»')
  ok((await page.$$('.bk-mp')).length === 0, 'один мастер — шага выбора мастера нет')
  await ctx.close()
}

{
  // 10. Кабинет: шесть вкладок открываются без ошибок, ручная запись и смена палитры работают
  const { page, ctx, errors } = await open('#/admin')
  for (const t of ['Записи', 'График', 'Услуги', 'Работы', 'Отзывы', 'Студия']) {
    await page.click(`.adm-tabs button:has-text("${t}")`)
    await page.waitForTimeout(150)
  }
  ok(errors.length === 0, `кабинет: 6 вкладок без ошибок ${errors.join(' | ')}`)
  await page.click('button:has-text("Какао")')
  ok((await page.evaluate(() => document.documentElement.dataset.palette)) === 'taupe', 'палитра меняется из кабинета')
  await ctx.close()
}

for (const w of [360, 390, 430, 768, 1024, 1280, 1920]) {
  const { page, ctx } = await open('', { viewport: { width: w, height: 800 } })
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  ok(over <= 0, `ширина ${w}: без горизонтальной прокрутки (${over})`)
  await ctx.close()
}

await browser.close()
console.log(fails ? `\n${fails} FAIL` : '\nВсе проверки прошли')
process.exit(fails ? 1 : 0)
