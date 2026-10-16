// Шапка и первый экран: слева — название студии и смысл, справа — цветное поле с фото работы,
// поверх стыка — карточка самой популярной услуги; внизу — полоса «адрес · отзывы · цены · запись»
import { useEffect, useRef, useState } from 'react'
import type { Data } from '../data/types'
import { fmtRating, reviewsCount, reviewsSource, routeUrl } from '../lib/place'
import { dayHuman, fmtDuration, fmtPrice, fmtTime, nearestSlot, plural, priceLabel } from '../lib/slots'
import { photoUrl, scrollToId, typo } from '../lib/ui'
import { Arrow, bookingRoute, bookLink, Clock, minPrice, Out, Pin, Quote, Tag } from './common'
import { useFit } from './useFit'

const go = (id: string) => (e: React.MouseEvent) => (e.preventDefault(), scrollToId(id))

export function Header({ data }: { data: Data }) {
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 10)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])
  const s = data.studio
  const ms = data.masters.length
  const links = [
    data.services.length && ['services', 'Услуги и цены'],
    data.works.length && ['works', 'Работы'],
    ms && ['masters', ms > 1 ? 'Мастера' : 'Мастер'],
    (data.reviews.length || reviewsSource(s)) && ['reviews', 'Отзывы'],
    ['contacts', 'Контакты'],
  ].filter(Boolean) as [string, string][]
  const nav = (id: string) => (e: React.MouseEvent) => (setOpen(false), go(id)(e))
  return (
    <header className={`hd ${solid || open ? 'is-solid' : ''}`}>
      <div className="wrap hd-row">
        <a className={`hd-brand ${s.name.length > 14 ? 'is-long' : ''}`} href="#top" onClick={go('top')} aria-label={`${s.name} — наверх`}>
          {s.logo ? <img src={s.logo} alt="" /> : s.name}
        </a>
        <nav className="hd-nav" aria-label="Разделы">
          {links.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={go(id)}>
              {label}
            </a>
          ))}
        </nav>
        <div className="hd-end">
          {s.phone && (
            <a className="hd-phone num" href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>
              {s.phone}
            </a>
          )}
          <a className="btn-a is-sm hd-cta" {...bookLink(data)}>
            Записаться
          </a>
          <button className="hd-menu" aria-expanded={open} aria-controls="hd-sheet" onClick={() => setOpen((v) => !v)}>
            <span aria-hidden />
            <span className="sr-only">{open ? 'Закрыть меню' : 'Меню'}</span>
          </button>
        </div>
      </div>
      <div id="hd-sheet" className="hd-sheet" hidden={!open}>
        <nav className="wrap" aria-label="Разделы">
          {links.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={nav(id)}>
              {label}
            </a>
          ))}
          {s.phone && (
            <a className="hd-sheet-phone num" href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>
              {s.phone}
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}

/** Фото первого экрана: указанное студией, иначе главная работа, иначе первая */
function heroImage(data: Data) {
  const s = data.studio
  if (s.heroLayout === 'typographic') return null
  if (s.heroPhoto) return { photo: s.heroPhoto, work: data.works.find((w) => w.photo === s.heroPhoto) }
  const w = data.works.find((x) => x.featured) ?? data.works[0]
  return w ? { photo: w.photo, work: w } : null
}

export function Hero({ data }: { data: Data }) {
  const s = data.studio
  const nameBox = useRef<HTMLDivElement>(null)
  const fit = useFit(s.name, nameBox, (vw) => (vw >= 900 ? { max: Math.min(210, vw * 0.15), min: 96, compact: 40 } : { max: Math.min(116, vw * 0.3), min: 58, compact: 30 }))
  const img = heroImage(data)
  const [failed, setFailed] = useState(false)
  const photo = img && !failed ? img : null
  const route = bookingRoute(s)
  const native = route.kind === 'native'
  const popular = data.services.find((x) => x.popular) ?? data.services[0]
  const src = reviewsSource(s)
  const from = minPrice(data)
  const near = native && data.masters.length ? nearestSlot(data) : null
  const title = s.heroTitle.trim() || 'Маникюр и педикюр'
  const where = [s.kind, s.city].filter(Boolean).join(' · ')

  return (
    <section className={`hero ${photo ? 'has-photo' : 'no-photo'} name-${fit.mode}`} id="top" aria-label={`${s.name}, первый экран`}>
      <div className="hero-split">
        <div className="hero-text">
          {where && <p className="tag hero-where">{where}</p>}
          <div className="hero-name-box" ref={nameBox}>
            <h1 className="hero-name" style={{ fontSize: fit.size }}>
              {s.name}
            </h1>
          </div>
          <p className="hero-title">{typo(title)}</p>
          {s.heroLead && <p className="lead hero-lead">{typo(s.heroLead)}</p>}
          <div className="hero-cta">
            <a className="btn-a" {...bookLink(data)}>
              {native ? 'Выбрать время' : `Записаться ${route.via}`} {native ? <Arrow /> : <Out />}
            </a>
            {data.services.length > 0 && (
              <a className="btn-a is-line" href="#services" onClick={go('services')}>
                Услуги и цены
              </a>
            )}
          </div>
        </div>

        <div className="hero-visual">
          {photo ? (
            <figure className="hero-photo">
              <img
                src={photoUrl(photo.photo, 1400)}
                srcSet={photo.photo.startsWith('photo-') ? [700, 1000, 1400, 1900].map((w) => `${photoUrl(photo.photo, w)} ${w}w`).join(', ') : undefined}
                sizes="(min-width: 900px) 40vw, 100vw"
                alt={photo.work ? `Работа студии: ${photo.work.title}` : `Работа студии ${s.name}`}
                fetchPriority="high"
                onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
                onError={() => setFailed(true)}
                style={{ '--pos-d': s.heroPositionDesktop ?? photo.work?.focus ?? '50% 50%', '--pos-m': s.heroPositionMobile ?? s.heroPositionDesktop ?? photo.work?.focus ?? '50% 50%' } as React.CSSProperties}
              />
              {photo.work && <figcaption>{photo.work.title}</figcaption>}
            </figure>
          ) : (
            <div className="hero-monogram" aria-hidden>
              {s.name.trim().charAt(0)}
            </div>
          )}
          {popular && (
            <a className="hero-card" {...bookLink(data, { serviceId: popular.id })} aria-label={`${popular.title}, ${priceLabel(popular)}. Записаться`}>
              <span className="hero-card-k">{popular.popular ? 'Выбирают чаще всего' : 'Услуга'}</span>
              <span className="hero-card-t">{popular.title}</span>
              <span className="hero-card-m">
                <b className="num">{priceLabel(popular)}</b>
                <span>{fmtDuration(popular.minutes)}</span>
              </span>
              <span className="hero-card-go" aria-hidden>
                <Arrow size={16} />
              </span>
            </a>
          )}
        </div>
      </div>

      <div className="wrap">
        <ul className="rail" aria-label="Коротко о студии">
          {s.address && (
            <li>
              <Pin />
              <span>
                <span className="rail-k">Адрес</span>
                <span className="rail-v">{s.address}</span>
                <a className="u-link rail-a" href={routeUrl(s)} target="_blank" rel="noreferrer">
                  Маршрут <Out size={13} />
                </a>
              </span>
            </li>
          )}
          {(src || data.reviews.length > 0) && (
            <li>
              <Quote />
              <span>
                <span className="rail-k">Отзывы</span>
                {src?.rating ? (
                  <span className="rail-v num">
                    {fmtRating(src.rating)} из 5{src.count ? ` · ${reviewsCount(src.count)}` : ''}
                  </span>
                ) : (
                  <span className="rail-v">
                    {data.reviews.length ? `${data.reviews.length} ${plural(data.reviews.length, 'отзыв', 'отзыва', 'отзывов')} на сайте` : `в ${src!.name}`}
                  </span>
                )}
                {src ? (
                  <a className="u-link rail-a" href={src.url} target="_blank" rel="noreferrer">
                    {src.name} <Out size={13} />
                  </a>
                ) : (
                  <a className="u-link rail-a" href="#reviews" onClick={go('reviews')}>
                    Читать
                  </a>
                )}
              </span>
            </li>
          )}
          {from !== null && (
            <li>
              <Tag />
              <span>
                <span className="rail-k">Цены</span>
                <span className="rail-v num">от {fmtPrice(from)}</span>
                <a className="u-link rail-a" href="#services" onClick={go('services')}>
                  Весь прайс
                </a>
              </span>
            </li>
          )}
          <li>
            <Clock />
            <span>
              <span className="rail-k">{near ? 'Ближайшее окно' : 'Запись'}</span>
              <span className="rail-v num">{near ? `${dayHuman(near.iso)}, ${fmtTime(near.time)}` : native ? 'онлайн, без звонка' : route.via}</span>
              <a className="u-link rail-a" {...bookLink(data)}>
                {near ? 'Выбрать время' : 'Записаться'}
              </a>
            </span>
          </li>
        </ul>
      </div>
    </section>
  )
}
