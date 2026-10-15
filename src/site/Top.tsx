// Шапка и первый экран: название студии как вёрстка, одно фото работы и полоса с адресом, отзывами и записью
import { useEffect, useRef, useState } from 'react'
import type { Data } from '../data/types'
import { fmtRating, reviewsCount, reviewsSource, routeUrl } from '../lib/place'
import { hoursOf, fmtTime, todayIso } from '../lib/slots'
import { photoUrl, scrollToId, typo } from '../lib/ui'
import { Arrow, book, bookHref, bookingVia, ext, externalBooking, Out } from './common'
import { useWordmark } from './useWordmark'

const go = (id: string) => (e: React.MouseEvent) => (e.preventDefault(), scrollToId(id))

/* ---------- Шапка ---------- */

export function Header({ data }: { data: Data }) {
  const [solid, setSolid] = useState(false)
  const [brand, setBrand] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  // Название в шапке появляется, когда большое название первого экрана ушло вверх — не два логотипа рядом
  useEffect(() => {
    const mark = document.querySelector('.hero-mark')
    if (!mark || !('IntersectionObserver' in window)) return setBrand(true)
    const io = new IntersectionObserver(([e]) => setBrand(!e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' })
    io.observe(mark)
    return () => io.disconnect()
  }, [data.studio.name])
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])
  const s = data.studio
  const ms = data.masters.length
  const links: [string, string][] = [
    ...(data.services.length ? ([['services', 'Услуги и цены']] as [string, string][]) : []),
    ...(data.works.length ? ([['works', 'Работы']] as [string, string][]) : []),
    ...(ms ? ([['masters', ms > 1 ? 'Мастера' : 'Мастер']] as [string, string][]) : []),
    ['contacts', 'Контакты'],
  ]
  const nav = (id: string) => (e: React.MouseEvent) => (setOpen(false), go(id)(e))
  const extB = externalBooking(s)
  return (
    <header className={`hdr ${solid || open ? 'is-solid' : ''} ${brand || open ? 'has-brand' : ''}`}>
      <div className="hdr-row">
        <a className="hdr-brand" href="#top" onClick={go('top')} aria-label={`${s.name} — наверх`}>
          {s.logo ? <img src={s.logo} alt="" /> : s.name}
        </a>
        <nav className="hdr-nav" aria-label="Разделы">
          {links.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={go(id)}>
              {label}
            </a>
          ))}
        </nav>
        <a className="cta cta--sm hdr-cta" href={bookHref(s)} {...(extB ? ext : { onClick: go('booking') })}>
          Записаться
        </a>
        <button className="hdr-menu" aria-expanded={open} aria-controls="hdr-sheet" onClick={() => setOpen((v) => !v)}>
          <span className="hdr-burger" aria-hidden />
          <span className="sr-only">{open ? 'Закрыть меню' : 'Меню'}</span>
        </button>
      </div>
      <div id="hdr-sheet" className="hdr-sheet" hidden={!open}>
        <nav aria-label="Разделы">
          {links.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={nav(id)}>
              {label}
            </a>
          ))}
        </nav>
        {s.phone && (
          <a className="hdr-sheet-phone" href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>
            {s.phone}
          </a>
        )}
      </div>
    </header>
  )
}

/* ---------- Первый экран ---------- */

/** Фото первого экрана: указанное студией, иначе главная работа, иначе первая */
function heroImage(data: Data) {
  const s = data.studio
  if (s.heroLayout === 'typographic') return null
  if (s.heroPhoto) return { photo: s.heroPhoto, work: data.works.find((w) => w.photo === s.heroPhoto) }
  const w = data.works.find((x) => x.featured) ?? data.works[0]
  return w ? { photo: w.photo, work: w } : null
}

/** Часы сегодня по графику мастеров — только факт из расписания */
function todayHours(data: Data) {
  const iso = todayIso()
  let open = Infinity
  let close = -Infinity
  for (const m of data.masters) {
    const h = hoursOf(m, iso)
    if (h) {
      open = Math.min(open, h.open)
      close = Math.max(close, h.close)
    }
  }
  return open === Infinity ? null : `${fmtTime(open)}–${fmtTime(close)}`
}

export function Hero({ data }: { data: Data }) {
  const s = data.studio
  const stage = useRef<HTMLDivElement>(null)
  const mark = useWordmark(s.name, stage)
  const img = heroImage(data)
  const [shape, setShape] = useState<'landscape' | 'portrait'>('landscape')
  const [failed, setFailed] = useState(false)
  const photo = img && !failed ? img : null
  const title = s.heroTitle.trim() || 'Маникюр и педикюр'
  const src = reviewsSource(s)
  const extB = externalBooking(s)
  const hours = todayHours(data)
  const over = [s.kind, s.city].filter(Boolean).join(' · ')

  const onImg = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const i = e.currentTarget
    setShape(i.naturalWidth / i.naturalHeight < 0.92 ? 'portrait' : 'landscape')
    i.classList.add('is-loaded')
  }

  const reviewsZone = src ? (
    <a className="rail-link" href={src.url} {...ext}>
      {src.rating ? (
        <>
          <b className="tnum">{fmtRating(src.rating)}</b>
          {src.count ? ` · ${reviewsCount(src.count)}` : ''} в&nbsp;{src.name}
        </>
      ) : (
        <>Отзывы в&nbsp;{src.name}</>
      )}
      <Out />
    </a>
  ) : data.reviews.length ? (
    <a className="rail-link" href="#reviews" onClick={go('reviews')}>
      Что пишут клиенты <Arrow size={14} />
    </a>
  ) : null

  return (
    <section
      className="hero"
      id="top"
      data-mark={mark.variant}
      data-plate={photo ? shape : 'none'}
      style={{ '--mark-size': `${mark.size}px` } as React.CSSProperties}
      aria-label={`${s.name}: первый экран`}
    >
      <div className="hero-stage" ref={stage}>
        {over && (
          <p className="hero-over">
            <span>{over}</span>
          </p>
        )}
        <h1 className={`hero-mark ${mark.wrap ? 'is-wrap' : ''}`}>
          {s.logo && mark.variant === 'compact' ? <img src={s.logo} alt={s.name} /> : s.name}
        </h1>

        {photo ? (
          <figure className="hero-plate">
            <img
              src={photoUrl(photo.photo, 1600)}
              srcSet={photo.photo.startsWith('photo-') ? [800, 1200, 1600, 2200].map((w) => `${photoUrl(photo.photo, w)} ${w}w`).join(', ') : undefined}
              sizes="(min-width: 900px) 62vw, 100vw"
              alt={photo.work ? `Работа студии: ${photo.work.title}` : `Работа студии ${s.name}`}
              fetchPriority="high"
              decoding="async"
              onLoad={onImg}
              onError={() => setFailed(true)}
              style={{ '--pos-d': s.heroPositionDesktop ?? photo.work?.focus ?? '50% 50%', '--pos-m': s.heroPositionMobile ?? s.heroPositionDesktop ?? photo.work?.focus ?? '50% 50%' } as React.CSSProperties}
            />
          </figure>
        ) : null}
        {photo?.work && (
          <p className="hero-caption">
            <span className="eyebrow">На фото</span>
            <span>{photo.work.title}</span>
            {data.masters.length > 1 && data.masters.find((m) => m.id === photo.work?.masterId) && <span className="hero-caption-who">мастер {data.masters.find((m) => m.id === photo.work?.masterId)!.name}</span>}
          </p>
        )}

        <div className="hero-copy">
          <p className="hero-title">{typo(title)}</p>
          {s.heroLead && <p className="hero-lead">{typo(s.heroLead)}</p>}
          <div className="hero-actions">
            <a className="cta" href={bookHref(s)} {...(extB ? ext : { onClick: (e: React.MouseEvent) => (e.preventDefault(), book(data)) })}>
              {extB ? 'Записаться онлайн' : 'Выбрать время'}
              {extB ? <Out /> : <Arrow />}
            </a>
            {data.works.length > 0 && (
              <a className="cta cta--ghost" href="#works" onClick={go('works')}>
                Смотреть работы
              </a>
            )}
          </div>
        </div>

        <div className="hero-rail">
          {s.address && (
            <div className="rail-zone">
              <p className="eyebrow">Адрес</p>
              <p className="rail-main">{s.address}</p>
              <a className="rail-link" href={routeUrl(s)} {...ext}>
                Маршрут <Out />
              </a>
            </div>
          )}
          {(reviewsZone || hours) && (
            <div className="rail-zone">
              <p className="eyebrow">{reviewsZone ? 'Отзывы' : 'Сегодня'}</p>
              {reviewsZone ? (
                <>
                  {reviewsZone}
                  {hours && <p className="rail-note">Сегодня открыто {hours}</p>}
                </>
              ) : (
                <p className="rail-main tnum">{hours}</p>
              )}
            </div>
          )}
          <div className="rail-zone">
            <p className="eyebrow">Запись</p>
            <a className="rail-link" href={bookHref(s)} {...(extB ? ext : { onClick: go('booking') })}>
              {extB ? `Онлайн ${bookingVia(s)}` : 'Онлайн, без звонка'} {extB ? <Out /> : <Arrow size={14} />}
            </a>
            {s.phone && (
              <p className="rail-note">
                или по&nbsp;телефону{' '}
                <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} className="tnum">
                  {s.phone}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
