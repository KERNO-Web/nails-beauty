// Услуги (меню с отточиями), работы (портфолио-лента), мастера
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { Data, Master, Service, ServiceCategory, Work, WorkTag } from '../data/types'
import { canDo, daySlots, daysAhead, dayHuman, fmtDuration, fmtPrice, fmtTime, plural } from '../lib/slots'
import { Photo, photoUrl, scrollToId, typo } from '../lib/ui'
import { Arrow, book, bookingRoute, bookLink, CATEGORY_LABEL, Chevron, Close, Out, useEnter } from './common'

/* ============ Услуги и цены ============ */

/** Категории по двум колонкам меню — чтобы колонки были примерно одной высоты */
function columns(groups: { c: ServiceCategory; items: Service[] }[]) {
  if (groups.length < 2) return [groups]
  const total = groups.reduce((n, g) => n + g.items.length + 1.5, 0)
  const left: typeof groups = []
  let acc = 0
  for (const g of groups) {
    if (left.length && acc + (g.items.length + 1.5) / 2 > total / 2) break
    left.push(g)
    acc += g.items.length + 1.5
  }
  return [left, groups.slice(left.length)]
}

export function Services({ data }: { data: Data }) {
  const ref = useEnter<HTMLDivElement>()
  if (!data.services.length) return null
  const groups = (Object.keys(CATEGORY_LABEL) as ServiceCategory[]).map((c) => ({ c, items: data.services.filter((s) => s.category === c) })).filter((g) => g.items.length)
  const cols = columns(groups)
  const hasFrom = data.services.some((s) => s.priceFrom)
  const native = bookingRoute(data.studio).kind === 'native'
  return (
    <section className="svc" id="services" aria-labelledby="svc-h">
      <div className="wrap" ref={ref}>
        <div className="sec-head">
          <p className="tag rise">Прайс</p>
          <h2 className="d-lg rise" id="svc-h">
            Услуги и&nbsp;цены
          </h2>
          <p className="lead rise">Цена и&nbsp;длительность&nbsp;— до&nbsp;записи. Нажмите на&nbsp;услугу, чтобы {native ? 'выбрать время' : 'записаться'}.</p>
        </div>
        <div className={`menu rise ${cols.length > 1 ? 'is-two' : ''}`}>
          {cols.map((col, ci) => (
            <div key={ci} className="menu-col">
              {col.map((g) => (
                <div key={g.c} className="menu-group">
                  {groups.length > 1 && <h3 className="menu-cat">{CATEGORY_LABEL[g.c]}</h3>}
                  <ul>
                    {g.items.map((s) => (
                      <li key={s.id}>
                        <a className="menu-item" {...bookLink(data, { serviceId: s.id })} aria-label={`${s.title}, ${fmtDuration(s.minutes)}, ${s.priceFrom ? 'от ' : ''}${fmtPrice(s.price)}. Записаться`}>
                          <span className="menu-line">
                            <span className="menu-name">
                              {s.title}
                              {s.popular && <span className="menu-pop">чаще всего</span>}
                            </span>
                            <span className="menu-dots" aria-hidden />
                            <span className="menu-price num">
                              {s.priceFrom && <small>от</small>}
                              {fmtPrice(s.price)}
                            </span>
                          </span>
                          <span className="menu-sub">
                            <span className="menu-time num">{fmtDuration(s.minutes)}</span>
                            {s.note && <span className="menu-note">{typo(s.note)}</span>}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
          <div className="menu-foot">
            <p className="small">{hasFrom ? '«От» — где итог зависит от длины и дизайна: мастер назовёт точную цену до начала работы.' : 'Цены окончательные — без доплат на месте.'}</p>
            <a className="btn-a" {...bookLink(data)}>
              Записаться {native ? <Arrow /> : <Out />}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============ Работы ============ */

/** Чьи работы показывает лента: id мастера или null — все. Общее для ленты и мастеров */
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
function showMasterWorks(id: string) {
  setWorksMaster(id)
  scrollToId('works')
}

const TAG_LABEL: Record<WorkTag, string> = { nude: 'Нюд', minimal: 'Минимализм', french: 'Френч', bright: 'Яркие', design: 'Дизайн' }
/** Ритм ленты: первая крупнее, дальше чередование вертикальных и почти квадратных кадров */
const RATIOS = [0.8, 1.06, 0.75, 0.94, 1.2, 0.8, 1.0, 0.72]

export function Works({ data }: { data: Data }) {
  const ref = useEnter<HTMLDivElement>()
  const track = useRef<HTMLDivElement>(null)
  const [tag, setTag] = useState<WorkTag | 'all'>('all')
  const [open, setOpen] = useState<number | null>(null)
  const [edge, setEdge] = useState({ start: true, end: false })
  const masterId = useWorksMaster()
  const masters = data.masters.length > 1 ? data.masters.filter((m) => data.works.some((w) => w.masterId === m.id)) : []
  const byMaster = useMemo(() => data.works.filter((w) => !masterId || w.masterId === masterId), [data.works, masterId])
  const tags = useMemo(() => (Object.keys(TAG_LABEL) as WorkTag[]).filter((t) => byMaster.some((w) => w.tag === t)), [byMaster])
  useEffect(() => {
    if (tag !== 'all' && !tags.includes(tag)) setTag('all')
  }, [masterId])
  const list = useMemo(() => {
    const items = byMaster.filter((w) => tag === 'all' || w.tag === tag)
    const fi = Math.max(0, items.findIndex((w) => w.featured))
    return items.length ? [items[fi], ...items.filter((_, i) => i !== fi)] : []
  }, [byMaster, tag])
  const onScroll = () => {
    const el = track.current
    if (el) setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 })
  }
  useEffect(() => {
    track.current?.scrollTo({ left: 0 })
    onScroll()
  }, [list])
  if (!data.works.length) return null
  const serviceOf = (w: Work) => data.services.find((s) => s.id === w.serviceId)
  const masterOf = (w: Work) => (data.masters.length > 1 ? data.masters.find((m) => m.id === w.masterId) : undefined)
  const meta = (w: Work) => [serviceOf(w)?.title, masterOf(w) && `мастер ${masterOf(w)!.name}`].filter(Boolean).join(' · ')
  const page = (d: number) => track.current?.scrollBy({ left: d * track.current.clientWidth * 0.8, behavior: 'smooth' })
  const curMaster = data.masters.find((m) => m.id === masterId)

  return (
    <section className="wk" id="works" aria-labelledby="wk-h">
      <div className="wrap" ref={ref}>
        <div className="sec-head">
          <p className="tag rise">Портфолио</p>
          <h2 className="d-lg rise" id="wk-h">
            {curMaster ? `Работы: ${curMaster.name}` : 'Работы мастеров'}
          </h2>
          <p className="lead rise">
            {byMaster.length} {plural(byMaster.length, 'работа', 'работы', 'работ')}. Откройте снимок, чтобы рассмотреть, и&nbsp;запишитесь на&nbsp;такую же услугу.
          </p>
        </div>
        <div className="wk-bar rise">
          <div className="wk-filters">
            {masters.length > 1 && (
              <div className="wk-flt" role="group" aria-label="Мастер">
                <button className="chip-a" aria-pressed={!masterId} onClick={() => setWorksMaster(null)}>
                  Все мастера
                </button>
                {masters.map((m) => (
                  <button key={m.id} className="chip-a" aria-pressed={masterId === m.id} onClick={() => setWorksMaster(m.id)}>
                    {m.name}
                  </button>
                ))}
              </div>
            )}
            {tags.length > 1 && (
              <div className="wk-flt" role="group" aria-label="Стиль">
                {(['all', ...tags] as const).map((t) => (
                  <button key={t} className="chip-a" aria-pressed={tag === t} onClick={() => setTag(t)}>
                    {t === 'all' ? 'Любой стиль' : TAG_LABEL[t]}
                  </button>
                ))}
              </div>
            )}
          </div>
          {list.length > 2 && (
            <div className="wk-arrows">
              <button onClick={() => page(-1)} disabled={edge.start} aria-label="Предыдущие работы">
                <Chevron dir="left" />
              </button>
              <button onClick={() => page(1)} disabled={edge.end} aria-label="Следующие работы">
                <Chevron />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="wk-track" ref={track} onScroll={onScroll} tabIndex={-1}>
        {list.map((w, i) => (
          <figure key={w.id} className="wk-item" style={{ '--r': i === 0 ? 0.82 : RATIOS[i % RATIOS.length] } as React.CSSProperties}>
            <button className="wk-img" onClick={() => setOpen(i)} aria-label={`Открыть: ${w.title}`}>
              <Photo photo={w.photo} w={i === 0 ? 900 : 700} sizes="(min-width: 900px) 34vw, 70vw" alt={w.title} loading={i < 3 ? 'eager' : 'lazy'} style={{ objectPosition: w.focus }} />
            </button>
            <figcaption>
              <b>{w.title}</b>
              {meta(w) && <span>{meta(w)}</span>}
            </figcaption>
          </figure>
        ))}
        {list.length > 0 && (
          <div className="wk-end">
            <p className="d-sm">Хотите так&nbsp;же?</p>
            <p className="small">Покажите понравившуюся работу мастеру&nbsp;— повторим или подберём похожее.</p>
            <a className="btn-a" {...bookLink(data)}>
              Записаться <Arrow />
            </a>
          </div>
        )}
        {!list.length && <p className="wk-empty small">С этим фильтром работ пока нет.</p>}
      </div>

      {open !== null && list[open] && (
        <Lightbox
          works={list}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
          caption={meta}
          canBook={(w) => !!serviceOf(w)}
          onBook={(w) => {
            setOpen(null)
            book(data, { serviceId: serviceOf(w)?.id, masterId: masterOf(w)?.id })
          }}
        />
      )}
    </section>
  )
}

function Lightbox({ works, index, onIndex, onClose, onBook, canBook, caption }: { works: Work[]; index: number; onIndex: (i: number) => void; onClose: () => void; onBook: (w: Work) => void; canBook: (w: Work) => boolean; caption: (w: Work) => string }) {
  const w = works[index]
  const box = useRef<HTMLDivElement>(null)
  const go = (d: number) => onIndex((index + d + works.length) % works.length)
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      back?.focus?.()
    }
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'Tab' && box.current) {
        const f = Array.from(box.current.querySelectorAll<HTMLElement>('button'))
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus())
        else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus())
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
  const x0 = useRef(0)
  return (
    <div
      className="lb"
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-label={`Работа: ${w.title}`}
      onTouchStart={(e) => (x0.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - x0.current
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
      }}
    >
      <div className="lb-top">
        <span className="num" aria-live="polite">
          {index + 1} / {works.length}
        </span>
        <button className="lb-btn" onClick={onClose} aria-label="Закрыть" autoFocus>
          <Close />
        </button>
      </div>
      <div className="lb-stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <img key={w.id} src={photoUrl(w.photo, 1600)} alt={w.title} />
        {works.length > 1 && (
          <>
            <button className="lb-btn lb-nav is-prev" onClick={() => go(-1)} aria-label="Предыдущая работа">
              <Chevron dir="left" />
            </button>
            <button className="lb-btn lb-nav is-next" onClick={() => go(1)} aria-label="Следующая работа">
              <Chevron />
            </button>
          </>
        )}
      </div>
      <div className="lb-bottom">
        <div>
          <b>{w.title}</b>
          {caption(w) && <span>{caption(w)}</span>}
        </div>
        {canBook(w) && (
          <button className="btn-a is-light" onClick={() => onBook(w)}>
            Записаться на&nbsp;эту услугу <Arrow />
          </button>
        )}
      </div>
    </div>
  )
}

/* ============ Мастера ============ */

function nextSlotOf(data: Data, m: Master) {
  const svc = data.services.find((s) => s.popular && canDo(m, s.id)) ?? data.services.find((s) => s.category !== 'extra' && canDo(m, s.id))
  if (!svc) return null
  const day = daysAhead(data, svc.id, m.id).find((d) => d.free > 0)
  if (!day) return null
  const slot = daySlots(data, svc.id, m.id, day.iso).find((x) => x.free)
  return slot ? { iso: day.iso, time: slot.time } : null
}

export function Masters({ data }: { data: Data }) {
  const ms = data.masters
  const ref = useEnter<HTMLDivElement>()
  if (!ms.length) return null
  const single = ms.length === 1
  const layout = single ? 'one' : ms.length <= 3 ? 'few' : 'many'
  return (
    <section className={`ms ms-${layout}`} id="masters" aria-labelledby="ms-h">
      <div className="wrap" ref={ref}>
        <div className="sec-head">
          <p className="tag rise">{single ? 'Кто делает' : 'Команда'}</p>
          <h2 className="d-lg rise" id="ms-h">
            {single ? 'Ваш мастер' : 'Мастера студии'}
          </h2>
          {!single && <p className="lead rise">Запишитесь к&nbsp;своему мастеру или к&nbsp;тому, у&nbsp;кого раньше свободное окно.</p>}
        </div>
        <div className="ms-list">
          {ms.map((m, i) => (
            <MasterCard key={m.id} data={data} m={m} single={single} i={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function MasterCard({ data, m, single, i }: { data: Data; m: Master; single: boolean; i: number }) {
  const ref = useEnter<HTMLElement>()
  const works = data.works.filter((w) => w.masterId === m.id)
  const own = single ? data.works : works
  const services = m.serviceIds.length ? data.services.filter((s) => m.serviceIds.includes(s.id)) : []
  const native = bookingRoute(data.studio).kind === 'native'
  const next = native ? nextSlotOf(data, m) : null
  const mosaic = own.slice(0, 3)
  return (
    <article ref={ref} className={`ms-card rise ${m.photo ? 'has-photo' : mosaic.length ? `has-works n${mosaic.length}` : 'no-visual'}`} style={{ '--i': i } as React.CSSProperties}>
      {(m.photo || mosaic.length > 0) && (
        <div className="ms-visual">
          {m.photo ? (
            <Photo photo={m.photo} w={800} sizes="(min-width: 900px) 30vw, 90vw" alt={`${m.name}, мастер`} loading="lazy" />
          ) : (
            mosaic.map((w, k) => (
              <button key={w.id} className="ms-work" style={{ gridArea: 'abc'[k] }} onClick={() => (single ? scrollToId('works') : showMasterWorks(m.id))} aria-label={`Работа мастера ${m.name}: ${w.title}`}>
                <Photo photo={w.photo} w={k === 0 ? 700 : 400} sizes="(min-width: 900px) 20vw, 50vw" alt="" loading="lazy" style={{ objectPosition: w.focus }} />
              </button>
            ))
          )}
        </div>
      )}
      <div className="ms-body">
        <h3 className="ms-name">{m.name}</h3>
        <p className="ms-role">{m.role}</p>
        {m.about && <p className="ms-about">{typo(m.about)}</p>}
        <ul className="ms-facts">
          {m.years ? <li className="num">{`${m.years} ${plural(m.years, 'год', 'года', 'лет')} опыта`}</li> : null}
          <li>{services.length ? `${services.length} ${plural(services.length, 'услуга', 'услуги', 'услуг')} из прайса` : 'все услуги студии'}</li>
          {next && (
            <li className="num">
              окно: {dayHuman(next.iso)}, {fmtTime(next.time)}
            </li>
          )}
        </ul>
        <div className="ms-actions">
          <a className="btn-a" {...bookLink(data, { masterId: m.id })}>
            {m.nameDat ? `Записаться к ${m.nameDat}` : 'Записаться'}
          </a>
          {works.length > 0 && !single && (
            <button className="u-link" onClick={() => showMasterWorks(m.id)}>
              {works.length} {plural(works.length, 'работа', 'работы', 'работ')}
            </button>
          )}
          {m.portfolio && (
            <a className="u-link" href={m.portfolio} target="_blank" rel="noreferrer">
              Портфолио <Out size={13} />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
