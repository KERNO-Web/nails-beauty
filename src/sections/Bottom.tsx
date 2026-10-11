import { useEffect, useState } from 'react'
import type { Data } from '../data/types'
import { Arrow } from '../lib/icons'
import { dateOf, dayHuman, fmtTime, hoursSummary, monthPrep, nearestSlot } from '../lib/slots'
import { scrollToId, typo } from '../lib/ui'

export function Reviews({ data }: { data: Data }) {
  if (!data.reviews.length) return null
  return (
    <section className="reviews-sec" id="reviews">
      <div className="wrap-wide">
        <header className="rev-head">
          <p className="label reveal">Отзывы</p>
          {data.studio.reviewsUrl && (
            <a className="text-link reveal" href={data.studio.reviewsUrl} target="_blank" rel="noreferrer">
              Все отзывы на картах <Arrow size={14} />
            </a>
          )}
        </header>
        <div className="reviews">
          {data.reviews.map((r) => (
            <figure key={r.id} className="review reveal">
              <blockquote>{typo(r.text)}</blockquote>
              <figcaption>
                <b>{r.name}</b> · {r.service}, в&nbsp;{monthPrep(r.date)}
                {dateOf(r.date).getFullYear() !== new Date().getFullYear() ? ` ${dateOf(r.date).getFullYear()}` : ''}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Финал: контакты, карта и большое имя студии */
export function Closing({ data }: { data: Data }) {
  const s = data.studio
  const [lon, lat] = s.map
  const hours = hoursSummary(data)
  const near = nearestSlot(data)
  const mapSrc = `https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&z=16&pt=${lon}%2C${lat}%2Cpm2rdm`
  const routeUrl = `https://yandex.ru/maps/?rtext=~${lat}%2C${lon}&rtt=auto`
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
            <a className="text-link" href={routeUrl} target="_blank" rel="noreferrer">
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
