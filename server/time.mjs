// Время визита записано в часовом поясе студии («2026-10-12», 16:00, Asia/Krasnoyarsk) — переводим в абсолютное

/** Смещение часового пояса относительно UTC в момент ts, мс */
function offset(ts, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(ts))
      .map((x) => [x.type, x.value]),
  )
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ts
}

/** «2026-10-12» + 960 минут в поясе tz → миллисекунды UTC */
export function zonedToUtc(date, minutes, tz) {
  const [y, m, d] = date.split('-').map(Number)
  const wall = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60)
  let ts = wall - offset(wall, tz)
  ts = wall - offset(ts, tz) // второй проход — на случай перехода на летнее время
  return ts
}

/** Дата «сейчас» в поясе студии */
const localDate = (ts, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(ts))

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

/** «сегодня» / «завтра» / «12 октября» */
function day(b, tz, now) {
  const today = localDate(now, tz)
  const tomorrow = localDate(now + 24 * 3600_000, tz)
  if (b.date === today) return 'сегодня'
  if (b.date === tomorrow) return 'завтра'
  const [, m, d] = b.date.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

const time = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`

function inHours(ms) {
  const h = Math.round(ms / 3600_000)
  if (h <= 1) return 'через час'
  const unit = h % 10 === 1 && h % 100 !== 11 ? 'час' : [2, 3, 4].includes(h % 10) && ![12, 13, 14].includes(h % 100) ? 'часа' : 'часов'
  return `через ${h} ${unit}`
}

/** Текст напоминания: «LUMI: завтра в 16:00» / «Через 3 часа — LUMI, в 16:00» */
export function reminderText(b, info, now) {
  const tz = info.timezone || 'Europe/Moscow'
  const left = b.at - now
  const where = info.name || 'Запись'
  const title = left <= 6 * 3600_000 ? `${inHours(left)[0].toUpperCase()}${inHours(left).slice(1)} — ${where}, в ${time(b.start)}` : `${where}: ${day(b, tz, now)} в ${time(b.start)}`
  const body = [b.service, b.master && `к ${b.master}`, info.address].filter(Boolean).join(' · ')
  return { title, body }
}
reminderText.day = day
