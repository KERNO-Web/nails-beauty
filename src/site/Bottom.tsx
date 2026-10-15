// Отзывы, контакты и финал страницы, плавающая кнопка записи на телефоне
import { useEffect, useState } from 'react'
import type { Data, Review } from '../data/types'
import { fmtRating, reviewsCount, reviewsSource, routeUrl } from '../lib/place'
import { dateOf, hoursSummary, MONTHS_NOM } from '../lib/slots'
import { scrollToId, typo } from '../lib/ui'
import { Arrow, book, bookHref, ext, externalBooking, Out, useEnter } from './common'

/** Дата отзыва: «сентябрь 2026» */
function reviewDate(iso: string) {
  const d = dateOf(iso)
  return `${MONTHS_NOM[d.getMonth()].toLowerCase()} ${d.getFullYear()}`
}

/** До четырёх отзывов: отмеченный featured, дальше самые свежие. Остальные — по ссылке на источник */
function pickReviews(list: Review[]) {
  const byDate = [...list].sort((a, b) => b.date.localeCompare(a.date))
  const lead = byDate.find((r) => r.featured) ?? byDate.find((r) => r.text.length >= 80) ?? byDate[0]
  return [lead, ...byDate.filter((r) => r !== lead)].slice(0, 4)
}

const PREVIEW = 240

export function Reviews({ data }: { data: Data }) {
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useEnter<HTMLDivElement>()
  const src = reviewsSource(data.studio)
  if (!data.reviews.length && !src) return null
  const picked = data.reviews.length ? pickReviews(data.reviews) : []
  const r = picked[Math.min(idx, picked.length - 1)]
  const long = !!r && r.text.length > PREVIEW + 30
  const text = r ? (long && !open ? r.text.slice(0, r.text.lastIndexOf(' ', PREVIEW)) + '…' : r.text) : ''
  const choose = (i: number) => (setIdx(i), setOpen(false))
  const allDemo = picked.length > 0 && picked.every((x) => x.demo)
  return (
    <section className="rv" id="reviews" aria-labelledby="rv-title">
      <div className="frame grid12" ref={ref}>
        <div className="rv-side enter">
          <h2 className="h-chapter" id="rv-title">
            Отзывы
          </h2>
          {/* Оценка и количество — только из настроек студии и только со ссылкой на публичную страницу */}
          {src && (
            <a className="rv-source" href={src.url} {...ext}>
              {src.rating ? (
                <>
                  <b className="tnum">{fmtRating(src.rating)}</b>
                  <span>
                    {src.count ? `${reviewsCount(src.count)} в ${src.name}` : `оценка в ${src.name}`}
                    <Out />
                  </span>
                </>
              ) : (
                <span>
                  Отзывы в&nbsp;{src.name} <Out />
                </span>
              )}
            </a>
          )}
          {allDemo && <p className="rv-demo">Примеры отзывов для демонстрации сайта: студия и&nbsp;клиенты вымышлены.</p>}
        </div>

        {r && (
          <div className="rv-stage enter">
            <figure className="rv-quote" key={r.id}>
              <blockquote id="rv-text" aria-live="polite">
                <p>{typo(text)}</p>
              </blockquote>
              {long && (
                <button className="rv-more" aria-expanded={open} aria-controls="rv-text" onClick={() => setOpen((v) => !v)}>
                  {open ? 'Свернуть' : 'Читать полностью'}
                </button>
              )}
              <figcaption>
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
                {r.demo && !allDemo && <em className="rv-demo-tag">пример для демо</em>}
              </figcaption>
            </figure>
            {picked.length > 1 && (
              <div className="rv-pick" role="group" aria-label="Другие отзывы">
                {picked.map((x, i) => (
                  <button key={x.id} className="rv-tab" aria-pressed={i === idx} onClick={() => choose(i)}>
                    <b>{x.name}</b>
                    <span>{x.service}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/** Финал: как найти студию, связь, одна кнопка записи, подвал */
export function Contact({ data }: { data: Data }) {
  const s = data.studio
  const ref = useEnter<HTMLDivElement>()
  const hours = data.masters.length ? hoursSummary(data) : []
  const extB = externalBooking(s)
  const links = [
    s.phone && { href: `tel:${s.phone.replace(/[^\d+]/g, '')}`, label: s.phone, kind: 'Телефон' },
    s.telegram && { href: `https://t.me/${s.telegram}`, label: `@${s.telegram}`, kind: 'Telegram', ext: true },
    s.whatsapp && { href: `https://wa.me/${s.whatsapp}`, label: 'Написать', kind: 'WhatsApp', ext: true },
    s.vk && { href: /^https?:/.test(s.vk) ? s.vk : `https://vk.com/${s.vk}`, label: 'Сообщество', kind: 'ВКонтакте', ext: true },
  ].filter(Boolean) as { href: string; label: string; kind: string; ext?: boolean }[]
  const hasMap = s.map[0] !== 0 || !!s.routeUrl
  return (
    <footer className="ct" id="contacts" aria-labelledby="ct-title">
      <div className="frame" ref={ref}>
        <div className="ct-top grid12">
          <h2 className="h-chapter ct-title enter" id="ct-title">
            Как нас найти
          </h2>
          {s.address ? (
            <div className="ct-addr enter">
              <p className="eyebrow">{s.city || 'Адрес'}</p>
              <p className="ct-addr-main">{s.address}</p>
              {s.addressNote && <p className="ct-addr-note">{typo(s.addressNote)}</p>}
              {hasMap && (
                <a className="line-link" href={routeUrl(s)} {...ext}>
                  Построить маршрут <Out />
                </a>
              )}
            </div>
          ) : null}
        </div>

        <div className="ct-grid grid12">
          {hours.length > 0 && (
            <div className="ct-col ct-hours">
              <p className="eyebrow">Часы работы</p>
              <dl>
                {hours.map((h) => (
                  <div key={h.days} className={h.text === 'выходной' ? 'is-off' : ''}>
                    <dt>{h.days}</dt>
                    <dd className="tnum">{h.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {links.length > 0 && (
            <div className="ct-col ct-links">
              <p className="eyebrow">Связь</p>
              <ul>
                {links.map((l) => (
                  <li key={l.href}>
                    <span>{l.kind}</span>
                    <a href={l.href} {...(l.ext ? ext : {})}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="ct-col ct-book">
            <p className="ct-book-text">{extB ? 'Свободное время мастеров — в сервисе записи студии.' : 'Свободное время видно сразу, запись занимает минуту.'}</p>
            <a className="cta" href={bookHref(s)} {...(extB ? ext : { onClick: (e: React.MouseEvent) => (e.preventDefault(), book(data)) })}>
              Записаться онлайн {extB ? <Out /> : <Arrow />}
            </a>
          </div>
        </div>

        {/* Эхо первого экрана: то же название и та же линия */}
        <div className="ct-mark">
          <span className="ct-mark-name">{s.name}</span>
          <span className="ct-mark-rule" aria-hidden />
          <a className="ct-up" href="#top" onClick={(e) => (e.preventDefault(), scrollToId('top'))}>
            Наверх
          </a>
        </div>

        <div className="ct-legal">
          <span>
            © {new Date().getFullYear()} {s.name}
            {s.city ? `, ${s.city}` : ''}
          </span>
          {s.demoNote && <span className="ct-demo">{s.demoNote}</span>}
          <a href="#/admin">Кабинет мастера</a>
        </div>
      </div>
    </footer>
  )
}

/** Кнопка «Записаться» внизу экрана на телефоне — когда первый экран уже прокручен, а до записи ещё далеко */
export function StickyCta({ data }: { data: Data }) {
  const [on, setOn] = useState(false)
  const extB = externalBooking(data.studio)
  useEffect(() => {
    const check = () => {
      if (window.innerWidth >= 1024) return setOn(false)
      const hero = document.querySelector('.hero-actions')
      const bk = document.getElementById('booking')
      if (!hero || !bk) return
      const vh = window.innerHeight
      const r = bk.getBoundingClientRect()
      const pastHero = hero.getBoundingClientRect().bottom < 0
      const nearBooking = r.top < vh && r.bottom > 0
      const atEnd = window.scrollY + vh > document.documentElement.scrollHeight - 360
      setOn(pastHero && !nearBooking && !atEnd && !document.querySelector('.lbx'))
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [])
  if (!data.services.length) return null
  return (
    <div className={`bookbar ${on ? 'is-on' : ''}`} aria-hidden={!on}>
      <div className="bookbar-text">
        <b>{data.studio.name}</b>
        <span>{extB ? 'Онлайн-запись' : 'Свободное время — онлайн'}</span>
      </div>
      {extB ? (
        <a className="cta" href={extB.url} {...ext} tabIndex={on ? 0 : -1}>
          Записаться <Out />
        </a>
      ) : (
        <button className="cta" onClick={() => book(data)} tabIndex={on ? 0 : -1}>
          Записаться
        </button>
      )}
    </div>
  )
}
