// Общее для разделов сайта: куда ведёт «Записаться», появление при прокрутке, мелкие элементы оформления
import { useEffect, useRef } from 'react'
import type { Data, Service, Studio } from '../data/types'
import { select } from '../lib/selection'
import { scrollToId } from '../lib/ui'

/** Запись во внешнем сервисе (DIKIDI, YCLIENTS): тогда все кнопки «Записаться» ведут туда */
export function externalBooking(s: Studio) {
  const b = s.booking
  return b?.mode === 'external' && /^https?:\/\//.test(b.url) ? b : null
}

/** Записаться: на сайте — подставить выбор и перейти к записи; внешняя запись — открыть сервис */
export function book(data: Data, pick: { serviceId?: string; masterId?: string } = {}) {
  const ext = externalBooking(data.studio)
  if (ext) {
    window.open(ext.url, '_blank', 'noopener')
    return
  }
  if (pick.serviceId || pick.masterId) select({ ...(pick.serviceId ? { serviceId: pick.serviceId } : {}), ...(pick.masterId ? { masterId: pick.masterId } : {}) })
  scrollToId('booking')
}

/** Подпись под ссылкой на внешнюю запись */
export const bookingVia = (s: Studio) => {
  const ext = externalBooking(s)
  return ext ? (ext.name ? `через ${ext.name}` : 'во внешнем сервисе') : null
}

/** Ссылка «Записаться» с правильным адресом для открытия в новой вкладке и без JS */
export function bookHref(s: Studio) {
  return externalBooking(s)?.url ?? '#booking'
}

export const CATEGORY_LABEL: Record<Service['category'], string> = { hands: 'Маникюр', feet: 'Педикюр', extra: 'Дополнительно' }

/** Появление блока, когда он доезжает до экрана: класс .is-in. Без IntersectionObserver — сразу */
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

export const Arrow = ({ size = 16 }: { size?: number }) => (
  <svg className="i-arrow" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
  </svg>
)

/** ↗ — ссылка уходит на другой сайт */
export const Out = ({ size = 13 }: { size?: number }) => (
  <svg className="i-out" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 17 17 7M8.5 7H17v8.5" />
  </svg>
)

export const ext = { target: '_blank', rel: 'noreferrer' } as const
