// Отзывы (цитата + честные цифры студии), контакты и подвал, плавающая кнопка записи на телефоне
import { useEffect, useState } from 'react'
import type { Data, Review } from '../data/types'
import { fmtRating, reviewsCount, reviewsSource, routeUrl } from '../lib/place'
import { dateOf, hoursSummary, MONTHS_NOM, plural } from '../lib/slots'
import { scrollToId, typo } from '../lib/ui'
import { Arrow, book, bookingRoute, bookLink, Chevron, Out, Pin, useEnter } from './common'

function reviewDate(iso: string) {
  const d = dateOf(iso)
  return `${MONTHS_NOM[d.getMonth()].toLowerCase()} ${d.getFullYear()}`
}

/** Отмеченный featured первым, дальше — свежие */
function order(list: Review[]) {
  const byDate = [...list].sort((a, b) => b.date.localeCompare(a.date))
  const lead = byDate.find((r) => r.featured) ?? byDate[0]
  return [lead, ...byDate.filter((r) => r !== lead)]
}

export function Reviews({ data }: { data: Data }) {
  const [i, setI] = useState(0)
  const ref = useEnter<HTMLDivElement>()
  const src = reviewsSource(data.studio)
  if (!data.reviews.length && !src) return null
  const list = data.reviews.length ? order(data.reviews) : []
  const r = list[i % Math.max(1, list.length)]
  const allDemo = list.length > 0 && list.every((x) => x.demo)
  // Цифры — только из данных студии: рейтинг и количество на картах, если указаны со ссылкой; остальное — что есть на сайте
  const stats = [
    src?.rating ? { n: fmtRating(src.rating), t: `оценка в ${src.name}${src.count ? `, ${reviewsCount(src.count)}` : ''}`, href: src.url } : null,
    data.works.length ? { n: String(data.works.length), t: `${plural(data.works.length, 'работа', 'работы', 'работ')} в портфолио` } : null,
    data.masters.length ? { n: String(data.masters.length), t: plural(data.masters.length, 'мастер', 'мастера', 'мастеров') } : null,
    data.services.length ? { n: String(data.services.length), t: `${plural(data.services.length, 'услуга', 'услуги', 'услуг')} с ценами на сайте` } : null,
  ].filter(Boolean).slice(0, 3) as { n: string; t: string; href?: string }[]
  return (
    <section className="rv" id="reviews" aria-labelledby="rv-h">
      <div className="wrap rv-in" ref={ref}>
        <div className="rv-main">
          <p className="tag rise">Отзывы</p>
          <h2 className="sr-only" id="rv-h">
            Отзывы
          </h2>
          {r ? (
            <figure className="rv-quote rise" key={r.id}>
              <blockquote>
                <p>{typo(r.text.replace(/«/g, '„').replace(/»/g, '“'))}</p>
              </blockquote>
              <figcaption>
                <span className="rv-avatar" aria-hidden>
                  {r.name.charAt(0)}
                </span>
                <span>
                  <b>{r.name}</b>
                  <span>
                    {[r.service, reviewDate(r.date)].filter(Boolean).join(' · ')}
                    {r.source && (
                      <>
                        {' · '}
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer">
                            {r.source}
                          </a>
                        ) : (
                          r.source
                        )}
                      </>
                    )}
                  </span>
                </span>
              </figcaption>
            </figure>
          ) : (
            <p className="d-md rise">Отзывы клиентов&nbsp;— в&nbsp;{src!.name}</p>
          )}
          <div className="rv-nav rise">
            {list.length > 1 && (
              <>
                <button onClick={() => setI((i - 1 + list.length) % list.length)} aria-label="Предыдущий отзыв">
                  <Chevron dir="left" />
                </button>
                <span className="num" aria-live="polite">
                  {(i % list.length) + 1} / {list.length}
                </span>
                <button onClick={() => setI((i + 1) % list.length)} aria-label="Следующий отзыв">
                  <Chevron />
                </button>
              </>
            )}
            {src && (
              <a className="u-link rv-src" href={src.url} target="_blank" rel="noreferrer">
                Все отзывы в&nbsp;{src.name} <Out size={13} />
              </a>
            )}
          </div>
          {allDemo && <p className="rv-demo rise">Примеры отзывов для демонстрации сайта: студия и&nbsp;клиенты вымышлены.</p>}
        </div>
        {stats.length > 0 && (
          <ul className="rv-stats">
            {stats.map((x) => (
              <li key={x.t} className="rise">
                <b className="num">{x.n}</b>
                {x.href ? (
                  <a href={x.href} target="_blank" rel="noreferrer">
                    {x.t}
                  </a>
                ) : (
                  <span>{x.t}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export function Contact({ data }: { data: Data }) {
  const s = data.studio
  const ref = useEnter<HTMLDivElement>()
  const hours = data.masters.length ? hoursSummary(data) : []
  const native = bookingRoute(s).kind === 'native'
  const hasMap = s.map[0] !== 0 || !!s.routeUrl
  const links = [
    s.telegram && { href: `https://t.me/${s.telegram.replace(/^@/, '')}`, label: 'Telegram' },
    s.whatsapp && { href: `https://wa.me/${s.whatsapp.replace(/\D/g, '')}`, label: 'WhatsApp' },
    s.vk && { href: /^https?:/.test(s.vk) ? s.vk : `https://vk.com/${s.vk}`, label: 'ВКонтакте' },
  ].filter(Boolean) as { href: string; label: string }[]
  return (
    <footer className="ct" id="contacts" aria-labelledby="ct-h">
      <div className="wrap" ref={ref}>
        <div className="sec-head">
          <p className="tag rise">Контакты</p>
          <h2 className="d-lg rise" id="ct-h">
            Как нас найти
          </h2>
        </div>
        <div className="ct-grid">
          <div className="ct-card rise">
            {s.address && (
              <div className="ct-addr">
                <Pin size={22} />
                <div>
                  <p className="ct-addr-v">{s.address}</p>
                  <p className="small">{[s.city, s.addressNote].filter(Boolean).join('. ')}</p>
                </div>
              </div>
            )}
            <div className="ct-btns">
              {hasMap && (
                <a className="btn-a" href={routeUrl(s)} target="_blank" rel="noreferrer">
                  Построить маршрут <Out />
                </a>
              )}
              {s.phone && (
                <a className="btn-a is-line num" href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>
                  {s.phone}
                </a>
              )}
            </div>
            {links.length > 0 && (
              <div className="ct-links">
                <span className="small">Написать:</span>
                {links.map((l) => (
                  <a key={l.href} className="chip-a" href={l.href} target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {hours.length > 0 && (
            <div className="ct-hours rise">
              <p className="ct-h3">Часы работы</p>
              <dl>
                {hours.map((h) => (
                  <div key={h.days} className={h.text === 'выходной' ? 'is-off' : ''}>
                    <dt>{h.days}</dt>
                    <dd className="num">{h.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="ct-book rise">
            <p className="d-sm">{native ? 'Свободное время видно сразу' : 'Запись — за минуту'}</p>
            <p className="ct-book-t">{native ? 'Выберите услугу, мастера и окно — без звонков и ожидания ответа.' : `Запись ${bookingRoute(s).kind === 'link' ? (bookingRoute(s) as { via: string }).via : ''}.`}</p>
            <a className="btn-a is-light" {...bookLink(data)}>
              Записаться {native ? <Arrow /> : <Out />}
            </a>
          </div>
        </div>

        <div className="ft">
          <a className="ft-brand" href="#top" onClick={(e) => (e.preventDefault(), scrollToId('top'))}>
            {s.name}
          </a>
          <p className="ft-meta">
            © {new Date().getFullYear()} {s.name}
            {s.city ? `, ${s.city}` : ''}
            {s.demoNote && <span>{s.demoNote}</span>}
          </p>
          <a className="ft-admin" href="#/admin">
            Кабинет мастера
          </a>
        </div>
      </div>
    </footer>
  )
}

/** Плавающая кнопка на телефоне: первый экран прокручен, а до записи ещё далеко */
export function StickyCta({ data }: { data: Data }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const check = () => {
      if (window.innerWidth >= 1024) return setOn(false)
      const hero = document.querySelector('.hero-cta')
      const bk = document.getElementById('booking')
      if (!hero || !bk) return
      const vh = window.innerHeight
      const r = bk.getBoundingClientRect()
      const past = hero.getBoundingClientRect().bottom < 0
      const near = r.top < vh && r.bottom > 0
      const end = window.scrollY + vh > document.documentElement.scrollHeight - 320
      setOn(past && !near && !end && !document.querySelector('.lb'))
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => (window.removeEventListener('scroll', check), window.removeEventListener('resize', check))
  }, [])
  if (!data.services.length) return null
  const route = bookingRoute(data.studio)
  return (
    <div className={`bookbar ${on ? 'is-on' : ''}`} aria-hidden={!on}>
      <div className="bookbar-t">
        <b>{data.studio.name}</b>
        <span>{route.kind === 'native' ? 'Свободное время — онлайн' : `Запись ${route.via}`}</span>
      </div>
      <button className="btn-a" onClick={() => book(data)} tabIndex={on ? 0 : -1}>
        Записаться
      </button>
    </div>
  )
}
