import { useEffect, useState } from 'react'
import type { Data } from '../data/types'
import { Arrow } from '../lib/icons'
import { fmtPrice } from '../lib/slots'
import { Photo, scrollToId, Spine } from '../lib/ui'

const go = (id: string) => (e: React.MouseEvent) => (e.preventDefault(), scrollToId(id))

export function Header({ data }: { data: Data }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
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
  const links: [string, string][] = [
    ['services', 'Услуги и цены'],
    ['works', 'Работы'],
    ...(data.masters.length > 1 ? ([['masters', 'Мастера']] as [string, string][]) : []),
    ['contacts', 'Контакты'],
  ]
  const nav = (id: string) => (e: React.MouseEvent) => (setOpen(false), go(id)(e))
  return (
    <header className={`header ${scrolled || open ? 'is-scrolled' : ''}`}>
      <div className="wrap-wide header-row">
        <a className="brand" href="#top" aria-label={`${s.name} — на главную`}>
          {s.logo ? <img src={s.logo} alt="" /> : <span className="brand-name">{s.name}</span>}
        </a>
        <nav className="nav" aria-label="Разделы">
          {links.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <a className="btn btn-primary header-cta" href="#booking" onClick={go('booking')}>
          Записаться
        </a>
        <button className="menu-btn" aria-expanded={open} aria-controls="menu" onClick={() => setOpen((v) => !v)}>
          {open ? 'Закрыть' : 'Меню'}
        </button>
      </div>
      <div id="menu" className="menu" hidden={!open}>
        <nav className="wrap-wide" aria-label="Разделы">
          {links.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={nav(id)}>
              {label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}

export function Hero({ data }: { data: Data }) {
  const s = data.studio
  const main = data.services.filter((x) => x.category !== 'extra')
  const minPrice = main.length ? Math.min(...main.map((x) => x.price)) : 0
  // Короткий список направлений для подписи к фото — из реальных услуг
  const word = (cat: string) => [...new Set(main.filter((x) => x.category === cat).map((x) => x.title.split(' ')[0].toLowerCase()))]
  const kinds = [...word('hands').slice(0, 2), ...word('feet').slice(0, 1)].join(' · ')

  return (
    <section className="hero" id="top">
      <div className="wrap-wide hero-grid">
        <Spine n={1} title={s.name} note={`${s.kind}, ${s.city}`} />
        <div className="hero-text">
          <h1>
            Маникюр,
            <br />
            на&nbsp;который
            <br />
            легко
            <br />
            записаться
          </h1>
          <p className="hero-lead">Услуги, цены и&nbsp;свободное время&nbsp;— на&nbsp;одной странице. Без переписки и&nbsp;ожидания ответа.</p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="#booking" onClick={go('booking')}>
              Выбрать время <Arrow size={16} className="arrow" />
            </a>
            <a className="text-link" href="#works" onClick={go('works')}>
              Посмотреть работы
            </a>
          </div>
        </div>
        <figure className="hero-photo">
          <div className="frame">
            <Photo photo={s.heroPhoto} w={1100} sizes="(min-width: 1024px) 56vw, 100vw" alt="Нюдовое покрытие, короткий овал" fetchPriority="high" />
          </div>
          {minPrice > 0 && (
            <figcaption className="tag">
              <span>{kinds}</span>
              <b>от {fmtPrice(minPrice)}</b>
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  )
}
