import { useEffect, useState } from 'react'
import type { Data } from '../data/types'
import { Arrow } from '../lib/icons'
import { dayHuman, fmtPrice, fmtTime, nearestSlot } from '../lib/slots'
import { Photo, scrollToId } from '../lib/ui'

export function Header({ data }: { data: Data }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const s = data.studio
  return (
    <header className={`header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="wrap">
        <a className="brand" href="#top" aria-label={`${s.name} — на главную`}>
          {s.logo ? <img src={s.logo} alt="" /> : <span className="brand-name">{s.name}</span>}
          <span className="brand-kind">{s.kind}</span>
        </a>
        <nav className="nav" aria-label="Разделы">
          <a href="#services">Услуги и цены</a>
          <a href="#works">Работы</a>
          {data.masters.length > 1 && <a href="#masters">Мастера</a>}
          <a href="#contacts">Контакты</a>
        </nav>
        <a className="btn btn-primary btn-sm" href="#booking" onClick={(e) => (e.preventDefault(), scrollToId('booking'))}>
          Записаться
        </a>
      </div>
    </header>
  )
}

export function Hero({ data }: { data: Data }) {
  const s = data.studio
  const near = nearestSlot(data)
  const minPrice = Math.min(...data.services.filter((x) => x.category !== 'extra').map((x) => x.price))
  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        <div className="hero-text">
          <p className="eyebrow reveal">
            {s.city}, {s.address.split(',').slice(0, 2).join(',')}
          </p>
          <h1 className="reveal d1">
            Маникюр, <span className="nobr">на&nbsp;который</span> <em>легко записаться</em>
          </h1>
          <p className="lead reveal d2">Услуги, цены и свободное время — на одной странице. Выберите окно и запишитесь сами, без переписки и ожидания ответа.</p>
          <div className="hero-cta reveal d3">
            <a className="btn btn-primary" href="#booking" onClick={(e) => (e.preventDefault(), scrollToId('booking'))}>
              Записаться
            </a>
            <a className="btn btn-soft" href="#works" onClick={(e) => (e.preventDefault(), scrollToId('works'))}>
              Посмотреть работы
            </a>
          </div>
        </div>
        <div className="hero-media reveal d1">
          <div className="hero-photo">
            <Photo photo={s.heroPhoto} w={760} sizes="(min-width: 900px) 46vw, 100vw" alt="Маникюр мастеров студии" fetchPriority="high" />
          </div>
          <div className="hero-photo-2">
            <Photo photo={s.heroPhoto2} w={300} alt="" loading="lazy" />
          </div>
          {near && (
            <a className="hero-slot" href="#booking" onClick={(e) => (e.preventDefault(), scrollToId('booking'))}>
              <span className="live-dot" aria-hidden />
              <span>
                <small>Ближайшее свободное окно</small>
                <b>
                  {dayHuman(near.iso)}, {fmtTime(near.time)}
                </b>
              </span>
              <Arrow size={16} />
            </a>
          )}
        </div>
        <ul className="hero-facts reveal d3">
            <li>
              <b>от {fmtPrice(minPrice)}</b>цены на сайте
            </li>
            <li>
              <b>{data.masters.length > 1 ? `${data.masters.length} мастера` : 'Без спешки'}</b>
              {data.masters.length > 1 ? 'можно выбрать' : 'один клиент за раз'}
            </li>
            <li>
              <b>24/7</b>
              запись онлайн, даже ночью
            </li>
          </ul>
      </div>
    </section>
  )
}
