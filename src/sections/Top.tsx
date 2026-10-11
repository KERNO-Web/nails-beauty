import { useEffect, useRef, useState } from 'react'
import type { Data, Work } from '../data/types'
import { Arrow } from '../lib/icons'
import { dayHuman, fmtPrice, fmtTime, nearestSlot } from '../lib/slots'
import { Photo, scrollToId, typo } from '../lib/ui'

const go = (id: string) => (e: React.MouseEvent) => (e.preventDefault(), scrollToId(id))

export function Header({ data }: { data: Data }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    // Шапка прозрачная, пока под ней цветное поле первого экрана
    const on = () => {
      const field = document.querySelector('.hero-field')
      setScrolled(field ? field.getBoundingClientRect().bottom < 56 : window.scrollY > 8)
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => (window.removeEventListener('scroll', on), window.removeEventListener('resize', on))
  }, [])
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])
  const s = data.studio
  const links: [string, string][] = [
    ['services', 'Цены'],
    ['works', 'Работы'],
    ...(data.masters.length ? ([['masters', data.masters.length > 1 ? 'Мастера' : 'Мастер']] as [string, string][]) : []),
    ['contacts', 'Контакты'],
  ]
  const nav = (id: string) => (e: React.MouseEvent) => (setOpen(false), go(id)(e))
  return (
    <header className={`header ${scrolled || open ? 'is-solid' : ''}`}>
      <div className="wrap-wide header-row">
        <a className="brand" href="#top" aria-label={`${s.name} — на главную`}>
          {s.logo ? <img src={s.logo} alt="" /> : <span className="brand-name">{s.name}</span>}
        </a>
        <nav className="nav" aria-label="Разделы">
          {links.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={go(id)}>
              {label}
            </a>
          ))}
        </nav>
        <a className="btn btn-sm header-cta" href="#booking" onClick={go('booking')}>
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

/** Высоты «пальцев» от самого длинного: по краям короче, в центре — главный снимок */
const FINGERS: Record<number, number[]> = {
  1: [1],
  2: [0.86, 1],
  3: [0.8, 1, 0.86],
  4: [0.74, 1, 0.9, 0.66],
  5: [0.62, 0.88, 1, 0.9, 0.66],
}
/** Насколько сильно каждый ноготь «отрастает» при прокрутке */
const GROW = [0.1, 0.17, 0.24, 0.15, 0.07]

/** Снимки для первого экрана: главный — в центр, остальные — лучшие работы вокруг него */
export function heroNails(data: Data, max = 5): { photo: string; alt: string; focus?: string }[] {
  const lead = data.studio.heroPhoto
  const ranked = [...data.works.filter((w) => w.featured), ...data.works.filter((w) => !w.featured)].filter((w) => w.photo !== lead)
  const pick: Pick<Work, 'photo' | 'title' | 'focus'>[] = ranked.slice(0, lead ? max - 1 : max)
  const items = pick.map((w) => ({ photo: w.photo, alt: w.title, focus: w.focus }))
  if (!lead) return items
  const center = Math.floor(Math.min(items.length + 1, max) / 2)
  items.splice(center, 0, { photo: lead, alt: 'Работа студии', focus: undefined })
  return items
}

export function Hero({ data }: { data: Data }) {
  const s = data.studio
  const nails = heroNails(data)
  const heights = FINGERS[nails.length] ?? FINGERS[5]
  const main = data.services.filter((x) => x.category !== 'extra')
  const minPrice = main.length ? Math.min(...main.map((x) => x.price)) : 0
  const near = nearestSlot(data)
  const title = s.heroTitle.trim() || 'Маникюр и\u00a0педикюр'
  const hand = useRef<HTMLDivElement>(null)

  // Блик топа идёт за курсором; прокрутка «наращивает» ногти — каждый со своей скоростью
  useEffect(() => {
    const el = hand.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight)
        el.style.setProperty('--scroll', String(y))
      })
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--gx', ((e.clientX - r.left) / r.width).toFixed(3))
      el.classList.add('is-tracking')
    }
    const onLeave = () => el.classList.remove('is-tracking')
    const field = el.closest('.hero-field') as HTMLElement | null
    if (!reduce) window.addEventListener('scroll', onScroll, { passive: true })
    field?.addEventListener('pointermove', onMove)
    field?.addEventListener('pointerleave', onLeave)
    onScroll()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      field?.removeEventListener('pointermove', onMove)
      field?.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <section className="hero" id="top">
      <div className="hero-field">
        <div className="wrap-wide hero-grid">
          <div className="hero-copy">
            <p className="hero-kicker">
              {s.kind} · {s.city}
            </p>
            <h1>{typo(title)}</h1>
            {s.heroLead && <p className="hero-lead">{typo(s.heroLead)}</p>}
          </div>
          <div className={`hand n${nails.length}`} ref={hand} aria-hidden={!nails.length}>
            {nails.map((n, i) => (
              <a
                key={n.photo + i}
                className="nail"
                href="#works"
                onClick={go('works')}
                style={{ '--h': heights[i], '--i': i, '--grow': GROW[i] ?? 0.12 } as React.CSSProperties}
                aria-label={`${n.alt} — смотреть работы`}
              >
                <Photo photo={n.photo} w={i === Math.floor(nails.length / 2) ? 520 : 360} sizes="(min-width: 900px) 12vw, 22vw" alt={n.alt} style={{ objectPosition: n.focus }} fetchPriority={i === Math.floor(nails.length / 2) ? 'high' : undefined} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="hero-base">
        <div className="wrap-wide hero-base-row">
          <dl className="hero-facts">
            {minPrice > 0 && (
              <div>
                <dt>Цены</dt>
                <dd>от {fmtPrice(minPrice)}</dd>
              </div>
            )}
            {near && (
              <div>
                <dt>Ближайшее окно</dt>
                <dd>
                  {dayHuman(near.iso)}, {fmtTime(near.time)}
                </dd>
              </div>
            )}
            <div className="hero-fact-addr">
              <dt>Адрес</dt>
              <dd>{s.address}</dd>
            </div>
          </dl>
          <div className="hero-cta">
            <a className="btn btn-accent" href="#booking" onClick={go('booking')}>
              Выбрать время <Arrow size={16} className="arrow" />
            </a>
            <a className="text-link" href="#services" onClick={go('services')}>
              Все цены
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
