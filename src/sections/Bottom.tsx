import { useEffect, useState } from 'react'
import type { Data, Review } from '../data/types'
import { Arrow, Star } from '../lib/icons'
import { fmtRating, reviewsCount, reviewsSource, routeUrl } from '../lib/place'
import { dateOf, dayHuman, fmtTime, hoursSummary, MONTHS_NOM, nearestSlot } from '../lib/slots'
import { scrollToId, typo } from '../lib/ui'

/** Дата отзыва: «сентябрь 2026» */
function reviewDate(iso: string) {
  const d = dateOf(iso)
  return `${MONTHS_NOM[d.getMonth()].toLowerCase()} ${d.getFullYear()}`
}

/** Звёзды — только для настоящей оценки */
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

/** До трёх отзывов: отмеченный featured, дальше самые свежие. Остальные — по ссылке на источник */
function pickReviews(list: Review[]) {
  const byDate = [...list].sort((a, b) => b.date.localeCompare(a.date))
  const lead = byDate.find((r) => r.featured) ?? byDate.find((r) => r.text.length >= 80) ?? byDate[0]
  return [lead, ...byDate.filter((r) => r !== lead)].slice(0, 3)
}

const PREVIEW = 220

export function Reviews({ data }: { data: Data }) {
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(false)
  if (!data.reviews.length) return null
  const src = reviewsSource(data.studio)
  const picked = pickReviews(data.reviews)
  const r = picked[Math.min(idx, picked.length - 1)]
  const long = r.text.length > PREVIEW + 30
  const text = long && !open ? r.text.slice(0, r.text.lastIndexOf(' ', PREVIEW)) + '…' : r.text
  const choose = (i: number) => (setIdx(i), setOpen(false))
  const ext = { target: '_blank', rel: 'noreferrer' }
  return (
    <section className="reviews-sec" id="reviews">
      <div className="wrap-wide">
        <h2 className="rv-title">Отзывы</h2>
        <div className="rv-layout">
          {/* Репутация: оценка, количество и источник — только из настроек студии, с настоящей ссылкой */}
          <div className="rv-anchor">
            {src?.rating ? (
              <>
                <p className="rv-score">
                  <b>{fmtRating(src.rating)}</b>
                  <Stars value={src.rating} size={20} />
                </p>
                <p className="rv-source">
                  {src.count ? (
                    <a href={src.url} {...ext}>
                      {reviewsCount(src.count)}
                    </a>
                  ) : null}
                  {src.count && src.name ? ' в\u00a0' : ''}
                  {src.name}
                </p>
              </>
            ) : (
              <>
                <p className="rv-anchor-title">Отзывы наших клиентов</p>
                <p className="rv-anchor-note">
                  {src ? `Больше отзывов${src.name ? ` — в\u00a0${src.name}` : ''}.` : 'Пишут после визита — публикуем с\u00a0их согласия.'}
                </p>
              </>
            )}
            {src ? (
              <a className="btn btn-line rv-all" href={src.url} {...ext}>
                Все отзывы <span aria-hidden>↗</span>
              </a>
            ) : (
              <button className="btn btn-line rv-all" onClick={() => scrollToId('booking')}>
                Записаться <Arrow size={16} />
              </button>
            )}
          </div>

          <div className="rv-voice">
            <figure className="rv-featured" key={r.id} aria-live="polite">
              {r.rating ? <Stars value={r.rating} size={16} /> : null}
              <blockquote id="rv-text">{typo(text)}</blockquote>
              {long && (
                <button className="rv-more" aria-expanded={open} aria-controls="rv-text" onClick={() => setOpen((v) => !v)}>
                  {open ? 'Свернуть' : 'Читать полностью'}
                </button>
              )}
              <figcaption className="rv-meta">
                <b>{r.name}</b>
                <span>
                  {[r.service, reviewDate(r.date)].filter(Boolean).join(' · ')}
                  {r.source && (
                    <>
                      {' · '}
                      {r.url ? (
                        <a href={r.url} {...ext}>
                          {r.source}
                        </a>
                      ) : (
                        r.source
                      )}
                    </>
                  )}
                </span>
                {r.demo && <em className="rv-demo">пример для демо</em>}
              </figcaption>
            </figure>
            {picked.length > 1 && (
              <div className="rv-pick" role="group" aria-label="Выбрать отзыв">
                {picked.map((x, i) => (
                  <button key={x.id} className="rv-tab" aria-pressed={i === idx} onClick={() => choose(i)}>
                    <b>{x.name}</b>
                    <span>{x.service}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
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
