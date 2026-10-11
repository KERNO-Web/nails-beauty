import { useEffect, useState } from 'react'
import type { Data, Review } from '../data/types'
import { Arrow, Star } from '../lib/icons'
import { fmtRating, reviewsCount, reviewsSource, routeUrl } from '../lib/place'
import { dateOf, dayHuman, fmtTime, hoursSummary, MONTHS_NOM, nearestSlot, plural } from '../lib/slots'
import { initialOf, scrollToId, typo } from '../lib/ui'

/** Дата отзыва: «сентябрь 2026» */
function reviewDate(iso: string) {
  const d = dateOf(iso)
  return `${MONTHS_NOM[d.getMonth()].toLowerCase()} ${d.getFullYear()}`
}

/** Звёзды — только для настоящей оценки отзыва */
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const n = Math.max(0, Math.min(5, Math.round(value)))
  return (
    <span className="stars" role="img" aria-label={`Оценка ${n} из 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} filled={i < n} />
      ))}
    </span>
  )
}

/** Главный отзыв: отмеченный featured, иначе самый свежий из содержательных (от 80 знаков) */
function orderReviews(list: Review[]) {
  const byDate = [...list].sort((a, b) => b.date.localeCompare(a.date))
  const lead = byDate.find((r) => r.featured) ?? byDate.find((r) => r.text.length >= 80) ?? byDate[0]
  return [lead, ...byDate.filter((r) => r !== lead)]
}

const PREVIEW = 240

function ReviewText({ text, big }: { text: string; big?: boolean }) {
  const [open, setOpen] = useState(false)
  const long = text.length > PREVIEW + 40
  // Обрезаем по слову; полный текст — по кнопке (и для скринридеров он доступен целиком после раскрытия)
  const short = long && !open ? text.slice(0, text.lastIndexOf(' ', PREVIEW)) + '…' : text
  return (
    <>
      <blockquote className={big ? 'rv-quote is-big' : 'rv-quote'}>{typo(short)}</blockquote>
      {long && (
        <button className="rv-more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Свернуть' : 'Читать полностью'}
        </button>
      )}
    </>
  )
}

function ReviewMeta({ r }: { r: Review }) {
  const source = r.source && (r.url ? (
    <a href={r.url} target="_blank" rel="noreferrer">
      {r.source}
    </a>
  ) : (
    r.source
  ))
  return (
    <figcaption className="rv-meta">
      <span className="rv-avatar" aria-hidden>
        {initialOf(r.name)}
      </span>
      <span className="rv-who">
        <b>{r.name}</b>
        <small>
          {[r.service, reviewDate(r.date)].filter(Boolean).join(' · ')}
          {source && <> · {source}</>}
        </small>
      </span>
    </figcaption>
  )
}

export function Reviews({ data }: { data: Data }) {
  const [all, setAll] = useState(false)
  if (!data.reviews.length) return null
  const src = reviewsSource(data.studio)
  const [lead, ...rest] = orderReviews(data.reviews)
  const side = rest.slice(0, 2)
  const more = rest.slice(2)
  return (
    <section className="reviews-sec" id="reviews">
      <div className="wrap-wide">
        <header className="sec-head rv-head">
          <h2>Отзывы</h2>
          <div className="rv-summary">
            {src?.rating && src.count ? (
              <a className="rv-score" href={src.url} target="_blank" rel="noreferrer">
                <b>{fmtRating(src.rating)}</b>
                <span>
                  <Stars value={src.rating} size={15} />
                  <small>
                    {reviewsCount(src.count)} в&nbsp;{src.name}
                  </small>
                </span>
              </a>
            ) : (
              <p>Что говорят клиентки после визита.</p>
            )}
            {src && (
              <a className="text-link" href={src.url} target="_blank" rel="noreferrer">
                Все отзывы{src.name ? ` в\u00a0${src.name}` : ''} <Arrow size={14} />
              </a>
            )}
          </div>
        </header>
        <div className={`rv-grid ${side.length ? '' : 'is-solo'}`}>
          <figure className="rv-card rv-lead reveal">
            {lead.rating ? <Stars value={lead.rating} size={18} /> : null}
            <ReviewText text={lead.text} big />
            <ReviewMeta r={lead} />
          </figure>
          {side.length > 0 && (
            <div className="rv-side">
              {side.map((r, i) => (
                <figure key={r.id} className={`rv-card reveal d${i + 1}`}>
                  {r.rating ? <Stars value={r.rating} /> : null}
                  <ReviewText text={r.text} />
                  <ReviewMeta r={r} />
                </figure>
              ))}
            </div>
          )}
        </div>
        {more.length > 0 &&
          (all ? (
            <div className="rv-rest">
              {more.map((r) => (
                <figure key={r.id} className="rv-card">
                  {r.rating ? <Stars value={r.rating} /> : null}
                  <ReviewText text={r.text} />
                  <ReviewMeta r={r} />
                </figure>
              ))}
            </div>
          ) : (
            <div className="rv-foot">
              <button className="btn btn-line" onClick={() => setAll(true)}>
                Ещё {more.length} {plural(more.length, 'отзыв', 'отзыва', 'отзывов')}
              </button>
            </div>
          ))}
      </div>
    </section>
  )
}

/** Финал: контакты, карта и большое имя студии */
export function Closing({ data }: { data: Data }) {
  const s = data.studio
  const [lon, lat] = s.map
  const route = routeUrl(s)
  const hours = hoursSummary(data)
  const near = nearestSlot(data)
  const mapSrc = `https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&z=16&pt=${lon}%2C${lat}%2Cpm2rdm`
  const links = [
    s.phone && { href: `tel:${s.phone.replace(/[^\d+]/g, '')}`, label: s.phone },
    s.telegram && { href: `https://t.me/${s.telegram}`, label: 'Telegram', ext: true },
    s.whatsapp && { href: `https://wa.me/${s.whatsapp}`, label: 'WhatsApp', ext: true },
    s.vk && { href: `https://vk.com/${s.vk}`, label: 'ВКонтакте', ext: true },
  ].filter(Boolean) as { href: string; label: string; ext?: boolean }[]
  return (
    <footer className="closing" id="contacts">
      <div className="wrap-wide">
        <div className="closing-grid">
          <div className="closing-col">
            <p className="label">Адрес</p>
            <p className="closing-addr">{s.address}</p>
            <p className="muted">
              {s.city}. {typo(s.addressNote)}
            </p>
            <a className="text-link" href={route} target="_blank" rel="noreferrer">
              Построить маршрут <Arrow size={14} />
            </a>
          </div>
          <div className="closing-col">
            <p className="label">Часы</p>
            <dl className="hours" aria-label="Часы работы">
              {hours.map((h) => (
                <div key={h.days} className={h.text === 'выходной' ? 'off' : ''}>
                  <dt>{h.days}</dt>
                  <dd className="num">{h.text}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="closing-col">
            <p className="label">Связь</p>
            <ul className="closing-links">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} {...(l.ext ? { target: '_blank', rel: 'noreferrer' } : {})}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="closing-cta">
            <a className="btn btn-primary" href="#booking" onClick={(e) => (e.preventDefault(), scrollToId('booking'))}>
              Записаться онлайн <Arrow size={16} className="arrow" />
            </a>
            {near && (
              <p className="muted">
                Ближайшее окно — {dayHuman(near.iso)}, {fmtTime(near.time)}
              </p>
            )}
          </div>
          <div className="closing-map">
            <iframe src={mapSrc} title={`Карта: ${s.address}`} loading="lazy" allowFullScreen />
          </div>
        </div>
        <p className="closing-mark" aria-hidden>
          {s.name}
        </p>
        <div className="closing-legal">
          <span>
            © {new Date().getFullYear()} {s.name} {s.kind}, {s.city}
            {s.demoNote && <span className="demo-note">{s.demoNote}</span>}
          </span>
          <a href="#/admin">Кабинет мастера</a>
        </div>
      </div>
    </footer>
  )
}

/** Кнопка «Записаться» внизу экрана на телефоне — когда первый экран уже прокручен, а до записи ещё далеко */
export function StickyCta({ data }: { data: Data }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const check = () => {
      if (window.innerWidth >= 1000) return setOn(false)
      const hero = document.getElementById('top')
      const bk = document.getElementById('booking')
      if (!hero || !bk) return
      const vh = window.innerHeight
      const r = bk.getBoundingClientRect()
      const pastHero = hero.getBoundingClientRect().bottom < 80
      const nearBooking = r.top < vh * 0.9 && r.bottom > 0
      const atEnd = window.scrollY + vh > document.documentElement.scrollHeight - 420
      setOn(pastHero && !nearBooking && !atEnd)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])
  const near = nearestSlot(data)
  return (
    <div className={`bookbar ${on ? 'is-on' : ''}`} aria-hidden={!on}>
      <div className="bookbar-inner">
        <div className="bookbar-text">
          <b>Онлайн-запись</b>
          {near ? `Ближайшее окно: ${dayHuman(near.iso)}, ${fmtTime(near.time)}` : 'Выберите удобное время'}
        </div>
        <button className="btn btn-primary" onClick={() => scrollToId('booking')} tabIndex={on ? 0 : -1}>
          Записаться
        </button>
      </div>
    </div>
  )
}
