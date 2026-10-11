import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Data } from '../data/types'
import { Arrow } from '../lib/icons'
import { dayHuman, fmtPrice, fmtTime, nearestSlot } from '../lib/slots'
import { Photo, scrollToId } from '../lib/ui'

const go = (id: string) => (e: React.MouseEvent) => (e.preventDefault(), scrollToId(id))

export function Header({ data }: { data: Data }) {
  const [scrolled, setScrolled] = useState(false)
  const [top, setTop] = useState(true)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    // Пока виден первый экран, имя студии стоит на фото — в шапке его не дублируем
    const on = () => (setScrolled(window.scrollY > 8), setTop(window.scrollY < 160))
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
    ['services', 'Услуги'],
    ['works', 'Работы'],
    ...(data.masters.length > 1 ? ([['masters', 'Мастера']] as [string, string][]) : []),
    ['contacts', 'Контакты'],
  ]
  const nav = (id: string) => (e: React.MouseEvent) => (setOpen(false), go(id)(e))
  return (
    <header className={`header ${scrolled || open ? 'is-scrolled' : ''} ${top && !open ? 'at-top' : ''}`}>
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
        <a className="btn btn-primary btn-sm header-cta" href="#booking" onClick={go('booking')}>
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
          <a className="btn btn-primary" href="#booking" onClick={nav('booking')}>
            Записаться <Arrow size={16} className="arrow" />
          </a>
        </nav>
      </div>
    </header>
  )
}

/** Фото внутри кадра чуть сдвигается при прокрутке — единственный «эффект» страницы */
export function useCropDrift<T extends HTMLElement>(range = 36) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.parentElement!.getBoundingClientRect()
        const vh = window.innerHeight
        if (r.bottom < 0 || r.top > vh) return
        const k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh))
        el.style.transform = `translate3d(0, ${(k * range).toFixed(1)}px, 0) scale(1.08)`
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => (cancelAnimationFrame(raf), window.removeEventListener('scroll', on), window.removeEventListener('resize', on))
  }, [range])
  return ref
}

export function Hero({ data }: { data: Data }) {
  const s = data.studio
  const near = nearestSlot(data)
  const prices = data.services.filter((x) => x.category !== 'extra').map((x) => x.price)
  const minPrice = prices.length ? Math.min(...prices) : 0
  const hero = useRef<HTMLElement>(null)
  const tail = useRef<HTMLSpanElement>(null)
  const media = useCropDrift<HTMLDivElement>(28)

  // Фото начинается там, где кончается последняя строка заголовка: строка уходит под край снимка
  useLayoutEffect(() => {
    const el = hero.current
    const t = tail.current
    if (!el || !t) return
    const fit = () => {
      const x = t.getBoundingClientRect().right - el.getBoundingClientRect().left
      el.style.setProperty('--tuck', `${Math.round(x)}px`)
    }
    fit()
    document.fonts?.ready.then(fit)
    document.fonts?.addEventListener('loadingdone', fit)
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    if (t.parentElement) ro.observe(t.parentElement)
    return () => (ro.disconnect(), document.fonts?.removeEventListener('loadingdone', fit))
  }, [])

  const meta = [minPrice ? `от ${fmtPrice(minPrice)}` : '', near ? `ближайшее окно — ${dayHuman(near.iso, false)}, ${fmtTime(near.time)}` : '', s.address.split(',').slice(0, 2).join(',')].filter(Boolean)

  return (
    <section className="hero" id="top" ref={hero}>
      <p className="hero-mark hero-in" aria-hidden>
        {s.name}
      </p>
      <div className="hero-photo hero-in">
        <div className="hero-media" ref={media}>
          <Photo photo={s.heroPhoto} w={900} sizes="(min-width: 1024px) 62vw, 100vw" alt="Работа студии: длинный миндаль, ультрамарин с прозрачным кончиком" fetchPriority="high" />
        </div>
      </div>
      <div className="hero-text">
        <h1 className="hero-in d1">
          Выберите
          <br />
          маникюр
          <br />
          глазами&nbsp;—
          <br />
          <span ref={tail}>и&nbsp;сразу время.</span>
        </h1>
        <p className="hero-lead hero-in d2">Цены, работы и&nbsp;свободные окна&nbsp;— на&nbsp;одной странице. Без переписки в&nbsp;директе.</p>
        <div className="hero-cta hero-in d2">
          <a className="btn btn-primary" href="#booking" onClick={go('booking')}>
            Записаться <Arrow size={16} className="arrow" />
          </a>
          <a className="text-link" href="#works" onClick={go('works')}>
            Смотреть работы
          </a>
        </div>
        <p className="hero-meta hero-in d2">{meta.join(' · ')}</p>
      </div>
    </section>
  )
}
