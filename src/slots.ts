// Свободное время: рабочие часы мастеров минус записи. Время студии — Красноярск (UTC+7).
// Записи демо-сайта живут в браузере (localStorage); часть окон занята для примера, чтобы сетка выглядела живой.
import { useSyncExternalStore } from 'react'
import { masters, services, studio, type Master, type Service } from './data'

export type Booking = { id: string; serviceId: string; masterId: string; date: string; start: number; minutes: number; name: string; contact: string; note?: string; createdAt: string }

const TZ_OFFSET = 7 * 60
const KEY = 'na-pyat:bookings:v1'

/** Сейчас по часам студии: дата YYYY-MM-DD и минуты от полуночи */
export function studioNow(at = new Date()) {
  const t = new Date(at.getTime() + (TZ_OFFSET + at.getTimezoneOffset()) * 60000)
  const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  return { iso, min: t.getHours() * 60 + t.getMinutes() }
}
export const dateOf = (iso: string) => new Date(`${iso}T12:00:00`)
export function addDays(iso: string, n: number) {
  const d = dateOf(iso)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const weekday = (iso: string) => (dateOf(iso).getDay() + 6) % 7
export const toMin = (s: string) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}
export const fmtTime = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
export const fmtPrice = (n: number) => `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} ₽`
export const priceLabel = (s: Service) => (s.from ? `от ${fmtPrice(s.price)}` : fmtPrice(s.price))
export function fmtDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? (m ? `${h} ч ${m} мин` : `${h} ч`) : `${m} мин`
}
export function plural(n: number, one: string, few: string, many: string) {
  const a = n % 10
  const b = n % 100
  if (a === 1 && b !== 11) return one
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few
  return many
}

const WD_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const WD_ACC = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье']
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
export const wdShort = (iso: string) => WD_SHORT[weekday(iso)]
export const monthDay = (iso: string) => `${dateOf(iso).getDate()} ${MONTHS[dateOf(iso).getMonth()]}`
/** «сегодня», «завтра», «в пятницу», «24 октября» */
export function dayPhrase(iso: string) {
  const today = studioNow().iso
  if (iso === today) return 'сегодня'
  if (iso === addDays(today, 1)) return 'завтра'
  if (iso <= addDays(today, 6)) return `в ${WD_ACC[weekday(iso)]}`
  return monthDay(iso)
}

/* ---------- Записи ---------- */

function load(): Booking[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
let bookings = load()
const listeners = new Set<() => void>()
export function useBookings() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => bookings,
  )
}

/** Демо: детерминированно занятые окна, чтобы расписание не выглядело пустым */
function demoBusy(m: Master, iso: string): [number, number][] {
  if (!studio.demo) return []
  let h = 0
  for (const c of m.id + iso) h = (h * 31 + c.charCodeAt(0)) | 0
  const out: [number, number][] = []
  const hours = hoursOf(m, iso)
  if (!hours) return out
  for (let t = hours[0]; t < hours[1]; t += 90) {
    h = (h * 1103515245 + 12345) | 0
    if ((h >>> 16) % 100 < 45) out.push([t, t + 90])
  }
  return out
}

export function hoursOf(m: Master, iso: string): [number, number] | null {
  const d = m.schedule[weekday(iso)]
  return d ? [toMin(d[0]), toMin(d[1])] : null
}
export const canDo = (m: Master, serviceId: string) => !m.services || m.services.includes(serviceId)

function free(m: Master, iso: string, start: number, minutes: number) {
  const h = hoursOf(m, iso)
  if (!h || start < h[0] || start + minutes > h[1]) return false
  const busy = [...demoBusy(m, iso), ...bookings.filter((b) => b.masterId === m.id && b.date === iso).map((b) => [b.start, b.start + b.minutes] as [number, number])]
  return busy.every(([a, b]) => start + minutes <= a || start >= b)
}

export type Slot = { time: number; masters: string[] }

/** Свободные начала на день: услуга, мастер (null — любой) */
export function daySlots(serviceId: string, masterId: string | null, iso: string): Slot[] {
  const s = services.find((x) => x.id === serviceId)
  if (!s) return []
  const ms = masters.filter((m) => canDo(m, serviceId) && (!masterId || m.id === masterId))
  const now = studioNow()
  const notBefore = iso === now.iso ? Math.ceil((now.min + 60) / studio.stepMin) * studio.stepMin : 0
  let open = Infinity
  let close = -Infinity
  for (const m of ms) {
    const h = hoursOf(m, iso)
    if (h) [open, close] = [Math.min(open, h[0]), Math.max(close, h[1])]
  }
  const out: Slot[] = []
  for (let t = open; t + s.minutes <= close; t += studio.stepMin) {
    if (t < notBefore) continue
    const who = ms.filter((m) => free(m, iso, t, s.minutes)).map((m) => m.id)
    if (who.length) out.push({ time: t, masters: who })
  }
  return out
}

export type DayInfo = { iso: string; open: boolean; free: number }
export function days(serviceId: string | null, masterId: string | null): DayInfo[] {
  const today = studioNow().iso
  return Array.from({ length: studio.horizonDays }, (_, i) => {
    const iso = addDays(today, i)
    const open = masters.some((m) => (!masterId || m.id === masterId) && (!serviceId || canDo(m, serviceId)) && hoursOf(m, iso))
    return { iso, open, free: open && serviceId ? daySlots(serviceId, masterId, iso).length : open ? 1 : 0 }
  })
}

/** Ближайшее свободное окно на главную услугу */
export function nearest(serviceId: string) {
  const today = studioNow().iso
  for (let i = 0; i < studio.horizonDays; i++) {
    const iso = addDays(today, i)
    const s = daySlots(serviceId, null, iso)[0]
    if (s) return { iso, time: s.time }
  }
  return null
}

export function todayHours() {
  const iso = studioNow().iso
  const hs = masters.map((m) => hoursOf(m, iso)).filter(Boolean) as [number, number][]
  return hs.length ? `Сегодня до ${fmtTime(Math.max(...hs.map((h) => h[1])))}` : 'Сегодня выходной'
}

/** Часы студии по дням: «Пн–Пт 9:00–21:00» */
export function weekHours() {
  const LABEL = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  const per = LABEL.map((_, i) => {
    const hs = masters.map((m) => m.schedule[i]).filter(Boolean) as [string, string][]
    return hs.length ? `${fmtTime(Math.min(...hs.map((h) => toMin(h[0]))))}–${fmtTime(Math.max(...hs.map((h) => toMin(h[1]))))}` : 'выходной'
  })
  const rows: { days: string; text: string }[] = []
  for (let i = 0; i < 7; ) {
    let j = i
    while (j + 1 < 7 && per[j + 1] === per[i]) j++
    rows.push({ days: i === j ? LABEL[i] : `${LABEL[i]}–${LABEL[j]}`, text: per[i] })
    i = j + 1
  }
  return rows
}

export function createBooking(input: Omit<Booking, 'id' | 'createdAt' | 'minutes' | 'masterId'> & { masterId: string | null }): { ok: true; booking: Booking } | { ok: false; error: string } {
  const s = services.find((x) => x.id === input.serviceId)
  if (!s) return { ok: false, error: 'Услуга не найдена' }
  const slot = daySlots(s.id, input.masterId, input.date).find((x) => x.time === input.start)
  if (!slot) return { ok: false, error: 'Это время только что заняли. Выберите другое, пожалуйста.' }
  const masterId = input.masterId ?? slot.masters[0]
  const booking: Booking = { ...input, masterId, minutes: s.minutes, id: Math.random().toString(36).slice(2, 10), createdAt: new Date().toISOString() }
  bookings = [...bookings, booking]
  try {
    localStorage.setItem(KEY, JSON.stringify(bookings))
  } catch {
    /* приватный режим — держим в памяти */
  }
  listeners.forEach((l) => l())
  return { ok: true, booking }
}

/* ---------- Выбор для записи: общий для всей страницы ---------- */

export type Pick = { serviceId: string | null; masterId: string | null; date: string | null; time: number | null }
let pick: Pick = { serviceId: null, masterId: null, date: null, time: null }
const pickListeners = new Set<() => void>()
export function usePick() {
  return useSyncExternalStore(
    (l) => (pickListeners.add(l), () => pickListeners.delete(l)),
    () => pick,
  )
}
export function setPick(p: Partial<Pick>) {
  pick = { ...pick, ...p }
  if (('serviceId' in p || 'masterId' in p) && !('time' in p)) pick.time = null
  if ('date' in p && !('time' in p)) pick.time = null
  pickListeners.forEach((l) => l())
}
export function resetPick() {
  pick = { serviceId: null, masterId: null, date: null, time: null }
  pickListeners.forEach((l) => l())
}

/** «Записаться» из любого места: подставить выбор и перейти к записи */
export function book(p: Partial<Pick> = {}) {
  if (Object.keys(p).length) setPick(p)
  document.getElementById('booking')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}
