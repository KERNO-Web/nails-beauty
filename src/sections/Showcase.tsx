import { useEffect, useMemo, useState } from 'react'
import type { Data, ServiceCategory, Work, WorkTag } from '../data/types'
import { Arrow, ChevronLeft, ChevronRight, Close } from '../lib/icons'
import { select } from '../lib/selection'
import { fmtDuration, priceLabel } from '../lib/slots'
import { Avatar, Photo, photoUrl, scrollToId, useMedia } from '../lib/ui'

const CATEGORY: Record<ServiceCategory, string> = { hands: 'Руки', feet: 'Ноги', extra: 'Дополнительно' }

function bookService(serviceId: string, masterId?: string) {
  select({ serviceId, ...(masterId ? { masterId } : {}) })
  scrollToId('booking')
}

/* ---------- Услуги и цены ---------- */

export function Services({ data }: { data: Data }) {
  const groups = (Object.keys(CATEGORY) as ServiceCategory[])
    .map((c) => ({ c, items: data.services.filter((s) => s.category === c) }))
    .filter((g) => g.items.length)
  return (
    <section className="section section-alt" id="services">
      <div className="wrap">
        <header className="sec-head">
          <p className="eyebrow reveal">Услуги и цены</p>
          <h2 className="reveal d1">
            Цена и время&nbsp;— <em>сразу</em>
          </h2>
          <p className="reveal d2">Без «уточняйте в директ». «От» стоит только там, где итог зависит от длины и дизайна — мастер назовёт его до начала работы.</p>
        </header>
        <div className="svc-groups">
          {groups.map((g) => (
            <div key={g.c}>
              {groups.length > 1 && <h3 className="svc-group-title reveal">{CATEGORY[g.c]}</h3>}
              <ul className="svc-list">
                {g.items.map((s, i) => (
                  <li key={s.id} className={`reveal ${i % 2 ? 'd1' : ''}`}>
                    <button className="svc" onClick={() => bookService(s.id)} aria-label={`${s.title}, ${fmtDuration(s.minutes)}, ${priceLabel(s)}. Записаться`}>
                      <span className="svc-thumb">
                        <Photo photo={s.photo} w={110} sizes="110px" loading="lazy" />
                      </span>
                      <span className="svc-body">
                        {s.popular && <span className="svc-badge">Выбирают чаще всего</span>}
                        <h3>{s.title}</h3>
                        <span className="svc-note">{s.note}</span>
                        <span className="svc-meta">
                          <span className="svc-price num">{priceLabel(s)}</span>
                          <span className="svc-time">{fmtDuration(s.minutes)}</span>
                          <span className="svc-go" aria-hidden>
                            <Arrow size={18} />
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Работы ---------- */

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
  const tags = TAGS.filter((t) => t.id === 'all' || data.works.some((w) => w.tag === t.id))
  const list = useMemo(() => {
    const items = data.works.filter((w) => tag === 'all' || w.tag === tag)
    const fi = Math.max(0, items.findIndex((w) => w.featured))
    return items.length ? [items[fi], ...items.filter((_, i) => i !== fi)] : []
  }, [data.works, tag])
  // Сетка закрывается ровно: на компьютере главная 2×2 + 8 работ, на телефоне главная + 6. Остальное — по кнопке
  const desktop = useMedia('(min-width: 760px)')
  const [all, setAll] = useState(false)
  const limit = desktop ? 9 : 7
  const shown = all ? list : list.slice(0, limit)
  const serviceOf = (w: Work) => data.services.find((s) => s.id === w.serviceId)
  const masterOf = (w: Work) => (data.masters.length > 1 ? data.masters.find((m) => m.id === w.masterId) : undefined)

  return (
    <section className="section" id="works">
      <div className="wrap">
        <header className="sec-head split">
          <p className="eyebrow reveal">Работы</p>
          <h2 className="reveal d1">
            Так выглядят <em>наши ногти</em>
          </h2>
          <p className="reveal d2">Нажмите на фото, чтобы рассмотреть, — и запишитесь на такой же дизайн.</p>
        </header>
        <div className="filters reveal" role="group" aria-label="Стиль">
          {tags.map((t) => (
            <button key={t.id} className="chip" aria-pressed={tag === t.id} onClick={() => (setTag(t.id), setAll(false))}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="gallery" key={tag}>
          {shown.map((w, i) => {
            const s = serviceOf(w)
            const featured = i === 0
            return (
              <div key={w.id} className={`work ${featured ? 'featured' : ''}`} style={{ animation: `soft-in .5s var(--ease) ${Math.min(i, 8) * 0.04}s both` }}>
                <button className="work-open" onClick={() => setOpen(i)} aria-label={`Открыть: ${w.title}`} />
                <Photo photo={w.photo} w={featured ? 900 : 480} sizes={featured ? '(min-width: 760px) 50vw, 100vw' : '(min-width: 760px) 25vw, 50vw'} alt={w.title} loading={featured ? 'eager' : 'lazy'} />
                {featured && (
                  <div className="work-cap">
                    <span>
                      <b>{w.title}</b>
                      {s && <small>{s.title}{masterOf(w) ? ` · ${masterOf(w)!.name}` : ''}</small>}
                    </span>
                    {s && (
                      <button className="btn btn-primary btn-sm" onClick={() => bookService(s.id, masterOf(w)?.id)}>
                        Хочу так же
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {!list.length && <p className="gallery-empty">Здесь пока нет работ.</p>}
        </div>
        {list.length > shown.length && (
          <div className="gallery-more">
            <button className="btn btn-line" onClick={() => setAll(true)}>
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

/* ---------- Мастера (только если их больше одного) ---------- */

export function Masters({ data }: { data: Data }) {
  if (data.masters.length < 2) return null
  return (
    <section className="section section-alt" id="masters">
      <div className="wrap">
        <header className="sec-head">
          <p className="eyebrow reveal">Мастера</p>
          <h2 className="reveal d1">
            Можно выбрать <em>своего</em> мастера
          </h2>
          <p className="reveal d2">Или записаться к любому, у кого раньше окно, — качество одинаковое, график разный.</p>
        </header>
        <div className="masters">
          {data.masters.map((m, i) => {
            const works = data.works.filter((w) => w.masterId === m.id).slice(0, 4)
            const first = data.services.find((s) => !m.serviceIds.length || m.serviceIds.includes(s.id))
            return (
              <article key={m.id} className={`master reveal ${i ? 'd1' : ''}`}>
                <Avatar name={m.name} photo={m.photo} size={64} />
                <div>
                  <h3>{m.name}</h3>
                  <p className="master-role">{m.role}</p>
                  <p>{m.about}</p>
                  {works.length > 0 && (
                    <div className="master-works">
                      {works.map((w) => (
                        <img key={w.id} src={photoUrl(w.photo, 120)} alt={w.title} loading="lazy" />
                      ))}
                    </div>
                  )}
                  {first && (
                    <button className="link" onClick={() => {
                      select({ masterId: m.id })
                      scrollToId('booking')
                    }}>
                      {m.nameDat ? `Записаться к ${m.nameDat}` : `Записаться: ${m.name}`} <Arrow size={16} />
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------- Как проходит запись ---------- */

export function HowItWorks({ data }: { data: Data }) {
  const steps = [
    { t: 'Выберите услугу', d: 'Цена и длительность видны заранее.' },
    { t: 'Выберите удобное время', d: 'Показываем только реально свободные окна.' },
    { t: 'Получите подтверждение', d: data.studio.confirmNote.split('.')[0] + '.' },
  ]
  return (
    <section className="section">
      <div className="wrap">
        <header className="sec-head">
          <p className="eyebrow reveal">Как записаться</p>
          <h2 className="reveal d1">
            Три шага и <em>пара минут</em>
          </h2>
        </header>
        <ol className="how">
          {steps.map((s, i) => (
            <li key={i} className={`reveal d${i}`}>
              <span className="how-n">0{i + 1}</span>
              <b>{s.t}</b>
              <span>{s.d}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
