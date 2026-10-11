import { useEffect, useMemo, useState } from 'react'
import type { Data, Master, ServiceCategory, Work, WorkTag } from '../data/types'
import { Arrow, ChevronLeft, ChevronRight, Close } from '../lib/icons'
import { select } from '../lib/selection'
import { daySlots, daysAhead, dayHuman, canDo, fmtDuration, fmtTime, priceLabel } from '../lib/slots'
import { Photo, photoUrl, scrollToId, useMedia } from '../lib/ui'
import { useCropDrift } from './Top'

const CATEGORY: Record<ServiceCategory, string> = { hands: 'Руки', feet: 'Ноги', extra: 'Дополнительно' }
const nn = (i: number) => String(i + 1).padStart(2, '0')

function bookService(serviceId: string, masterId?: string) {
  select({ serviceId, ...(masterId ? { masterId } : {}) })
  scrollToId('booking')
}

/* ---------- Услуги: оглавление + фото справа ---------- */

export function Services({ data }: { data: Data }) {
  const groups = (Object.keys(CATEGORY) as ServiceCategory[])
    .map((c) => ({ c, items: data.services.filter((s) => s.category === c) }))
    .filter((g) => g.items.length)
  const [active, setActive] = useState(data.services[0]?.id)
  const cur = data.services.find((s) => s.id === active) ?? data.services[0]
  let n = 0
  return (
    <section className="services" id="services">
      <div className="wrap-wide svc-grid">
        <header className="svc-head">
          <p className="label reveal">Услуги</p>
          <h2 className="reveal d1">
            Цена и&nbsp;время&nbsp;—
            <br />
            до&nbsp;записи
          </h2>
          <p className="reveal d2">«От» стоит только там, где итог зависит от&nbsp;длины и&nbsp;дизайна. Мастер назовёт его до&nbsp;начала работы.</p>
        </header>
        <div className="svc-index">
          {groups.map((g) => (
            <div key={g.c} className="svc-group">
              {groups.length > 1 && <p className="svc-group-title">{CATEGORY[g.c]}</p>}
              <ul>
                {g.items.map((s) => {
                  const i = n++
                  return (
                    <li key={s.id}>
                      <button
                        className={`svc-row ${s.id === cur?.id ? 'is-active' : ''}`}
                        onClick={() => bookService(s.id)}
                        onMouseEnter={() => setActive(s.id)}
                        onFocus={() => setActive(s.id)}
                        aria-label={`${s.title}, ${fmtDuration(s.minutes)}, ${priceLabel(s)}. Записаться`}
                      >
                        <span className="svc-n">{nn(i)}</span>
                        <span className="svc-main">
                          <span className="svc-title">{s.title}</span>
                          <span className="svc-note">{s.note}</span>
                        </span>
                        <span className="svc-meta">
                          <b className="num">{priceLabel(s)}</b>
                          <span>{fmtDuration(s.minutes)}</span>
                        </span>
                        <span className="svc-go" aria-hidden>
                          <Arrow size={18} />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
        <figure className="svc-visual" aria-hidden>
          <div className="svc-frame">
            {data.services.map((s) => (
              <Photo key={s.id} photo={s.photo} w={640} sizes="36vw" loading="lazy" className={s.id === cur?.id ? 'is-on' : ''} />
            ))}
          </div>
          {cur && (
            <figcaption>
              <span>{cur.title}</span>
              <span className="num">{priceLabel(cur)}</span>
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  )
}

/* ---------- Работы: редакционная раскладка ---------- */

const TAGS: { id: WorkTag | 'all'; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'nude', label: 'Нюд' },
  { id: 'minimal', label: 'Минимализм' },
  { id: 'french', label: 'Френч' },
  { id: 'bright', label: 'Яркие' },
  { id: 'design', label: 'Дизайн' },
]

export function Works({ data }: { data: Data }) {
  const [tag, setTag] = useState<WorkTag | 'all'>('all')
  const [open, setOpen] = useState<number | null>(null)
  const [all, setAll] = useState(false)
  // Снимок с первого экрана в галерее не повторяем
  const pool = data.works.filter((w) => w.photo !== data.studio.heroPhoto)
  const tags = TAGS.filter((t) => t.id === 'all' || pool.some((w) => w.tag === t.id))
  const list = useMemo(() => {
    const items = pool.filter((w) => tag === 'all' || w.tag === tag)
    const fi = Math.max(0, items.findIndex((w) => w.featured))
    return items.length ? [items[fi], ...items.filter((_, i) => i !== fi)] : []
  }, [data.works, data.studio.heroPhoto, tag])
  const desktop = useMedia('(min-width: 900px)')
  const shown = all ? list : list.slice(0, desktop ? 8 : 6)
  const serviceOf = (w: Work) => data.services.find((s) => s.id === w.serviceId)
  const masterOf = (w: Work) => (data.masters.length > 1 ? data.masters.find((m) => m.id === w.masterId) : undefined)
  const drift = useCropDrift<HTMLSpanElement>(18)

  return (
    <section className="works" id="works">
      <div className="wrap-wide">
        <header className="works-head">
          <h2 className="works-title" aria-label="Работы">
            <span ref={drift}>Работы</span>
          </h2>
          <div className="works-side">
            <p>Нажмите на&nbsp;фото, чтобы рассмотреть, и&nbsp;запишитесь на&nbsp;такой&nbsp;же дизайн.</p>
            <div className="tabs" role="group" aria-label="Стиль">
              {tags.map((t) => (
                <button key={t.id} className="tab" aria-pressed={tag === t.id} onClick={() => (setTag(t.id), setAll(false))}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </header>
        <div className="gallery" key={tag}>
          {shown.map((w, i) => {
            const s = serviceOf(w)
            const m = masterOf(w)
            return (
              <figure key={w.id} className={`work w${i % 8}`} style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
                <button className="work-img" onClick={() => setOpen(i)} aria-label={`Открыть: ${w.title}`}>
                  <Photo photo={w.photo} w={i % 8 === 0 || i % 8 === 3 ? 1000 : 560} sizes={i % 8 === 0 || i % 8 === 3 ? '(min-width: 900px) 60vw, 100vw' : '(min-width: 900px) 34vw, 80vw'} alt={w.title} loading={i < 2 ? 'eager' : 'lazy'} />
                </button>
                <figcaption>
                  <span>
                    <b>{w.title}</b>
                    {(s || m) && <small>{[s?.title, m?.name].filter(Boolean).join(' · ')}</small>}
                  </span>
                  {s && (
                    <button className="text-link" onClick={() => bookService(s.id, m?.id)}>
                      Хочу так же <Arrow size={14} />
                    </button>
                  )}
                </figcaption>
              </figure>
            )
          })}
          {!list.length && <p className="gallery-empty">Здесь пока нет работ.</p>}
        </div>
        {list.length > shown.length && (
          <div className="gallery-more">
            <button className="text-link" onClick={() => setAll(true)}>
              Показать ещё {list.length - shown.length}
            </button>
          </div>
        )}
      </div>
      {open !== null && list[open] && (
        <Lightbox
          works={list}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          caption={(w) => [serviceOf(w)?.title, masterOf(w)?.name].filter(Boolean).join(' · ')}
          onBook={(w) => {
            setOpen(null)
            const s = serviceOf(w)
            if (s) bookService(s.id, masterOf(w)?.id)
            else scrollToId('booking')
          }}
        />
      )}
    </section>
  )
}

function Lightbox({ works, index, onIndex, onClose, onBook, caption }: { works: Work[]; index: number; onIndex: (i: number) => void; onClose: () => void; onBook: (w: Work) => void; caption: (w: Work) => string }) {
  const w = works[index]
  const go = (d: number) => onIndex((index + d + works.length) % works.length)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  })
  // Свайп на телефоне
  let x0 = 0
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={w.title} onTouchStart={(e) => (x0 = e.touches[0].clientX)} onTouchEnd={(e) => {
      const dx = e.changedTouches[0].clientX - x0
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    }}>
      <div className="lightbox-top">
        <span className="num">
          {index + 1} / {works.length}
        </span>
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть" autoFocus>
          <Close />
        </button>
      </div>
      <div className="lightbox-img" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <img key={w.id} src={photoUrl(w.photo, 1200)} alt={w.title} />
        {works.length > 1 && (
          <>
            <button className="icon-btn lightbox-nav prev" onClick={() => go(-1)} aria-label="Предыдущая">
              <ChevronLeft size={22} />
            </button>
            <button className="icon-btn lightbox-nav next" onClick={() => go(1)} aria-label="Следующая">
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>
      <div className="lightbox-bottom">
        <div>
          <b>{w.title}</b>
          <small>{caption(w)}</small>
        </div>
        <button className="btn btn-primary" onClick={() => onBook(w)}>
          Записаться на такой <Arrow />
        </button>
      </div>
    </div>
  )
}

/* ---------- Пауза: спокойная фраза ---------- */

export function Interlude() {
  return (
    <section className="interlude">
      <div className="wrap-wide interlude-grid">
        <p className="interlude-big reveal">
          Цену и&nbsp;свободное время видно до&nbsp;того, как вы&nbsp;оставите контакты.
        </p>
        <p className="interlude-small reveal d1">Без переписки, уточнений и&nbsp;ожидания ответа. Запись сразу попадает в&nbsp;расписание мастера.</p>
      </div>
    </section>
  )
}

/* ---------- Мастера: один мастер на развороте ---------- */

function nextSlotOf(data: Data, m: Master) {
  const svc = data.services.find((s) => s.category !== 'extra' && canDo(m, s.id))
  if (!svc) return null
  const day = daysAhead(data, svc.id, m.id).find((d) => d.free > 0)
  if (!day) return null
  const slot = daySlots(data, svc.id, m.id, day.iso).find((x) => x.free)
  return slot ? { iso: day.iso, time: slot.time } : null
}

export function Masters({ data }: { data: Data }) {
  const [idx, setIdx] = useState(0)
  if (data.masters.length < 2) return null
  const m = data.masters[Math.min(idx, data.masters.length - 1)]
  const pool = data.works.filter((w) => w.photo !== data.studio.heroPhoto)
  // Портрета нет — берём работу мастера, которая не стоит в начале галереи
  const photoOf = (x: Master) => x.photo || pool.filter((w) => w.masterId === x.id && !w.featured).pop()?.photo
  const next = nextSlotOf(data, m)
  return (
    <section className="masters" id="masters">
      <div className="wrap-wide masters-grid">
        <div className="master-visual">
          {data.masters.map((x) => {
            const ph = photoOf(x)
            return ph ? <img key={x.id} src={photoUrl(ph, 900)} alt={x.photo ? x.name : `Работа мастера: ${x.name}`} loading="lazy" className={x.id === m.id ? 'is-on' : ''} /> : null
          })}
        </div>
        <div className="master-profile">
          <p className="label">
            Мастер {nn(idx)} / {nn(data.masters.length - 1)}
          </p>
          <div className="master-copy" key={m.id}>
            <h2>{m.name}</h2>
            <p className="master-role">{m.role}</p>
            <p className="master-about">{m.about}</p>
            {next && (
              <p className="master-next">
                Ближайшее окно — {dayHuman(next.iso, false)}, {fmtTime(next.time)}
              </p>
            )}
            <button className="btn btn-primary" onClick={() => (select({ masterId: m.id }), scrollToId('booking'))}>
              Выбрать мастера <Arrow size={16} className="arrow" />
            </button>
          </div>
          <div className="master-switch" role="tablist" aria-label="Мастера">
            {data.masters.map((x, i) => (
              <button key={x.id} role="tab" aria-selected={i === idx} onClick={() => setIdx(i)}>
                <span className="n">{nn(i)}</span>
                {x.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Переход к записи ---------- */

export function BookingIntro({ data }: { data: Data }) {
  const steps = data.masters.length > 1 ? 'Услуга, мастер, время и контакты' : 'Услуга, время и контакты'
  return (
    <section className="bk-intro">
      <div className="wrap-wide">
        <p className="bk-intro-big reveal">
          Выбрали образ&nbsp;—
          <br />
          теперь выберите время.
        </p>
        <p className="bk-intro-small reveal d1">{steps}&nbsp;— пара минут. Показываем только свободные окна.</p>
        <a className="bk-intro-cue reveal d2" href="#booking" onClick={(e) => (e.preventDefault(), scrollToId('booking'))} aria-label="К записи">
          ↓
        </a>
      </div>
    </section>
  )
}
