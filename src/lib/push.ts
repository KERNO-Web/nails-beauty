// Приложение на рабочем столе и уведомления.
// iPhone: уведомления от сайта работают только у приложения, добавленного на экран «Домой» (iOS 16.4+).
// Android: можно и из браузера, но в приложении надёжнее — поэтому всегда сначала предлагаем установить.
// Отправку с сервера включает studio.push (ключ VAPID + адрес для подписки); без него кабинет сам
// показывает уведомление о новой записи, пока открыт на этом устройстве.
import { useSyncExternalStore } from 'react'
import type { Studio } from '../data/types'

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

export type EnableResult = 'granted' | 'denied' | 'unsupported' | 'needs-install'

/** Включить уведомления: разрешение → подписка на сервере (если настроен) → пробное уведомление */
export async function enableNotifications(studio: Studio): Promise<EnableResult> {
  if (platform() === 'ios' && !isStandalone()) return 'needs-install'
  if (!pushSupported()) return 'unsupported'
  const perm = await Notification.requestPermission()
  emit()
  if (perm !== 'granted') return 'denied'
  const reg = await navigator.serviceWorker.ready
  if (studio.push?.vapidPublicKey && studio.push.subscribeUrl && 'pushManager' in reg) {
    try {
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(studio.push.vapidPublicKey) }))
      await fetch(studio.push.subscribeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
    } catch {
      /* сервер недоступен — разрешение всё равно есть, повторим позже */
    }
  }
  await notify('Уведомления включены', `Сюда будут приходить новые записи в ${studio.name}.`)
  return 'granted'
}

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
