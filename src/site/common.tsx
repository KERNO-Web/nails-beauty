// Общее для разделов: куда ведёт «Записаться», появление при прокрутке, иконки
import { useEffect, useRef } from 'react'
import type { Data, Service, Studio } from '../data/types'
import { select } from '../lib/selection'
import { fmtTime } from '../lib/slots'
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

/** Записаться: на сайте — подставить выбор и перейти к записи; иначе — открыть сервис или мессенджер */
export function book(data: Data, pick: { serviceId?: string; masterId?: string } = {}) {
  const service = data.services.find((s) => s.id === pick.serviceId)
  const master = data.masters.find((m) => m.id === pick.masterId)
  const text = ['Здравствуйте! Хочу записаться', service && `на «${service.title}»`, master && `к мастеру ${master.name}`].filter(Boolean).join(' ')
  const r = bookingRoute(data.studio, text)
  if (r.kind === 'link') return void window.open(r.url, '_blank', 'noopener')
  if (pick.serviceId || pick.masterId) select({ ...(pick.serviceId ? { serviceId: pick.serviceId } : {}), ...(pick.masterId ? { masterId: pick.masterId } : {}) })
  scrollToId('booking')
}

/** Атрибуты ссылки «Записаться»: настоящий адрес (работает и без JS), внешний — в новой вкладке */
export function bookLink(data: Data, pick: { serviceId?: string; masterId?: string } = {}) {
  const r = bookingRoute(data.studio)
  if (r.kind === 'link') return { href: r.url, target: '_blank', rel: 'noreferrer', onClick: (e: React.MouseEvent) => (e.preventDefault(), book(data, pick)) }
  return { href: '#booking', onClick: (e: React.MouseEvent) => (e.preventDefault(), book(data, pick)) }
}

export const CATEGORY_LABEL: Record<Service['category'], string> = { hands: 'Маникюр', feet: 'Педикюр', extra: 'Дополнительно' }

export const minPrice = (data: Data) => (data.services.length ? Math.min(...data.services.map((s) => s.price)) : null)

export const timeText = (t: number) => fmtTime(t)

/** Появление блока, когда он доезжает до экрана: класс .is-in */
export function useEnter<T extends HTMLElement>(margin = '0px 0px -10% 0px') {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) return void el.classList.add('is-in')
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

const svg = (size: number) => ({ className: 'i', width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true })

export const Arrow = ({ size = 18 }: { size?: number }) => (
  <svg {...svg(size)}>
    <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
  </svg>
)
export const Out = ({ size = 15 }: { size?: number }) => (
  <svg {...svg(size)}>
    <path d="M7 17 17 7M8.5 7H17v8.5" />
  </svg>
)
export const Pin = ({ size = 18 }: { size?: number }) => (
  <svg {...svg(size)}>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
)
export const Clock = ({ size = 18 }: { size?: number }) => (
  <svg {...svg(size)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)
export const Quote = ({ size = 18 }: { size?: number }) => (
  <svg {...svg(size)}>
    <path d="M5 18c3-1 4.5-3.5 4.5-7V6H4.5v5H8M15 18c3-1 4.5-3.5 4.5-7V6h-5v5H18" />
  </svg>
)
export const Tag = ({ size = 18 }: { size?: number }) => (
  <svg {...svg(size)}>
    <path d="M3.5 12.5V4.5h8l9 9-8 8-9-9Z" />
    <circle cx="8" cy="9" r="1.5" />
  </svg>
)
export const Close = ({ size = 22 }: { size?: number }) => (
  <svg {...svg(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
export const Chevron = ({ size = 20, dir = 'right' }: { size?: number; dir?: 'left' | 'right' }) => (
  <svg {...svg(size)}>
    <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
)
