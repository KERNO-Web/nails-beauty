// Хранилище данных студии. Сейчас — в браузере (localStorage): сайт и кабинет на одном устройстве видят одно и то же.
// Для боевой версии этот модуль заменяется запросами к серверу (тот же набор функций), вёрстка не меняется.
import { useSyncExternalStore } from 'react'
import { DATA_VERSION, demo } from '../data/demo'
import type { Booking, Data } from '../data/types'
import { reportBooking, reportCancel } from './push'
import { daySlots } from './slots'

const KEY = 'nail-studio:data'

/** Сервер уведомлений из сборки (выкладка на свой сервер подставляет ключ и адрес — deploy/) */
const ENV_PUSH =
  import.meta.env.VITE_VAPID_PUBLIC_KEY && import.meta.env.VITE_PUSH_SERVER
    ? { vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY as string, server: import.meta.env.VITE_PUSH_SERVER as string }
    : undefined

function load(): Data {
  let d = structuredClone(demo)
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Data
      if (saved.version === DATA_VERSION) d = saved
    }
  } catch {
    /* пустое или битое хранилище — берём демо */
  }
  if (ENV_PUSH && !d.studio.push) d.studio.push = ENV_PUSH
  return d
}

let data: Data = load()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* приватный режим — работаем в памяти */
  }
}

if (typeof window !== 'undefined') {
  // Кабинет открыт в соседней вкладке — подхватываем изменения
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      data = load()
      emit()
    }
  })
}

export function useData() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => data,
  )
}

export const getData = () => data

export function update(fn: (d: Data) => Data) {
  data = fn(data)
  save()
  emit()
}

export function resetDemo() {
  data = structuredClone(demo)
  save()
  emit()
}

export const uid = () => Math.random().toString(36).slice(2, 10)

export type BookingInput = {
  serviceId: string
  masterId: string | null
  date: string
  start: number
  name: string
  contact: string
  note?: string
  source: Booking['source']
}

/**
 * Записать клиента. Время перепроверяется по движку слотов (как на сервере):
 * за минуту, пока клиент вводил имя, окно мог занять кто-то другой.
 * Ручная запись из кабинета может ставить и на занятое время (мастер решает сам).
 */
export function createBooking(input: BookingInput): { ok: true; booking: Booking } | { ok: false; error: string } {
  const service = data.services.find((s) => s.id === input.serviceId)
  if (!service) return { ok: false, error: 'Услуга не найдена' }
  let masterId = input.masterId
  if (input.source === 'online') {
    const slot = daySlots(data, input.serviceId, input.masterId, input.date).find((s) => s.time === input.start)
    if (!slot?.free) return { ok: false, error: 'Это время только что заняли — выберите другое, пожалуйста' }
    if (!masterId) {
      // «Любой мастер»: у кого в этот день меньше записей
      const load = (id: string) => data.bookings.filter((b) => b.masterId === id && b.date === input.date && b.status === 'active').length
      masterId = [...slot.masters].sort((a, b) => load(a) - load(b))[0]
    }
  }
  if (!masterId) masterId = data.masters[0]?.id
  if (!masterId) return { ok: false, error: 'Нет мастеров' }
  const booking: Booking = {
    id: uid(),
    serviceId: service.id,
    masterId,
    date: input.date,
    start: input.start,
    minutes: service.minutes,
    name: input.name.trim(),
    contact: input.contact.trim(),
    note: input.note?.trim() || undefined,
    source: input.source,
    status: 'active',
    createdAt: new Date().toISOString(),
  }
  update((d) => ({ ...d, bookings: [...d.bookings, booking] }))
  // Сервер уведомлений (если настроен): мастеру — пуш о записи, клиентке — напоминания по расписанию
  reportBooking(data, booking)
  return { ok: true, booking }
}

export function cancelBooking(id: string) {
  update((d) => ({ ...d, bookings: d.bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)) }))
  reportCancel(data, id)
}
