// Отзывы, контакты и плавающая кнопка записи на телефоне
import { useEffect, useMemo, useState } from 'react'
import type { Data } from '../data/types'
import { Phone, Telegram, VK, WhatsApp } from '../lib/icons'
import { fmtRating, reviewsCount, reviewsSource, routeUrl } from '../lib/place'
import { dateOf, fmtTime, hoursSummary } from '../lib/slots'
import { typo } from '../lib/ui'
import { book, bookingRoute, dayShort, mainService, nextWindows, Out, telHref, useEnter } from './common'

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

export function Reviews({ data }: { data: Data }) {
  const ref = useEnter<HTMLDivElement>()
  const src = reviewsSource(data.studio)
  const list = [...data.reviews].sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || b.date.localeCompare(a.date))
  if (!list.length && !src) return null
  const demo = list.some((r) => r.demo)
  return (
    <section className="sec rev" id="reviews" aria-labelledby="rev-h">
      <div className="wrap" ref={ref}>
        <div className="rev-head rise">
          <h2 className="h2" id="rev-h">
            Отзывы
          </h2>
          {src && (
            <a className="rev-src" href={src.url} target="_blank" rel="noreferrer">
              {src.rating ? <b className="num">{fmtRating(src.rating)}</b> : null}
              <span>
                {src.count ? reviewsCount(src.count) : 'Все отзывы'} на&nbsp;{src.name} <Out />
              </span>
            </a>
          )}
        </div>
        {list.length > 0 && (
          <ul className="rev-list rise">
            {list.map((r) => {
              const d = dateOf(r.date)
              return (
                <li key={r.id} className="rev-card">
                  <blockquote>{typo(r.text)}</blockquote>
                  <p className="rev-by">
                    <b>{r.name}</b>
                    <span>
                      {r.service}, {d.getDate()} {MONTHS_GEN[d.getMonth()]}
                      {r.source ? `, ${r.source}` : ''}
                    </span>
                    {r.demo && <em>пример</em>}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
        {demo && <p className="rev-fine">Отзывы с пометкой «пример» показывают, как будет выглядеть блок. У настоящей студии здесь её отзывы с карт.</p>}
      </div>
    </section>
  )
}

export function Contact({ data }: { data: Data }) {
  const s = data.studio
  const ref = useEnter<HTMLDivElement>()
  const hours = hoursSummary(data)
  const links = [
    s.telegram && { href: `https://t.me/${s.telegram.replace(/^@/, '')}`, label: 'Telegram', icon: <Telegram /> },
    s.whatsapp && { href: `https://wa.me/${s.whatsapp.replace(/\D/g, '')}`, label: 'WhatsApp', icon: <WhatsApp /> },
    s.vk && { href: `https://vk.com/${s.vk}`, label: 'ВКонтакте', icon: <VK /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[]
  return (
    <footer className="ft" id="contacts" aria-labelledby="ft-h">
      <div className="wrap" ref={ref}>
        <h2 className="sr-only" id="ft-h">
          Контакты
        </h2>
        <div className="ft-grid">
          <div className="ft-main rise">
            {s.city && <p className="ft-city">{s.city}</p>}
            <p className="ft-addr">{s.address || s.name}</p>
            {s.addressNote && <p className="ft-note">{typo(s.addressNote)}</p>}
            <div className="ft-actions">
              {s.address && (
                <a className="btn is-ink" href={routeUrl(s)} target="_blank" rel="noreferrer">
                  Построить маршрут
                </a>
              )}
              {s.phone && (
                <a className="btn is-line" href={telHref(s.phone)}>
                  <Phone size={18} /> <span className="num">{s.phone}</span>
                </a>
              )}
            </div>
          </div>
          <div className="ft-side rise">
            {data.masters.length > 0 && (
              <dl className="ft-hours">
                {hours.map((h) => (
                  <div key={h.days}>
                    <dt>{h.days}</dt>
                    <dd className={`num ${h.text === 'выходной' ? 'is-off' : ''}`}>{h.text}</dd>
                  </div>
                ))}
              </dl>
            )}
            {links.length > 0 && (
              <ul className="ft-links">
                {links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} target="_blank" rel="noreferrer">
                      {l.icon}
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="ft-base">
          <p className="ft-name">{s.name}</p>
          {s.demoNote && <p className="ft-demo">{s.demoNote}</p>}
        </div>
      </div>
    </footer>
  )
}

/** Телефон: после первого экрана внизу плашка с ближайшим окном. В блоке записи и в подвале прячется */
export function StickyBar({ data }: { data: Data }) {
  const [on, setOn] = useState(false)
  const route = bookingRoute(data.studio)
  const main = mainService(data)
  const first = useMemo(() => (route.kind === 'native' && main && data.masters.length ? nextWindows(data, main.id, 1)[0] : undefined), [data, main?.id, route.kind])
  useEffect(() => {
    const hero = document.querySelector('.hero')
    const hide = ['booking', 'contacts'].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (!hero) return
    const state = { pastHero: false, hidden: new Set<Element>() }
    const apply = () => setOn(state.pastHero && state.hidden.size === 0)
    const io1 = new IntersectionObserver(([e]) => ((state.pastHero = !e.isIntersecting && e.boundingClientRect.top < 0), apply()))
    io1.observe(hero)
    const io2 = new IntersectionObserver((es) => {
      for (const e of es) e.isIntersecting ? state.hidden.add(e.target) : state.hidden.delete(e.target)
      apply()
    })
    hide.forEach((el) => io2.observe(el))
    return () => (io1.disconnect(), io2.disconnect())
  }, [])
  return (
    <div className={`sticky ${on ? 'is-on' : ''}`} aria-hidden={!on}>
      <p>
        {first ? (
          <>
            <small>Ближайшее окно</small>
            <b className="num">
              {dayShort(first.iso)}, {fmtTime(first.time)}
            </b>
          </>
        ) : (
          <b>{data.studio.name}</b>
        )}
      </p>
      <button className="btn is-accent" tabIndex={on ? 0 : -1} onClick={() => book(data, first && main ? { serviceId: main.id, date: first.iso, time: first.time } : {})}>
        Записаться
      </button>
    </div>
  )
}
