// Приложение на рабочем столе и уведомления.
// iPhone: уведомления от сайта работают только у приложения, добавленного на экран «Домой» (iOS 16.4+).
// Android: можно и из браузера, но в приложении надёжнее — поэтому всегда сначала предлагаем установить.
// Отправку с сервера включает studio.push (ключ VAPID + адрес студии на сервере, папка server/):
// мастеру — о новых записях, клиентке — напоминания за 24, 12, 3 и 1 час до визита.
// Без сервера кабинет сам показывает уведомление о новой записи, пока открыт на этом устройстве.
import { useSyncExternalStore } from 'react'
import type { Booking, Data, Studio } from '../data/types'
import { phoneDigits } from './contact'

export type Platform = 'ios' | 'android' | 'desktop'

export const platform = (): Platform => {
  const ua = navigator.userAgent
  // iPad с iOS 13+ притворяется Mac — выдаёт себя сенсорным экраном
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

/** Открыто как приложение с рабочего стола */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/** iOS-браузер не Safari (Chrome, Яндекс…): на старых iOS добавить на экран «Домой» можно только из Safari */
export const isIosNotSafari = () => platform() === 'ios' && /CriOS|FxiOS|EdgiOS|YaBrowser|OPiOS/.test(navigator.userAgent)

export const pushSupported = () => 'serviceWorker' in navigator && 'Notification' in window

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let installEvent: InstallEvent | null = null
let version = 0
const listeners = new Set<() => void>()
const emit = () => {
  version++
  for (const l of listeners) l()
}

/** Вызывается при старте: сервис-воркер и перехват предложения установки (Android, Chrome на компьютере) */
export function initApp() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {})
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installEvent = e as InstallEvent
    emit()
  })
  window.addEventListener('appinstalled', () => ((installEvent = null), emit()))
}

/** Состояние для интерфейса: перерисовать, когда появилась возможность установки или сменилось разрешение */
export function usePushState() {
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => version,
  )
  return {
    platform: platform(),
    standalone: isStandalone(),
    canPromptInstall: !!installEvent,
    supported: pushSupported(),
    permission: pushSupported() ? Notification.permission : ('unsupported' as const),
  }
}

/** Системное окно «Установить приложение» (Android/Chrome). false — окна нет, нужен ручной способ */
export async function promptInstall() {
  if (!installEvent) return false
  await installEvent.prompt()
  const { outcome } = await installEvent.userChoice
  installEvent = null
  emit()
  return outcome === 'accepted'
}

function urlBase64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** failed — разрешение есть, но сервер студии не принял подписку (нет связи, браузер без пуша) */
export type EnableResult = 'granted' | 'denied' | 'unsupported' | 'needs-install' | 'failed'

/** Запрос к серверу студии; без сервера — ничего не делает */
export async function api(studio: Studio, path: string, body: unknown) {
  if (!studio.push?.server) return false
  try {
    const r = await fetch(studio.push.server.replace(/\/$/, '') + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return r.ok
  } catch {
    return false
  }
}

/** Подписка этого устройства на пуш с сервера студии (null — сервера нет или браузер не умеет) */
async function subscription(studio: Studio) {
  if (!studio.push?.vapidPublicKey) return null
  const reg = await navigator.serviceWorker.ready
  if (!('pushManager' in reg)) return null
  try {
    return (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(studio.push.vapidPublicKey) }))
  } catch {
    return null
  }
}

/** Разрешение на уведомления; на iPhone — только в приложении с экрана «Домой» */
async function permit(): Promise<EnableResult> {
  if (platform() === 'ios' && !isStandalone()) return 'needs-install'
  if (!pushSupported()) return 'unsupported'
  const perm = await Notification.requestPermission()
  emit()
  return perm === 'granted' ? 'granted' : 'denied'
}

/** Мастер: разрешение → подписка на сервере (если настроен) → пробное уведомление */
export async function enableNotifications(studio: Studio): Promise<EnableResult> {
  const r = await permit()
  if (r !== 'granted') return r
  if (studio.push) {
    const sub = await subscription(studio)
    if (!sub || !(await api(studio, '/subscribe', { role: 'master', subscription: sub }))) return 'failed'
  }
  await notify('Уведомления включены', `Сюда будут приходить новые записи в ${studio.name}.`)
  return 'granted'
}

/* ---------- Напоминания клиентке ---------- */

export const remindHours = (s: Studio) => [...(s.reminders?.length ? s.reminders : [24, 12, 3, 1])].sort((a, b) => b - a)

/** [24, 12, 3, 1] → «за 24, 12, 3 и 1 час» */
export function remindLabel(s: Studio) {
  const h = remindHours(s)
  const last = h[h.length - 1]
  const unit = last % 10 === 1 && last % 100 !== 11 ? 'час' : [2, 3, 4].includes(last % 10) && ![12, 13, 14].includes(last % 100) ? 'часа' : 'часов'
  return `за ${h.length > 1 ? `${h.slice(0, -1).join(', ')} и ` : ''}${last} ${unit}`
}

const REMIND_KEY = 'nail-reminders'
type RemindState = { phone?: string; bookings: string[] }

export function remindState(): RemindState {
  try {
    return { bookings: [], ...JSON.parse(localStorage.getItem(REMIND_KEY) || '{}') }
  } catch {
    return { bookings: [] }
  }
}

/** Напоминания включены для этой записи (или для телефона — на этом устройстве) */
export const remindersOn = (b?: Booking) => {
  const st = remindState()
  return b ? st.bookings.includes(b.id) : !!st.phone
}

/** Клиентка: разрешение → подписка, привязанная к записи и телефону. Сервер шлёт напоминания по расписанию.
 *  phone — для приложения на iPhone: там своё хранилище, и о записи, сделанной в Safari, приложение не знает */
export async function enableReminders(data: Data, target: { booking?: Booking; phone?: string }): Promise<EnableResult> {
  const r = await permit()
  if (r !== 'granted') return r
  const phone = phoneDigits(target.phone ?? target.booking?.contact ?? '') ?? undefined
  if (data.studio.push) {
    const sub = await subscription(data.studio)
    if (!sub || !(await api(data.studio, '/subscribe', { role: 'client', subscription: sub, phone, bookingId: target.booking?.id }))) return 'failed'
  }
  const st = remindState()
  const next = { phone: phone ?? st.phone, bookings: target.booking ? [...new Set([...st.bookings, target.booking.id])] : st.bookings }
  try {
    localStorage.setItem(REMIND_KEY, JSON.stringify(next))
  } catch {
    /* приватный режим */
  }
  emit()
  await notify(
    'Напоминания включены',
    data.studio.push ? `Напомним о визите в ${data.studio.name} ${remindLabel(data.studio)}.` : `Так будет выглядеть напоминание о визите в ${data.studio.name}.`,
    './#booking',
  )
  return 'granted'
}

/** Сообщить серверу о новой записи: мастеру — пуш, клиентке — напоминания по расписанию */
export function reportBooking(data: Data, b: Booking) {
  const s = data.services.find((x) => x.id === b.serviceId)
  const m = data.masters.find((x) => x.id === b.masterId)
  return api(data.studio, '/bookings', {
    booking: { id: b.id, date: b.date, start: b.start, minutes: b.minutes, name: b.name, phone: phoneDigits(b.contact), contact: b.contact, source: b.source },
    studio: { name: data.studio.name, address: data.studio.address, timezone: data.studio.timezone, reminders: remindHours(data.studio) },
    service: s?.title,
    master: data.masters.length > 1 ? (m?.nameDat ?? m?.name) : undefined,
  })
}

export const reportCancel = (data: Data, id: string) => api(data.studio, `/bookings/${encodeURIComponent(id)}/cancel`, {})

/** Показать уведомление через сервис-воркер (работает и в приложении на iPhone) */
export async function notify(title: string, body: string, url = './#/admin') {
  if (!pushSupported() || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification(title, { body, icon: 'icon-192.png', badge: 'icon-192.png', data: { url } })
}

/** Кабинет открыт как приложение — подставить его манифест (иконка «LUMI кабинет», открывается сразу кабинет) */
export function useAdminManifest(admin: boolean) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!link) return
  const want = admin ? 'admin.webmanifest' : 'manifest.webmanifest'
  if (!link.href.endsWith(want)) link.href = new URL(want, document.baseURI).href
}
