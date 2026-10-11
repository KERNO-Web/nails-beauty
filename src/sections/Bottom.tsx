import { useEffect, useState } from 'react'
import type { Data } from '../data/types'
import { Arrow, Phone, Telegram, VK, WhatsApp } from '../lib/icons'
import { dateOf, dayHuman, fmtTime, hoursSummary, monthPrep, nearestSlot } from '../lib/slots'
import { Avatar, scrollToId } from '../lib/ui'

export function Benefits() {
  const items = [
    { t: 'Свободное время видно сразу', d: 'Не нужно спрашивать «а когда есть окошко?» — все окна уже в расписании.' },
    { t: 'Цены перед глазами', d: 'У каждой услуги — стоимость и длительность. Без сюрпризов на кассе.' },
    { t: 'Запись в полночь — тоже запись', d: 'Выбираете время, когда удобно вам, а не когда мастер может ответить.' },
    { t: 'Пара минут вместо переписки', d: 'Услуга, время, имя и телефон. Больше ничего не спрашиваем.' },
    { t: 'Напомним накануне', d: 'Мастер напишет за день до визита — ничего не забудется.' },
  ]
  return (
    <section className="section benefits">
      <div className="wrap ben-wrap">
        <header className="sec-head">
          <p className="eyebrow reveal">Почему так удобнее</p>
          <h2 className="reveal d1">
            Записаться проще, <em>чем написать</em>
          </h2>
        </header>
        <ul className="ben-list">
          {items.map((it, i) => (
            <li key={i} className={`reveal d${i % 3}`}>
              <b>{it.t}</b>
              <span>{it.d}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Reviews({ data }: { data: Data }) {
  if (!data.reviews.length) return null
  return (
    <section className="section" id="reviews">
      <div className="wrap">
        <header className="sec-head split">
          <p className="eyebrow reveal">Отзывы</p>
          <h2 className="reveal d1">
            Что говорят <em>после</em> визита
          </h2>
          {data.studio.reviewsUrl && (
            <a className="link reveal d2" href={data.studio.reviewsUrl} target="_blank" rel="noreferrer">
              Все отзывы на картах <Arrow size={16} />
            </a>
          )}
        </header>
        <div className="reviews">
          {data.reviews.map((r, i) => (
            <article key={r.id} className={`review reveal d${i % 3}`}>
              <p>{r.text}</p>
              <footer>
                <Avatar name={r.name} size={40} />
                <span>
                  <b>{r.name}</b>
                  <small>
                    {r.service} · в {monthPrep(r.date)}
                    {dateOf(r.date).getFullYear() !== new Date().getFullYear() ? ` ${dateOf(r.date).getFullYear()}` : ''}
                  </small>
                </span>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Contacts({ data }: { data: Data }) {
  const s = data.studio
  const [lon, lat] = s.map
  const hours = hoursSummary(data)
  const mapSrc = `https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&z=16&pt=${lon}%2C${lat}%2Cpm2rdm`
  const routeUrl = `https://yandex.ru/maps/?rtext=~${lat}%2C${lon}&rtt=auto`
  return (
    <section className="section section-alt" id="contacts">
      <div className="wrap">
        <header className="sec-head">
          <p className="eyebrow reveal">Контакты</p>
          <h2 className="reveal d1">
            Ждём вас <em>в гости</em>
          </h2>
        </header>
        <div className="contacts">
          <div className="contact-card reveal">
            <div>
              <p className="contact-addr">{s.address}</p>
              <p className="contact-note">
                {s.city}. {s.addressNote}
              </p>
            </div>
            <dl className="hours" aria-label="Часы работы">
              {hours.map((h) => (
                <div key={h.days} className={h.text === 'выходной' ? 'off' : ''}>
                  <dt>{h.days}</dt>
                  <dd className="num">{h.text}</dd>
                </div>
              ))}
            </dl>
            <div className="socials">
              {s.telegram && (
                <a className="social" href={`https://t.me/${s.telegram}`} target="_blank" rel="noreferrer">
                  <Telegram /> Telegram
                </a>
              )}
              {s.whatsapp && (
                <a className="social" href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noreferrer">
                  <WhatsApp /> WhatsApp
                </a>
              )}
              {s.vk && (
                <a className="social" href={`https://vk.com/${s.vk}`} target="_blank" rel="noreferrer">
                  <VK /> ВКонтакте
                </a>
              )}
              {s.phone && (
                <a className="social" href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>
                  <Phone /> Позвонить
                </a>
              )}
            </div>
          </div>
          <div className="map reveal d1">
            <iframe src={mapSrc} title={`Карта: ${s.address}`} loading="lazy" allowFullScreen />
            <a className="btn btn-sm btn-primary map-link" href={routeUrl} target="_blank" rel="noreferrer">
              Построить маршрут
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Final({ data }: { data: Data }) {
  const near = nearestSlot(data)
  return (
    <section className="final">
      <div className="wrap">
        <h2 className="reveal">
          Красиво, понятно — <em>и уже в календаре</em>
        </h2>
        {near && (
          <p className="reveal d1">
            Ближайшее свободное окно — {dayHuman(near.iso)} в {fmtTime(near.time)}
          </p>
        )}
        <a className="btn btn-primary reveal d2" href="#booking" onClick={(e) => (e.preventDefault(), scrollToId('booking'))}>
          Записаться онлайн <Arrow />
        </a>
      </div>
    </section>
  )
}

export function Footer({ data }: { data: Data }) {
  return (
    <footer className="footer">
      <div className="wrap">
        <span>
          © {new Date().getFullYear()} {data.studio.name} {data.studio.kind}, {data.studio.city}
        </span>
        <a href="#/admin">Кабинет мастера</a>
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
