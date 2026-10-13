import { useEffect, useState } from 'react'
import type { Data } from '../data/types'
import { scrollToId } from '../lib/ui'

const go = (id: string) => (e: React.MouseEvent) => (e.preventDefault(), scrollToId(id))

export function Header({ data }: { data: Data }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    // Шапка прозрачная, пока под ней цветное поле первого экрана
    const on = () => {
      // Над тёмным первым экраном шапка прозрачная до его конца, над светлым — плотная сразу после начала прокрутки
      const field = document.querySelector<HTMLElement>('[data-hero="dark"]')
      // на телефоне в тёмный экран входит светлое фото рук — белая шапка над ним терялась, поэтому плотная сразу
      setScrolled(field && window.innerWidth >= 760 ? field.getBoundingClientRect().bottom < 56 : window.scrollY > 8)
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
