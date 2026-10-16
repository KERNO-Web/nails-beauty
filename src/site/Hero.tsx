// Шапка и первый экран. Главное на экране: ближайшее свободное окно крупными цифрами.
// Не «красивое фото с лозунгом», а ответ на вопрос «когда я могу прийти».
import { useEffect, useMemo, useState } from 'react'
import type { Data } from '../data/types'
import { reviewsCount, fmtRating, reviewsSource, routeUrl } from '../lib/place'
import { fmtTime, hoursOf, plural, todayIso } from '../lib/slots'
import { Photo, scrollToId, typo } from '../lib/ui'
import { book, bookingRoute, dayPhrase, dayShort, mainService, nextWindows, serviceWord, telHref } from './common'

const NAV = [
  { id: 'services', label: 'Услуги' },
  { id: 'works', label: 'Работы' },
  { id: 'masters', label: 'Мастера' },
  { id: 'contacts', label: 'Контакты' },
]

export function Header({ data }: { data: Data }) {
  const s = data.studio
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const sentinel = document.getElementById('top-sentinel')
    if (!sentinel) return
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting))
    io.observe(sentinel)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => void (document.body.style.overflow = '')
  }, [open])
  const go = (id: string) => {
    setOpen(false)
    scrollToId(id)
  }
  const navs = NAV.filter((n) => (n.id === 'works' ? data.works.length : n.id === 'masters' ? data.masters.length : n.id === 'services' ? data.services.length : true))
  return (
    <header className={`hd ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="wrap hd-row">
        <a className={`hd-brand ${s.name.length > 16 ? 'is-long' : ''}`} href="#" onClick={(e) => (e.preventDefault(), window.scrollTo({ top: 0, behavior: 'smooth' }))}>
          {s.logo ? <img src={s.logo} alt={s.name} /> : <span>{s.name}</span>}
        </a>
        <nav className="hd-nav" aria-label="Разделы">
          {navs.map((n) => (
            <a key={n.id} href={`#${n.id}`} onClick={(e) => (e.preventDefault(), go(n.id))}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hd-side">
          {s.phone && (
            <a className="hd-phone num" href={telHref(s.phone)}>
              {s.phone}
            </a>
          )}
          <button className="btn is-accent hd-cta" onClick={() => book(data)}>
            Записаться
          </button>
          <button className="hd-burger" aria-label={open ? 'Закрыть меню' : 'Меню'} aria-expanded={open} onClick={() => setOpen(!open)}>
            <i />
            <i />
          </button>
        </div>
      </div>
      <div className="hd-sheet" aria-hidden={!open}>
        <nav className="wrap" aria-label="Разделы">
          {navs.map((n) => (
            <a key={n.id} href={`#${n.id}`} tabIndex={open ? 0 : -1} onClick={(e) => (e.preventDefault(), go(n.id))}>
              {n.label}
            </a>
          ))}
          {s.phone && (
            <a className="hd-sheet-phone num" href={telHref(s.phone)} tabIndex={open ? 0 : -1}>
              {s.phone}
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}

export function Hero({ data }: { data: Data }) {
  const s = data.studio
  const route = bookingRoute(s)
  const main = mainService(data)
  const windows = useMemo(() => (route.kind === 'native' && main && data.masters.length ? nextWindows(data, main.id, 4) : []), [data, main?.id, route.kind])
  const first = windows[0]
  const word = serviceWord(main)

  // Вторая строка заголовка: «сегодня в 17:30». Нет записи на сайте или окон: спокойный заголовок студии
  const day = first ? dayPhrase(first.iso) : ''
  const time = first ? fmtTime(first.time) : ''
  const line2 = first ? `${day} в ${time}` : route.kind === 'link' ? `запись ${route.via}` : s.heroTitle || 'и педикюр'
  // Шрифт подстраивается под длину строки: «сегодня в 17:30» крупнее, чем «в воскресенье в 12:00»
  const len = Math.max(word.length, line2.length, 9)

  const photo = s.heroLayout !== 'typographic' && s.heroPhoto ? s.heroPhoto : ''
  const src = reviewsSource(s)
  const today = data.masters.map((m) => hoursOf(m, todayIso())).filter(Boolean) as { open: number; close: number }[]
  const todayText = today.length ? `Сегодня до ${fmtTime(Math.max(...today.map((h) => h.close)))}` : 'Сегодня выходной'

  return (
    <section className={`hero ${photo ? '' : 'is-flat'}`} aria-labelledby="hero-h">
      <div id="top-sentinel" />
      <div className={`wrap hero-top ${word.length <= 9 && line2.length >= 13 ? 'is-lockup' : ''}`}>
        <h1 id="hero-h" className="hero-h" style={{ ['--len' as string]: len }}>
          <span className="hero-l">{word}</span>
          <span className="hero-l">
            {first ? (
              <>
                {day} в&nbsp;<button className="hero-time num" onClick={() => book(data, { serviceId: main!.id, masterId: undefined, date: first.iso, time: first.time })} aria-label={`Записаться ${day} в ${time}`}>
                  {time}
                </button>
              </>
            ) : (
              line2
            )}
          </span>
        </h1>
        {s.heroLead && <p className="hero-lead">{typo(s.heroLead)}</p>}
      </div>

      <div className="hero-band">
        <div className="wrap hero-chips" role="group" aria-label="Ближайшее свободное время">
          {route.kind === 'link' ? (
            <a className="chip-t is-cta" href={route.url} target="_blank" rel="noreferrer">
              Записаться {route.via}
            </a>
          ) : windows.length ? (
            <>
              {windows.map((w, i) => (
                <button key={`${w.iso}-${w.time}`} className={`chip-t ${i === 0 ? 'is-first' : ''}`} style={{ ['--i' as string]: i }} onClick={() => book(data, { serviceId: main!.id, date: w.iso, time: w.time })}>
                  <small>{dayShort(w.iso)}</small>
                  <b className="num">{fmtTime(w.time)}</b>
                </button>
              ))}
              <button className="chip-t is-cta" style={{ ['--i' as string]: windows.length }} onClick={() => book(data)}>
                Другое время
              </button>
            </>
          ) : (
            <button className="chip-t is-cta" onClick={() => book(data)}>
              {data.services.length ? `Запись на ${s.horizonDays} ${plural(s.horizonDays, 'день', 'дня', 'дней')} вперёд` : 'Записаться'}
            </button>
          )}
        </div>
        {photo && (
          <div className="hero-photo">
            <Photo photo={photo} w={1920} sizes="100vw" alt="" fetchPriority="high" style={{ ['--pos-d' as string]: s.heroPositionDesktop ?? '50% 50%', ['--pos-m' as string]: s.heroPositionMobile ?? s.heroPositionDesktop ?? '50% 50%' }} />
          </div>
        )}
      </div>

      <div className="wrap hero-util">
        {s.address && (
          <a className="hero-u" href={routeUrl(s)} target="_blank" rel="noreferrer">
            <b>{s.address}</b>
            <span>Маршрут</span>
          </a>
        )}
        <p className="hero-u">
          <b>{todayText}</b>
          <span>{main ? `${main.title} от ${main.price.toLocaleString('ru-RU')} ₽` : 'Часы работы'}</span>
        </p>
        {src?.rating ? (
          <a className="hero-u" href={src.url} target="_blank" rel="noreferrer">
            <b className="num">{fmtRating(src.rating)} на {src.name}</b>
            <span>{src.count ? reviewsCount(src.count) : 'Отзывы'}</span>
          </a>
        ) : s.phone ? (
          <a className="hero-u" href={telHref(s.phone)}>
            <b className="num">{s.phone}</b>
            <span>Позвонить</span>
          </a>
        ) : null}
      </div>
    </section>
  )
}
