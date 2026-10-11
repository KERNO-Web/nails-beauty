import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Data } from '../data/types'
import { Arrow } from '../lib/icons'
import { dayHuman, fmtPrice, fmtTime, nearestSlot } from '../lib/slots'
import { Photo, scrollToId } from '../lib/ui'

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
    ['services', 'Услуги'],
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

/** Подгоняет кегль строки под ширину контейнера (масштабная «шапка журнала») */
function useFitText<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const el = ref.current
    const box = el?.parentElement
    if (!el || !box) return
    const fit = () => {
      const ratio = parseFloat(getComputedStyle(box).getPropertyValue('--fit')) || 1
      el.style.fontSize = '100px'
      const w = el.scrollWidth
      if (w) el.style.fontSize = `${(100 * box.clientWidth * ratio) / w}px`
    }
    fit()
    document.fonts?.ready.then(fit)
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [])
  return ref
}

/** Масштабная надпись отстаёт от прокрутки — лёгкая глубина, не больше 48px */
function useDrift<T extends HTMLElement>(k = 0.06, max = 48) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(0, ${Math.min(window.scrollY * k, max).toFixed(1)}px, 0)`
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => (cancelAnimationFrame(raf), window.removeEventListener('scroll', on))
  }, [k, max])
  return ref
}

export function Hero({ data }: { data: Data }) {
  const s = data.studio
  const near = nearestSlot(data)
  const index = data.services.filter((x) => x.category !== 'extra').slice(0, 5)
  const mast = useFitText<HTMLSpanElement>()
  const drift = useDrift<HTMLDivElement>()
  return (
    <section className="cover" id="top">
      <div className="wrap-wide cover-grid">
        <p className="cover-meta cover-in">
          <span>Выпуск 01</span>
          <span>{s.city}</span>
          <span>{new Date().getFullYear()}</span>
        </p>

        <div className="cover-mast" ref={drift} aria-hidden>
          <span ref={mast} className="cover-in">
            {s.name}
          </span>
        </div>

        <figure className="cover-photo cover-in d1">
          <div className="cover-frame">
            <Photo photo={s.heroPhoto} w={680} sizes="(min-width: 1024px) 40vw, 88vw" alt="Маникюр мастеров студии" fetchPriority="high" />
          </div>
          {near && (
            <figcaption>
              <a href="#booking" onClick={go('booking')}>
                Ближайшее окно — {dayHuman(near.iso, false)}, {fmtTime(near.time)}
              </a>
            </figcaption>
          )}
        </figure>

        <div className="cover-copy cover-in d2">
          <h1>Маникюр, на&nbsp;который легко записаться</h1>
          <p>Цены и свободное время видно сразу — без переписки.</p>
          <div className="cover-cta">
            <a className="btn btn-primary" href="#booking" onClick={go('booking')}>
              Записаться <Arrow size={16} className="arrow" />
            </a>
            <a className="cover-link" href="#works" onClick={go('works')}>
              Смотреть работы
            </a>
          </div>
        </div>

        {index.length > 1 && (
          <ol className="cover-index cover-in d2" aria-label="Услуги и цены">
            {index.map((x, i) => (
              <li key={x.id}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <span className="t">{x.title}</span>
                <span className="p">
                  {x.priceFrom ? 'от ' : ''}
                  {fmtPrice(x.price)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
