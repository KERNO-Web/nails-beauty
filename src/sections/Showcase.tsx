import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { Data, Master, ServiceCategory, Work, WorkTag } from '../data/types'
import { galleryRows } from '../lib/gallery'
import { Arrow, ChevronLeft, ChevronRight, Close } from '../lib/icons'
import { select } from '../lib/selection'
import { canDo, daySlots, daysAhead, dayHuman, fmtDuration, fmtTime, plural, priceLabel } from '../lib/slots'
import { Photo, photoUrl, scrollToId, typo, useMedia } from '../lib/ui'

const CATEGORY: Record<ServiceCategory, string> = { hands: 'Руки', feet: 'Ноги', extra: 'К любой услуге' }

function bookService(serviceId: string, masterId?: string) {
  select({ serviceId, ...(masterId ? { masterId } : {}) })
  scrollToId('booking')
}

/** Появление блока, когда он доезжает до экрана: класс .is-in */
function useEnter<T extends HTMLElement>(margin = '0px 0px -12% 0px') {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) return el.classList.add('is-in')
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('is-in')
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [margin])
  return ref
}

/* ---------- Услуги и цены: список главный, рядом — «ноготь» с фото услуги ---------- */

export function Services({ data }: { data: Data }) {
  const groups = (Object.keys(CATEGORY) as ServiceCategory[])
    .map((c) => ({ c, items: data.services.filter((s) => s.category === c) }))
    .filter((g) => g.items.length)
  const [active, setActive] = useState(data.services[0]?.id)
  const cur = data.services.find((s) => s.id === active) ?? data.services[0]
  const hasFrom = data.services.some((s) => s.priceFrom)
  return (
    <section className="services" id="services">
      <div className="wrap-wide">
        <header className="sec-head">
          <h2>Услуги и&nbsp;цены</h2>
          {hasFrom && <p>«От»&nbsp;— там, где итог зависит от&nbsp;длины и&nbsp;дизайна. Точную цену мастер назовёт до&nbsp;начала работы.</p>}
        </header>
        <div className="svc-layout">
          <figure className="svc-swatch" aria-hidden>
            <div className="svc-swatch-nail">
              {data.services.map((s) => (
                <Photo key={s.id} photo={s.photo} w={520} sizes="22vw" loading="lazy" className={s.id === cur?.id ? 'is-on' : ''} />
              ))}
            </div>
            {cur && (
              <figcaption>
                <span>{cur.title}</span>
                <b className="num">{priceLabel(cur)}</b>
              </figcaption>
            )}
          </figure>
          <div className="svc-list">
            {groups.map((g) => (
              <div key={g.c} className="svc-group">
                {groups.length > 1 && <p className="svc-group-title">{CATEGORY[g.c]}</p>}
                <ul>
                  {g.items.map((s) => (
                    <li key={s.id}>
                      <button
                        className={`svc-row ${s.id === cur?.id ? 'is-active' : ''}`}
                        onClick={() => bookService(s.id)}
                        onMouseEnter={() => setActive(s.id)}
                        onFocus={() => setActive(s.id)}
                        aria-label={`${s.title}, ${fmtDuration(s.minutes)}, ${priceLabel(s)}. Выбрать время`}
                      >
                        <span className="svc-thumb" aria-hidden>
                          <Photo photo={s.photo} w={120} sizes="56px" loading="lazy" />
                        </span>
                        <span className="svc-main">
                          <span className="svc-title">{s.title}</span>
                          <span className="svc-note">{typo(s.note)}</span>
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
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Работы ---------- */

/** Подписи стилей. Фильтр показывает только те стили, что реально есть у работ */
/** Чьи работы показывает галерея: id мастера или null — все. Общее для галереи и карточек мастеров */
let worksMaster: string | null = null
const worksListeners = new Set<() => void>()
function useWorksMaster() {
  return useSyncExternalStore(
    (l) => (worksListeners.add(l), () => worksListeners.delete(l)),
    () => worksMaster,
  )
}
function setWorksMaster(id: string | null) {
  worksMaster = id
  for (const l of worksListeners) l()
}
/** Карточка мастера → галерея только с её работами */
function showMasterWorks(id: string) {
  setWorksMaster(id)
  scrollToId('works')
}

const TAG_LABEL: Record<WorkTag, string> = { nude: 'Нюд', minimal: 'Минимализм', french: 'Френч', bright: 'Яркие', design: 'Дизайн' }
const FIRST_SHOWN = { wide: 9, narrow: 7 }

export function Works({ data }: { data: Data }) {
  const wide = useMedia('(min-width: 860px)')
  const [tag, setTag] = useState<WorkTag | 'all'>('all')
  const [open, setOpen] = useState<number | null>(null)
  const [all, setAll] = useState(false)
  const masterId = useWorksMaster()
  // Мастера с работами — для фильтра; один мастер — фильтр не нужен
  const masters = data.masters.length > 1 ? data.masters.filter((m) => data.works.some((w) => w.masterId === m.id)) : []
  const byMaster = useMemo(() => data.works.filter((w) => !masterId || w.masterId === masterId), [data.works, masterId])
  const tags = useMemo(() => (Object.keys(TAG_LABEL) as WorkTag[]).filter((t) => byMaster.some((w) => w.tag === t)), [byMaster])
  // Сменили мастера, а выбранного стиля у неё нет — сбрасываем на «Все»
  useEffect(() => {
    if (tag !== 'all' && !tags.includes(tag)) setTag('all')
    setAll(false)
  }, [masterId])
  const list = useMemo(() => {
    const items = byMaster.filter((w) => tag === 'all' || w.tag === tag)
    const fi = Math.max(0, items.findIndex((w) => w.featured))
    return items.length ? [items[fi], ...items.filter((_, i) => i !== fi)] : []
  }, [byMaster, tag])
  const curMaster = data.masters.find((m) => m.id === masterId)
  const limit = wide ? FIRST_SHOWN.wide : FIRST_SHOWN.narrow
  const shown = all ? list : list.slice(0, limit)
  const rows = galleryRows(shown.length, wide)
  const serviceOf = (w: Work) => data.services.find((s) => s.id === w.serviceId)
  const masterOf = (w: Work) => (data.masters.length > 1 ? data.masters.find((m) => m.id === w.masterId) : undefined)
  const meta = (w: Work) => [serviceOf(w)?.title, masterOf(w)?.name].filter(Boolean).join(' · ')

  const tile = (idx: number, big = false) => {
    const w = shown[idx]
    if (!w) return null
    const s = serviceOf(w)
    return (
      <figure key={w.id} className={`work ${big ? 'is-lead' : ''}`} style={{ '--k': idx } as React.CSSProperties}>
        <button className="work-img" onClick={() => setOpen(idx)} aria-label={`Открыть: ${w.title}`}>
          <Photo photo={w.photo} w={big ? 1000 : 640} sizes={big ? '(min-width: 860px) 56vw, 100vw' : '(min-width: 860px) 30vw, 50vw'} alt={w.title} loading={idx < 3 ? 'eager' : 'lazy'} style={{ objectPosition: w.focus }} />
        </button>
        <figcaption>
          <span>
            <b>{w.title}</b>
            {meta(w) && <small>{meta(w)}</small>}
          </span>
          {s && (
            <button className="work-book" onClick={() => bookService(s.id, masterOf(w)?.id)} aria-label={`Записаться: ${s.title}`}>
              <Arrow size={16} />
            </button>
          )}
        </figcaption>
      </figure>
    )
  }

  return (
    <section className="works" id="works">
      <div className="wrap-wide">
        <header className="sec-head works-head">
          <h2>Работы</h2>
          <p>
            {curMaster ? `${curMaster.name}: ` : ''}
            {byMaster.length} {plural(byMaster.length, 'работа', 'работы', 'работ')}
            {!curMaster && data.masters.length > 1 ? ' наших мастеров' : ''}. Нажмите на&nbsp;снимок, чтобы рассмотреть, или на&nbsp;стрелку, чтобы записаться на&nbsp;эту услугу.
          </p>
          {masters.length > 1 && (
            <div className="filter-row">
              <span className="filter-label">Мастер</span>
              <div className="seg" role="group" aria-label="Мастер">
                <button className="seg-btn" aria-pressed={!masterId} onClick={() => setWorksMaster(null)}>
                  Все
                </button>
                {masters.map((m) => (
                  <button key={m.id} className="seg-btn" aria-pressed={masterId === m.id} onClick={() => setWorksMaster(m.id)}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tags.length > 1 && (
            <div className="filter-row">
              <span className="filter-label">Стиль</span>
              <div className="filters" role="group" aria-label="Стиль">
                {(['all', ...tags] as const).map((t) => (
                  <button key={t} className="filter" aria-pressed={tag === t} onClick={() => (setTag(t), setAll(false))}>
                    {t === 'all' ? 'Все' : TAG_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>
        <div className="gallery" key={`${masterId}-${tag}-${wide}`}>
          {rows.map((r, ri) => (
            <GalleryRowView key={ri} kind={r.kind} count={r.items.length} cols={'cols' in r ? r.cols : undefined}>
              {r.kind === 'lead' ? (
                <>
                  {tile(r.items[0], true)}
                  <div className="gallery-stack">{r.items.slice(1).map((i) => tile(i))}</div>
                </>
              ) : r.kind === 'solo' ? (
                <>
                  {tile(r.items[0], true)}
                  <div className="gallery-cta">
                    <p>Понравилась работа? Покажите её мастеру на&nbsp;записи&nbsp;— сделаем так&nbsp;же или подберём похожее.</p>
                    <button className="btn btn-accent" onClick={() => scrollToId('booking')}>
                      Выбрать время <Arrow size={16} />
                    </button>
                  </div>
                </>
              ) : (
                r.items.map((i) => tile(i, !wide && r.items.length === 1 && i === 0))
              )}
            </GalleryRowView>
          ))}
          {!list.length && <p className="gallery-empty">Здесь появятся работы мастеров.</p>}
        </div>
        {list.length > shown.length && (
          <div className="gallery-more">
            <button className="btn btn-line-dark" onClick={() => setAll(true)}>
              Показать ещё {list.length - shown.length}
            </button>
          </div>
        )}
      </div>
      {open !== null && shown[open] && (
        <Lightbox
          works={shown}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          caption={meta}
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

function GalleryRowView({ kind, count, cols, children }: { kind: string; count: number; cols?: string; children: React.ReactNode }) {
  const ref = useEnter<HTMLDivElement>()
  return (
    <div ref={ref} className={`g-row g-${kind} g-n${count}`} style={cols ? ({ '--cols': cols } as React.CSSProperties) : undefined}>
      {children}
    </div>
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
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={w.title}
      onTouchStart={(e) => (x0 = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - x0
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
      }}
    >
      <div className="lightbox-top">
        <span className="num">
          {index + 1} / {works.length}
        </span>
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть" autoFocus>
          <Close />
        </button>
      </div>
      <div className="lightbox-img" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <img key={w.id} src={photoUrl(w.photo, 1400)} alt={w.title} />
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
        <button className="btn btn-accent" onClick={() => onBook(w)}>
          Записаться на&nbsp;такой <Arrow />
        </button>
      </div>
    </div>
  )
}

/* ---------- Мастера ---------- */

function nextSlotOf(data: Data, m: Master) {
  const svc = data.services.find((s) => s.popular && canDo(m, s.id)) ?? data.services.find((s) => s.category !== 'extra' && canDo(m, s.id))
  if (!svc) return null
  const day = daysAhead(data, svc.id, m.id).find((d) => d.free > 0)
  if (!day) return null
  const slot = daySlots(data, svc.id, m.id, day.iso).find((x) => x.free)
  return slot ? { iso: day.iso, time: slot.time } : null
}

const yearsLabel = (n: number) => `${n} ${plural(n, 'год', 'года', 'лет')} в профессии`

export function Masters({ data }: { data: Data }) {
  const ms = data.masters
  const ref = useEnter<HTMLDivElement>()
  if (!ms.length) return null
  const single = ms.length === 1
  return (
    <section className="masters" id="masters">
      <div className="wrap-wide">
        <header className="sec-head">
          <h2>{single ? 'Мастер' : 'Мастера'}</h2>
          {!single && <p>Можно выбрать мастера при записи или записаться к&nbsp;тому, у&nbsp;кого раньше свободное окно.</p>}
        </header>
        <div ref={ref} className={`master-list count-${Math.min(ms.length, 3)}`}>
          {ms.map((m) => (
            <MasterCard key={m.id} data={data} m={m} single={single} />
          ))}
        </div>
      </div>
    </section>
  )
}

function MasterCard({ data, m, single }: { data: Data; m: Master; single: boolean }) {
  const works = data.works.filter((w) => w.masterId === m.id)
  const services = m.serviceIds.length ? data.services.filter((s) => m.serviceIds.includes(s.id)) : []
  const next = nextSlotOf(data, m)
  // На месте мастера — его настоящее фото (m.photo). Только если фото нет — три его работы
  const fallback = (works.length ? works : data.works).slice(0, 3)
  return (
    <article className={`master ${single ? 'is-single' : ''}`}>
      <div
        className={`master-visual ${m.photo ? 'has-portrait' : 'has-works'} ${works.length && !single ? 'is-link' : ''}`}
        {...(works.length && !single ? { role: 'button', tabIndex: 0, 'aria-label': `Работы мастера: ${m.name}`, onClick: () => showMasterWorks(m.id), onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), showMasterWorks(m.id)) } : {})}
      >
        {m.photo ? (
          <Photo photo={m.photo} w={700} sizes="(min-width: 860px) 30vw, 90vw" alt={m.name} loading="lazy" />
        ) : (
          fallback.map((w, i) => (
            <span key={w.id} className="mini-nail" style={{ '--i': i } as React.CSSProperties}>
              <Photo photo={w.photo} w={320} sizes="14vw" alt={`Работа: ${w.title}`} style={{ objectPosition: w.focus }} />
            </span>
          ))
        )}
      </div>
      <div className="master-body">
        {works.length && !single ? (
          <h3>
            <button className="master-name" onClick={() => showMasterWorks(m.id)}>
              {m.name}
            </button>
          </h3>
        ) : (
          <h3>{m.name}</h3>
        )}
        <p className="master-role">{m.role}</p>
        {m.about && <p className="master-about">{typo(m.about)}</p>}
        <ul className="master-facts">
          {m.years ? <li>{yearsLabel(m.years)}</li> : null}
          <li>{services.length ? services.map((s) => s.title).join(', ') : 'Все услуги студии'}</li>
          {works.length > 0 && (
            <li>
              {single ? (
                <>
                  {works.length} {plural(works.length, 'работа', 'работы', 'работ')} в&nbsp;галерее
                </>
              ) : (
                <button className="master-works" onClick={() => showMasterWorks(m.id)}>
                  Смотреть {works.length} {plural(works.length, 'работу', 'работы', 'работ')} <Arrow size={14} />
                </button>
              )}
            </li>
          )}
        </ul>
        <div className="master-actions">
          <button className="btn btn-primary" onClick={() => (select({ masterId: m.id }), scrollToId('booking'))}>
            {m.nameDat ? `Записаться к ${m.nameDat}` : 'Записаться'} <Arrow size={16} className="arrow" />
          </button>
          {next && (
            <span className="master-next">
              Ближайшее окно: {dayHuman(next.iso)}, {fmtTime(next.time)}
            </span>
          )}
        </div>
        {m.portfolio && (
          <a className="text-link" href={m.portfolio} target="_blank" rel="noreferrer">
            Портфолио мастера <Arrow size={14} />
          </a>
        )}
      </div>
    </article>
  )
}
