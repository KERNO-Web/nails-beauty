// Отзывы салона из его карточки в 2ГИС → src/reviews.json (сайт показывает их в стиле 2ГИС).
// Запуск: node scripts/reviews-2gis.mjs <ссылка на карточку или id фирмы> [сколько отзывов, по умолчанию 6]
// Пример: node scripts/reviews-2gis.mjs https://2gis.ru/krasnoyarsk/firm/70000001019878467 6
//
// Берём только отзывы самого салона, которые 2ГИС показывает публично: имя автора (как в 2ГИС),
// оценку, дату, текст, ответ салона. На сайте под блоком ссылка на все отзывы в 2ГИС.
import { writeFileSync } from 'node:fs'

const arg = process.argv[2]
const limit = Number(process.argv[3] || 6)
const id = arg?.match(/(\d{12,})/)?.[1]
if (!id) {
  console.error('Нужна ссылка на карточку 2ГИС или id фирмы')
  process.exit(1)
}
const city = arg.match(/2gis\.ru\/([a-z_]+)\//)?.[1] ?? 'krasnoyarsk'
const url = `https://2gis.ru/${city}/firm/${id}/tab/reviews`

const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36', 'Accept-Language': 'ru' } })
if (!res.ok) throw new Error(`2ГИС ответил ${res.status}`)
const html = await res.text()

// Данные страницы лежат в скриптах вида JSON.parse('…'): строки JS в одинарных кавычках.
// Раскодируем экранирование JS сами (без eval) и берём блоки, где есть отзывы
const unjs = (s) =>
  s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, c) =>
    c[0] === 'u' || (c[0] === 'x' && c.length === 3) ? String.fromCharCode(parseInt(c.slice(1), 16)) : ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0' })[c] ?? c,
  )
const blocks = [...html.matchAll(/JSON\.parse\('((?:\\[\s\S]|[^'\\])*)'\)/g)].map((x) => x[1]).filter((s) => s.includes('date_created') || s.includes('general_rating'))
if (!blocks.length) throw new Error('Не нашёл данные страницы: 2ГИС мог поменять вёрстку')
const state = blocks.map((s) => JSON.parse(unjs(s)))

// Обходим состояние: рейтинг карточки и элементы-отзывы (у них есть date_created, rating, text, user)
let rating = null
let count = null
let name = null
const items = []
const seen = new Set()
;(function walk(o) {
  if (!o || typeof o !== 'object') return
  if (Array.isArray(o)) return o.forEach(walk)
  if (o.id === id && o.reviews?.general_rating && rating === null) {
    rating = o.reviews.general_rating
    count = o.reviews.general_review_count
    name = o.name_ex?.primary ?? o.name ?? null
  }
  if (typeof o.text === 'string' && typeof o.rating === 'number' && o.date_created && o.user && !seen.has(o.id)) {
    seen.add(o.id)
    items.push(o)
  }
  for (const v of Object.values(o)) walk(v)
})(state)

if (!items.length) throw new Error('Отзывов в карточке не нашлось')

const firstName = (n) => (n || 'Гость').trim().split(/\s+/)[0]
const reviews = items
  .filter((r) => !r.is_hidden && r.text.trim().length >= 40)
  .sort((a, b) => b.rating - a.rating || b.date_created.localeCompare(a.date_created))
  .slice(0, limit)
  .map((r) => ({
    id: r.id,
    name: firstName(r.user?.name),
    rating: r.rating,
    date: r.date_created.slice(0, 10),
    text: r.text.trim().replace(/\s+\n/g, '\n'),
    answer: r.official_answer?.text?.trim() || undefined,
  }))

const out = { source: '2gis', url: `https://2gis.ru/${city}/firm/${id}/tab/reviews`, name, rating, count, fetchedAt: new Date().toISOString().slice(0, 10), reviews }
writeFileSync(new URL('../src/reviews.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
console.log(`${name}: ${rating} ★, ${count} отзывов. Сохранено ${reviews.length} в src/reviews.json`)
