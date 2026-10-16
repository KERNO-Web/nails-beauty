// Общее для разделов сайта: куда ведёт «Записаться», ближайшие окна, появление при прокрутке
import { useEffect, useRef } from 'react'
import type { Data, Service, Studio } from '../data/types'
import { select } from '../lib/selection'
import { addDays, dateOf, daySlots, todayIso, weekdayOf } from '../lib/slots'
import { scrollToId } from '../lib/ui'

/** Как записываются: на сайте, во внешнем сервисе или через мессенджер студии */
export type Route = { kind: 'native' } | { kind: 'link'; url: string; label: string; via: string }

const digits = (s: string) => s.replace(/\D/g, '')

export function bookingRoute(s: Studio, text = 'Здравствуйте! Хочу записаться'): Route {
  const b = s.booking
  if (b?.mode === 'external' && /^https?:\/\//.test(b.url)) return { kind: 'link', url: b.url, label: b.name ?? 'сервис записи', via: b.name ? `в ${b.name}` : 'в сервисе записи' }
  if (b?.mode === 'messenger') {
    if (b.channel === 'whatsapp' && s.whatsapp) return { kind: 'link', url: `https://wa.me/${digits(s.whatsapp)}?text=${encodeURIComponent(text)}`, label: 'WhatsApp', via: 'в WhatsApp' }
    if (b.channel === 'telegram' && s.telegram) return { kind: 'link', url: `https://t.me/${s.telegram.replace(/^@/, '')}`, label: 'Telegram', via: 'в Telegram' }
  }
  return { kind: 'native' }
}

/** Записаться: на сайте подставить выбор и перейти к записи; иначе открыть сервис или мессенджер */
export function book(data: Data, pick: { serviceId?: string; masterId?: string; date?: string; time?: number } = {}) {
  const service = data.services.find((s) => s.id === pick.serviceId)
  const master = data.masters.find((m) => m.id === pick.masterId)
  const text = ['Здравствуйте! Хочу записаться', service && `на «${service.title}»`, master && `к мастеру ${master.name}`].filter(Boolean).join(' ')
  const r = bookingRoute(data.studio, text)
  if (r.kind === 'link') return void window.open(r.url, '_blank', 'noopener')
  const patch: Parameters<typeof select>[0] = {}
  if (pick.serviceId) patch.serviceId = pick.serviceId
  if (pick.masterId !== undefined) patch.masterId = pick.masterId
  if (pick.date) patch.date = pick.date
  if (pick.time !== undefined) patch.time = pick.time
  if (Object.keys(patch).length) select(patch)
  scrollToId('booking')
}

export const CATEGORY_LABEL: Record<Service['category'], string> = { hands: 'Маникюр', feet: 'Педикюр', extra: 'Дополнительно' }

/** Главная услуга студии: отмеченная «чаще всего» или первая */
export const mainService = (data: Data) => data.services.find((s) => s.popular) ?? data.services[0] ?? null

/** Слово для первой строки заголовка: «Маникюр», «Педикюр» или название услуги */
export function serviceWord(s: Service | null) {
  if (!s) return 'Маникюр'
  if (s.category === 'hands') return 'Маникюр'
  if (s.category === 'feet') return 'Педикюр'
  return s.title
}

export type FreeWindow = { iso: string; time: number }

/** Ближайшие свободные окна на услугу (любой мастер) */
export function nextWindows(data: Data, serviceId: string, n: number): FreeWindow[] {
  const out: FreeWindow[] = []
  for (let i = 0; i < data.studio.horizonDays && out.length < n; i++) {
    const iso = addDays(todayIso(), i)
    for (const s of daySlots(data, serviceId, null, iso)) {
      if (!s.free) continue
      // Окна через час и чаще выглядят как «одно и то же»: показываем разнесённые по дню
      const prev = out[out.length - 1]
      if (prev && prev.iso === iso && s.time - prev.time < 90) continue
      out.push({ iso, time: s.time })
      if (out.length >= n) break
    }
  }
  return out
}

const WD_ACC = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье']
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

/** «сегодня», «завтра», «в пятницу», «24 октября»: для фразы «… в 17:30» */
export function dayPhrase(iso: string) {
  const today = todayIso()
  if (iso === today) return 'сегодня'
  if (iso === addDays(today, 1)) return 'завтра'
  if (iso <= addDays(today, 6)) return `в ${WD_ACC[weekdayOf(iso)]}`
  const d = dateOf(iso)
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
}

/** Короткая подпись дня для чипа: «сегодня», «завтра», «пт 24» */
export function dayShort(iso: string) {
  const today = todayIso()
  if (iso === today) return 'сегодня'
  if (iso === addDays(today, 1)) return 'завтра'
  return `${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'][weekdayOf(iso)]} ${dateOf(iso).getDate()}`
}

/** Появление при прокрутке: элементам .rise внутри контейнера добавляется .is-in один раз */
export function useEnter<T extends HTMLElement>(margin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      el.classList.add('is-in')
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('is-in')
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [margin])
  return ref
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

export const Out = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
)
