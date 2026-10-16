// «На пять» — сайт студии маникюра. Сквозной приём: окна в форме ногтей (скруглённый верх),
// на первом экране они раскрыты веером, как пальцы, дальше повторяются в работах и у мастеров.
import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORY_LABEL, heroNails, masters, photoUrl, reviews, services, studio, STYLE_LABEL, works, type Category, type Style, type Work } from './data'
import { Booking } from './Booking'
import { book, dayPhrase, fmtDuration, fmtTime, monthDay, nearest, priceLabel, todayHours, weekHours } from './slots'

const main = services.find((s) => s.popular) ?? services[0]
const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`
const go = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Появление разделов при прокрутке: класс is-in на контейнере, один раз */
function useEnter<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return void el.classList.add('is-in')
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (el.classList.add('is-in'), io.disconnect()), { rootMargin: '0px 0px -12% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

function Photo({ id, w, alt = '', pos, sizes, eager }: { id: string; w: number; alt?: string; pos?: string; sizes?: string; eager?: boolean }) {
  return (
    <img
      src={photoUrl(id, w)}
      srcSet={[0.5, 1, 1.6].map((k) => `${photoUrl(id, Math.round(w * k))} ${Math.round(w * k)}w`).join(', ')}
      sizes={sizes ?? `${w}px`}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      style={pos ? { objectPosition: pos } : undefined}
    />
  )
}

export function App() {
  return (
    <div className="site">
      <Header />
      <main>
        <Hero />
        <Prices />
        <Works />
        <Masters />
        <Booking />
        <Reviews />
      </main>
      <Footer />
      <StickyBar />
    </div>
  )
}

/* ---------- Шапка ---------- */

const NAV = [
  { id: 'prices', label: 'Цены' },
  { id: 'works', label: 'Работы' },
  { id: 'masters', label: 'Мастера' },
  { id: 'contacts', label: 'Контакты' },
]

function Header() {
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const hero = document.querySelector('.hero')
    if (!hero) return
    const io = new IntersectionObserver(([e]) => setSolid(e.intersectionRatio < 0.12), { threshold: [0, 0.12, 1] })
    io.observe(hero)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
  }, [open])
  const nav = (id: string) => (e: React.MouseEvent) => (setOpen(false), go(id)(e))
  return (
    <header className={`hd ${solid ? 'is-solid' : ''} ${open ? 'is-open' : ''}`}>
      <a className="logo" href="#" onClick={(e) => (e.preventDefault(), window.scrollTo({ top: 0, behavior: 'smooth' }))}>
        {studio.name}
      </a>
      <nav className="nav" aria-label="Разделы">
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} onClick={nav(n.id)}>
            {n.label}
          </a>
        ))}
      </nav>
      <div className="hd-side">
        <a className="hd-phone" href={tel(studio.phone)}>
          {studio.phone}
        </a>
        <button className="btn is-light hd-cta" onClick={() => book()}>
          Записаться
        </button>
        <button className="burger" aria-label={open ? 'Закрыть меню' : 'Меню'} aria-expanded={open} onClick={() => setOpen(!open)}>
          <i />
          <i />
        </button>
      </div>
      <div className="sheet" aria-hidden={!open}>
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} onClick={nav(n.id)} tabIndex={open ? 0 : -1}>
            {n.label}
          </a>
        ))}
        <a className="sheet-phone" href={tel(studio.phone)} tabIndex={open ? 0 : -1}>
          {studio.phone}
        </a>
      </div>
    </header>
  )
}

/* ---------- Первый экран (одобрен) ---------- */

function Hero() {
  const first = useMemo(() => nearest(main.id), [])
  const minPrice = Math.min(...services.filter((s) => s.category !== 'design').map((s) => s.price))
  return (
    <section className="hero" aria-labelledby="hero-h">
      <div className="hero-copy">
        <h1 id="hero-h" className="hero-h">
          Маникюр
          <br />
          на&nbsp;пять
        </h1>
        <p className="hero-lead">{studio.lead}</p>
        <div className="hero-cta">
          <button className="btn is-light is-big" onClick={() => book(first ? { serviceId: main.id, date: first.iso, time: first.time } : {})}>
            Выбрать время
          </button>
          <a className="link" href="#prices" onClick={go('prices')}>
            Цены от&nbsp;{minPrice.toLocaleString('ru-RU')}&nbsp;₽
          </a>
        </div>
      </div>

      <ul className="hand" aria-label="Работы мастеров">
        {heroNails.map((n, i) => (
          <li key={n.photo} className="nail" style={{ ['--h' as string]: n.h, ['--r' as string]: `${n.r}deg`, ['--i' as string]: i }}>
            <Photo id={n.photo} w={500} alt={n.alt} pos={n.pos} sizes="(min-width: 900px) 9vw, 18vw" eager />
          </li>
        ))}
      </ul>

      <p className="hero-info">
        <a href={studio.map} target="_blank" rel="noreferrer">
          {studio.address}
        </a>
        <span>{todayHours()}</span>
        {first && (
          <span className="hero-next">
            Ближайшее окно: {dayPhrase(first.iso)} в&nbsp;{fmtTime(first.time)}
          </span>
        )}
      </p>
    </section>
  )
}

/* ---------- Цены ---------- */

const CAT_PHOTO: Record<Category, { id: string; pos?: string }> = {
  hands: { id: '1762373349045-c2decd4ec3f3' },
  feet: { id: '1664643411326-6c589531be3c' },
  design: { id: '1720343409646-960f6dcccae3' },
}

function Prices() {
  const ref = useEnter<HTMLDivElement>()
  const cats = (['hands', 'feet', 'design'] as Category[]).filter((c) => services.some((s) => s.category === c))
  const [cat, setCat] = useState<Category>(cats[0])
  const list = services.filter((s) => s.category === cat)
  return (
    <section className="sec prices" id="prices" aria-labelledby="prices-h">
      <div className="wrap prices-grid" ref={ref}>
        <div className="prices-aside">
          <h2 className="h2 rise" id="prices-h">
            Цены
          </h2>
          <div className="tabs rise" role="tablist" aria-label="Раздел прайса">
            {cats.map((c) => (
              <button key={c} role="tab" aria-selected={c === cat} className="tab" onClick={() => setCat(c)}>
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          <div className="frame prices-pic rise" aria-hidden>
            {cats.map((c) => (
              <div key={c} className={c === cat ? 'is-on' : ''}>
                <Photo id={CAT_PHOTO[c].id} w={560} pos={CAT_PHOTO[c].pos} sizes="(min-width: 1024px) 26vw, 0px" />
              </div>
            ))}
          </div>
        </div>
        <ul className="plist rise" role="tabpanel" aria-label={CATEGORY_LABEL[cat]} key={cat}>
          {list.map((s, i) => (
            <li key={s.id} style={{ ['--i' as string]: i }}>
              <button className="prow" onClick={() => book({ serviceId: s.id })}>
                <span className="prow-main">
                  <b>{s.title}</b>
                  <small>{s.note}</small>
                </span>
                <span className="prow-time">{fmtDuration(s.minutes)}</span>
                <span className="prow-price">{priceLabel(s)}</span>
                <span className="prow-go">Записаться</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------- Работы ---------- */

function Works() {
  const ref = useEnter<HTMLDivElement>()
  const track = useRef<HTMLUListElement>(null)
  const styles = useMemo(() => [...new Set(works.map((w) => w.style))], [])
  const [style, setStyle] = useState<Style | null>(null)
  const [open, setOpen] = useState<Work | null>(null)
  const list = style ? works.filter((w) => w.style === style) : works
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' })
  useEffect(() => {
    track.current?.scrollTo({ left: 0 })
  }, [style])
  return (
    <section className="sec works" id="works" aria-labelledby="works-h">
      <div className="wrap" ref={ref}>
        <div className="works-head rise">
          <h2 className="h2" id="works-h">
            Работы
          </h2>
          <div className="works-ctl">
            <div className="pills" role="group" aria-label="Стиль">
              <button className="pill" aria-pressed={!style} onClick={() => setStyle(null)}>
                Все
              </button>
              {styles.map((s) => (
                <button key={s} className="pill" aria-pressed={style === s} onClick={() => setStyle(s)}>
                  {STYLE_LABEL[s]}
                </button>
              ))}
            </div>
            <div className="arrows">
              <button onClick={() => scroll(-1)} aria-label="Назад">
                ←
              </button>
              <button onClick={() => scroll(1)} aria-label="Вперёд">
                →
              </button>
            </div>
          </div>
        </div>
      </div>
      <ul className="strip" ref={track} key={style ?? 'all'}>
        {list.map((w, i) => (
          <li key={w.id} style={{ ['--i' as string]: i }}>
            <button className="work" onClick={() => setOpen(w)}>
              <span className="frame">
                <Photo id={w.photo} w={420} alt={w.title} pos={w.pos} sizes="(min-width: 900px) 280px, 62vw" />
              </span>
              <span className="work-cap">
                <b>{w.title}</b>
                <small>{masters.find((m) => m.id === w.masterId)?.name}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open && <Viewer work={open} onClose={() => setOpen(null)} />}
    </section>
  )
}

function Viewer({ work, onClose }: { work: Work; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const s = services.find((x) => x.id === work.serviceId)
  const m = masters.find((x) => x.id === work.masterId)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])
  return (
    <dialog ref={ref} className="viewer" onCancel={(e) => (e.preventDefault(), onClose())} onClick={(e) => e.target === ref.current && onClose()} aria-label={work.title}>
      <div className="viewer-pic frame">
        <Photo id={work.photo} w={900} alt={work.title} pos={work.pos} sizes="(min-width: 900px) 520px, 100vw" eager />
      </div>
      <div className="viewer-side">
        <button className="viewer-x" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <h3 className="h3">{work.title}</h3>
        <dl>
          {s && (
            <div>
              <dt>Услуга</dt>
              <dd>
                {s.title}, {priceLabel(s)}
              </dd>
            </div>
          )}
          {m && (
            <div>
              <dt>Мастер</dt>
              <dd>{m.name}</dd>
            </div>
          )}
        </dl>
        <button className="btn is-blue is-wide" onClick={() => (onClose(), book({ serviceId: work.serviceId, masterId: work.masterId }))}>
          Хочу так же
        </button>
        <p className="viewer-fine">Пришлите это фото мастеру в&nbsp;мессенджер после записи, она повторит дизайн.</p>
      </div>
    </dialog>
  )
}

/* ---------- Мастера ---------- */

const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function Masters() {
  const ref = useEnter<HTMLDivElement>()
  return (
    <section className="sec masters" id="masters" aria-labelledby="m-h">
      <div className="wrap" ref={ref}>
        <h2 className="h2 rise" id="m-h">
          Мастера
        </h2>
        <ul className="mgrid">
          {masters.map((m, i) => {
            const pics = works.filter((w) => w.masterId === m.id).slice(0, 3)
            return (
              <li key={m.id} className="mcard rise" style={{ ['--i' as string]: i }}>
                <div className="fingers" aria-hidden>
                  {pics.map((w, k) => (
                    <span key={w.id} className="frame" style={{ ['--k' as string]: k }}>
                      <Photo id={w.photo} w={240} pos={w.pos} sizes="(min-width: 900px) 120px, 28vw" />
                    </span>
                  ))}
                </div>
                <p className="mname">{m.name}</p>
                <p className="mrole">{m.role}</p>
                <p className="mabout">{m.about}</p>
                <p className="mweek" aria-label={`Работает: ${WD.filter((_, d) => m.schedule[d]).join(', ')}`}>
                  {WD.map((d, k) => (
                    <span key={d} className={m.schedule[k] ? 'is-on' : ''} aria-hidden>
                      {d}
                    </span>
                  ))}
                </p>
                <button className="btn is-ink" onClick={() => book({ masterId: m.id })}>
                  Записаться к&nbsp;{m.nameDat}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ---------- Отзывы ---------- */

function Reviews() {
  const ref = useEnter<HTMLDivElement>()
  if (!reviews.length) return null
  return (
    <section className="sec reviews" aria-labelledby="rev-h">
      <div className="wrap" ref={ref}>
        <h2 className="h2 rise" id="rev-h">
          Отзывы
        </h2>
        <ul className="rlist">
          {reviews.map((r, i) => (
            <li key={r.id} className="rcard rise" style={{ ['--i' as string]: i }}>
              <blockquote>{r.text}</blockquote>
              <p className="rby">
                <b>{r.name}</b>
                <span>
                  {r.service}, {monthDay(r.date)}
                </span>
              </p>
              {r.demo && <em className="rdemo">пример отзыва</em>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------- Контакты ---------- */

function Footer() {
  const ref = useEnter<HTMLDivElement>()
  return (
    <footer className="ft" id="contacts" aria-labelledby="ft-h">
      <div className="wrap" ref={ref}>
        <h2 className="sr-only" id="ft-h">
          Контакты
        </h2>
        <div className="ft-grid">
          <div className="rise">
            <p className="ft-city">{studio.city}</p>
            <p className="ft-addr">{studio.address}</p>
            <p className="ft-note">{studio.addressNote}</p>
            <div className="ft-actions">
              <a className="btn is-light" href={studio.map} target="_blank" rel="noreferrer">
                Построить маршрут
              </a>
              <a className="btn is-line" href={tel(studio.phone)}>
                {studio.phone}
              </a>
            </div>
          </div>
          <div className="rise">
            <dl className="ft-hours">
              {weekHours().map((h) => (
                <div key={h.days}>
                  <dt>{h.days}</dt>
                  <dd className={h.text === 'выходной' ? 'is-off' : ''}>{h.text}</dd>
                </div>
              ))}
            </dl>
            <p className="ft-links">
              <a href={`https://t.me/${studio.telegram}`} target="_blank" rel="noreferrer">
                Telegram
              </a>
              <a href={`https://wa.me/${studio.whatsapp}`} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </p>
          </div>
        </div>
        <div className="ft-base">
          <p className="logo">{studio.name}</p>
          {studio.demo && <p className="ft-demo">{studio.demoNote}</p>}
        </div>
      </div>
    </footer>
  )
}

/* ---------- Плашка записи на телефоне ---------- */

function StickyBar() {
  const [on, setOn] = useState(false)
  const first = useMemo(() => nearest(main.id), [])
  useEffect(() => {
    const hero = document.querySelector('.hero')
    const hide = ['booking', 'contacts'].map((id) => document.getElementById(id)).filter(Boolean) as Element[]
    if (!hero) return
    const st = { past: false, hidden: new Set<Element>() }
    const apply = () => setOn(st.past && !st.hidden.size)
    const a = new IntersectionObserver(([e]) => ((st.past = !e.isIntersecting && e.boundingClientRect.top < 0), apply()))
    const b = new IntersectionObserver((es) => (es.forEach((e) => (e.isIntersecting ? st.hidden.add(e.target) : st.hidden.delete(e.target))), apply()))
    a.observe(hero)
    hide.forEach((el) => b.observe(el))
    return () => (a.disconnect(), b.disconnect())
  }, [])
  return (
    <div className={`sticky ${on ? 'is-on' : ''}`} aria-hidden={!on}>
      <p>
        <small>Ближайшее окно</small>
        <b>{first ? `${dayPhrase(first.iso)}, ${fmtTime(first.time)}` : 'по записи'}</b>
      </p>
      <button className="btn is-light" tabIndex={on ? 0 : -1} onClick={() => book(first ? { serviceId: main.id, date: first.iso, time: first.time } : {})}>
        Записаться
      </button>
    </div>
  )
}
