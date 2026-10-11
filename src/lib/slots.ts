// Свободное время. Логика из движка записи (shina-booking/shared/slots.ts), переложенная на мастеров:
// «пост» = мастер со своим графиком; окно свободно, если мастер работает и не занят на всю длительность (+ запас).
import type { Booking, Data, Master, Service } from '../data/types'

export type Interval = { start: number; end: number; demo?: boolean; booking?: Booking }

export const toMin = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + (m || 0)
}
export const fmtTime = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`

/* ---------- Даты ---------- */

export const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const dateOf = (iso: string) => new Date(`${iso}T12:00:00`)
export const todayIso = () => isoOf(new Date())
export const addDays = (iso: string, n: number) => {
  const d = dateOf(iso)
  d.setDate(d.getDate() + n)
  return isoOf(d)
}
/** 0 = понедельник */
export const weekdayOf = (iso: string) => (dateOf(iso).getDay() + 6) % 7

export const WD_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export const WD_LONG = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const MONTHS_PREP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре']

export const monthName = (iso: string) => MONTHS_NOM[dateOf(iso).getMonth()]
export const monthPrep = (iso: string) => MONTHS_PREP[dateOf(iso).getMonth()]

/** «сегодня», «завтра», «пт, 17 октября» */
export function dayHuman(iso: string, withWeekday = true) {
  const d = dateOf(iso)
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  if (iso === todayIso()) return 'сегодня'
  if (iso === addDays(todayIso(), 1)) return 'завтра'
  return withWeekday ? `${WD_SHORT[weekdayOf(iso)].toLowerCase()}, ${base}` : base
}
export const dayFull = (iso: string) => {
  const d = dateOf(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${WD_LONG[weekdayOf(iso)]}`
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

/** 105 → «1 ч 45 мин» */
export function fmtDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} мин`
  return m ? `${h} ч ${m} мин` : `${h} ч`
}
export const fmtPrice = (n: number) => `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} ₽`
export const priceLabel = (s: Pick<Service, 'price' | 'priceFrom'>) => (s.priceFrom ? `от ${fmtPrice(s.price)}` : fmtPrice(s.price))

/* ---------- Мастера и занятость ---------- */

export const canDo = (m: Master, serviceId: string) => !m.serviceIds.length || m.serviceIds.includes(serviceId)

export function hoursOf(m: Master, iso: string) {
  if (m.daysOff.includes(iso)) return null
  const h = m.schedule[weekdayOf(iso)]
  return h ? { open: toMin(h.open), close: toMin(h.close) } : null
}

/** Детерминированный «шум»: одна и та же выдуманная занятость при каждом открытии */
function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function demoBusy(m: Master, iso: string, open: number, close: number, step: number): Interval[] {
  const rnd = seeded(`${m.id}:${iso}`)
  const out: Interval[] = []
  // Ближайшие дни заняты плотнее — как в жизни
  const ahead = Math.round((dateOf(iso).getTime() - dateOf(todayIso()).getTime()) / 864e5)
  const count = ahead < 3 ? 3 : ahead < 8 ? 2 : rnd() < 0.5 ? 1 : 0
  for (let i = 0; i < count; i++) {
    const len = [60, 90, 120, 120, 150][Math.floor(rnd() * 5)]
    const slots = Math.floor((close - open - len) / step)
    if (slots <= 0) continue
    const start = open + Math.floor(rnd() * (slots + 1)) * step
    const end = start + len
    if (out.some((b) => start < b.end && end > b.start)) continue
    out.push({ start, end, demo: true })
  }
  return out
}

export function busyOf(data: Data, m: Master, iso: string): Interval[] {
  const h = hoursOf(m, iso)
  const real: Interval[] = data.bookings
    .filter((b) => b.masterId === m.id && b.date === iso && b.status === 'active')
    .map((b) => ({ start: b.start, end: b.start + b.minutes, booking: b }))
  if (!h || !data.studio.demoBusy || iso < todayIso()) return real
  return [...real, ...demoBusy(m, iso, h.open, h.close, data.studio.stepMin).filter((d) => !real.some((r) => d.start < r.end && d.end > r.start))]
}

/** Сегодня раньше этого времени окна не показываем (успеть доехать) */
function notBefore(iso: string, step: number) {
  if (iso !== todayIso()) return -1
  const now = new Date()
  const t = now.getHours() * 60 + now.getMinutes() + 45
  return Math.ceil(t / step) * step
}

function masterFree(data: Data, m: Master, iso: string, start: number, minutes: number) {
  const h = hoursOf(m, iso)
  if (!h || start < h.open || start + minutes > h.close) return false
  if (start < notBefore(iso, data.studio.stepMin)) return false
  const buf = data.studio.bufferMin
  return busyOf(data, m, iso).every((b) => start + minutes + buf <= b.start || start >= b.end + buf)
}

export type Slot = { time: number; free: boolean; masters: string[] }

/** Мастера, которые подходят под выбор: конкретный или все, кто делает услугу */
export function mastersFor(data: Data, serviceId: string, masterId: string | null) {
  return data.masters.filter((m) => canDo(m, serviceId) && (!masterId || m.id === masterId))
}

/** Сетка дня: все возможные начала в рабочие часы, с пометкой «свободно» и кто свободен */
export function daySlots(data: Data, serviceId: string, masterId: string | null, iso: string): Slot[] {
  const service = data.services.find((s) => s.id === serviceId)
  if (!service) return []
  const ms = mastersFor(data, serviceId, masterId)
  const step = data.studio.stepMin
  let open = Infinity
  let close = -Infinity
  for (const m of ms) {
    const h = hoursOf(m, iso)
    if (h) {
      open = Math.min(open, h.open)
      close = Math.max(close, h.close)
    }
  }
  if (open === Infinity) return []
  const slots: Slot[] = []
  const nb = notBefore(iso, step)
  for (let t = open; t + service.minutes <= close; t += step) {
    // Прошедшее время сегодня не показываем вовсе — оно не «занято», его просто уже нет
    if (t < nb) continue
    const free = ms.filter((m) => masterFree(data, m, iso, t, service.minutes)).map((m) => m.id)
    slots.push({ time: t, free: free.length > 0, masters: free })
  }
  return slots
}

export type DayInfo = { iso: string; open: boolean; free: number }

export function daysAhead(data: Data, serviceId: string | null, masterId: string | null): DayInfo[] {
  const out: DayInfo[] = []
  const start = todayIso()
  for (let i = 0; i < data.studio.horizonDays; i++) {
    const iso = addDays(start, i)
    if (!serviceId) {
      const open = data.masters.some((m) => (!masterId || m.id === masterId) && hoursOf(m, iso))
      out.push({ iso, open, free: open ? 1 : 0 })
      continue
    }
    const slots = daySlots(data, serviceId, masterId, iso)
    out.push({ iso, open: slots.length > 0, free: slots.filter((s) => s.free).length })
  }
  return out
}

/** Ближайшее свободное окно — для шапки и плавающей кнопки */
export function nearestSlot(data: Data, serviceId?: string): { iso: string; time: number } | null {
  const sid = serviceId ?? data.services.find((s) => s.popular)?.id ?? data.services[0]?.id
  if (!sid) return null
  for (let i = 0; i < data.studio.horizonDays; i++) {
    const iso = addDays(todayIso(), i)
    const s = daySlots(data, sid, null, iso).find((x) => x.free)
    if (s) return { iso, time: s.time }
  }
  return null
}

/** Часы студии по дням недели: объединение графиков мастеров */
export function studioHours(data: Data) {
  return WD_SHORT.map((label, i) => {
    let open = Infinity
    let close = -Infinity
    for (const m of data.masters) {
      const h = m.schedule[i]
      if (h) {
        open = Math.min(open, toMin(h.open))
        close = Math.max(close, toMin(h.close))
      }
    }
    return { label, hours: open === Infinity ? null : { open, close } }
  })
}

/** Подряд идущие дни с одинаковыми часами: «Пн–Пт 9:00–21:00» */
export function hoursSummary(data: Data) {
  const days = studioHours(data)
  const rows: { days: string; text: string }[] = []
  let i = 0
  while (i < 7) {
    let j = i
    const key = (k: number) => (days[k].hours ? `${days[k].hours!.open}-${days[k].hours!.close}` : 'off')
    while (j + 1 < 7 && key(j + 1) === key(i)) j++
    const h = days[i].hours
    rows.push({
      days: i === j ? days[i].label : `${days[i].label}–${days[j].label}`,
      text: h ? `${fmtTime(h.open)}–${fmtTime(h.close)}` : 'выходной',
    })
    i = j + 1
  }
  return rows
}
