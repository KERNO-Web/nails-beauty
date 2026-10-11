import type { Data } from '../data/types'
import { Arrow, Pin, Star } from '../lib/icons'
import { fmtRating, reviewsCount, reviewsSource, routeUrl } from '../lib/place'
import { dayHuman, fmtPrice, fmtTime, nearestSlot } from '../lib/slots'
import { scrollToId } from '../lib/ui'

export const go = (id: string) => (e: React.MouseEvent) => (e.preventDefault(), scrollToId(id))

/** Главные факты под заголовком: цена «от», ближайшее реально свободное окно, адрес — одинаковые во всех концепциях */
export function HeroFacts({ data, className = '', address = true }: { data: Data; className?: string; address?: boolean }) {
  const main = data.services.filter((x) => x.category !== 'extra')
  const minPrice = main.length ? Math.min(...main.map((x) => x.price)) : 0
  const near = nearestSlot(data)
  return (
    <dl className={`h-facts ${className}`}>
      {minPrice > 0 && (
        <div>
          <dt>Цены</dt>
          <dd>от {fmtPrice(minPrice)}</dd>
        </div>
      )}
      {near && (
        <div>
          <dt>Ближайшее окно</dt>
          <dd>
            {dayHuman(near.iso)}, {fmtTime(near.time)}
          </dd>
        </div>
      )}
      {address && (
        <div>
          <dt>Адрес</dt>
          <dd>{data.studio.address}</dd>
        </div>
      )}
    </dl>
  )
}

export function HeroCta({ label = 'Выбрать время', onClick, className = '' }: { label?: string; onClick?: () => void; className?: string }) {
  return (
    <div className={`h-cta ${className}`}>
      <a className="btn h-btn" href="#booking" onClick={onClick ? (e) => (e.preventDefault(), onClick()) : go('booking')}>
        {label} <Arrow size={16} className="arrow" />
      </a>
      <a className="text-link" href="#services" onClick={go('services')}>
        Цены
      </a>
    </div>
  )
}

/** Где студия и можно ли ей доверять: адрес с «Маршрутом» и вход в отзывы.
 * Рейтинг и число отзывов — только из настроек (reviewsSource), без них — ссылка на отзывы на сайте */
export function HeroPlace({ data }: { data: Data }) {
  const s = data.studio
  const src = reviewsSource(s)
  const ext = { target: '_blank', rel: 'noreferrer' }
  return (
    <div className="h-place">
      <div className="h-addr">
        <Pin size={18} />
        <span className="h-addr-text">
          <b>{s.address}</b>
          <small>{s.city}</small>
        </span>
        <a className="h-route" href={routeUrl(s)} {...ext}>
          Маршрут <Arrow size={14} />
        </a>
      </div>
      {src?.rating && src.count ? (
        <a className="h-reviews" href={src.url} {...ext} aria-label={`Оценка ${fmtRating(src.rating)}, ${reviewsCount(src.count)} в ${src.name}`}>
          <Star size={15} />
          <b>{fmtRating(src.rating)}</b>
          <small>
            {reviewsCount(src.count)} · {src.name}
          </small>
          <Arrow size={14} />
        </a>
      ) : src ? (
        <a className="h-reviews" href={src.url} {...ext}>
          <b>Отзывы{src.name ? ` в\u00a0${src.name}` : ''}</b>
          <Arrow size={14} />
        </a>
      ) : data.reviews.length ? (
        <a className="h-reviews" href="#reviews" onClick={go('reviews')}>
          <b>Отзывы клиенток</b>
          <Arrow size={14} />
        </a>
      ) : null}
    </div>
  )
}
