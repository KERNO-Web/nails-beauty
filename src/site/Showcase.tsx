// Услуги и цены, работы, мастера
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { Data, Master, ServiceCategory, Work, WorkTag } from '../data/types'
import { planGallery, type Band } from '../lib/gallery'
import { canDo, daySlots, daysAhead, dayHuman, fmtDuration, fmtPrice, fmtTime, plural, priceLabel } from '../lib/slots'
import { Photo, photoUrl, scrollToId, typo, useMedia } from '../lib/ui'
import { Arrow, book, CATEGORY_LABEL, ext, externalBooking, Out, useEnter } from './common'

/* ============ Услуги и цены ============ */

export function Services({ data }: { data: Data }) {
  const ref = useEnter<HTMLDivElement>()
  const groups = (Object.keys(CATEGORY_LABEL) as ServiceCategory[])
    .map((c) => ({ c, items: data.services.filter((s) => s.category === c) }))
    .filter((g) => g.items.length)
  const withPhoto = data.services.filter((s) => s.photo)
  const [active, setActive] = useState(withPhoto[0]?.id)
  const cur = withPhoto.find((s) => s.id === active) ?? withPhoto[0]
  const hasFrom = data.services.some((s) => s.priceFrom)
  const extB = externalBooking(data.studio)
  return (
    <section className="svc" id="services" aria-labelledby="svc-title">
      <div className="frame grid12 svc-head" ref={ref}>
        <h2 className="h-chapter svc-title enter" id="svc-title">
          <span>Услуги</span> <span className="svc-title-2">и&nbsp;цены</span>
        </h2>
        <p className="intro svc-intro enter">
          {hasFrom ? <>Цена и&nbsp;время&nbsp;— до&nbsp;записи. «От»&nbsp;— где итог зависит от&nbsp;длины и&nbsp;дизайна: мастер назовёт его до&nbsp;начала работы.</> : <>Цена и&nbsp;время каждой процедуры&nbsp;— до&nbsp;записи, без сюрпризов на&nbsp;месте.</>}
        </p>
      </div>
      {data.services.length ? (
        <div className={`frame grid12 svc-body ${cur ? '' : 'no-photo'}`}>
          {cur && (
            <figure className="svc-photo" aria-hidden>
              <div className="svc-photo-frame">
                {withPhoto.map((s) => (
                  <Photo key={s.id} photo={s.photo} w={720} sizes="30vw" loading="lazy" className={s.id === cur.id ? 'is-on' : ''} />
                ))}
              </div>
              <figcaption>
                <span>{cur.title}</span>
                <span className="tnum">{priceLabel(cur)}</span>
              </figcaption>
            </figure>
          )}
          <div className="svc-menu">
            {groups.map((g) => (
              <div key={g.c} className="svc-group">
                {groups.length > 1 && <h3 className="svc-cat">{CATEGORY_LABEL[g.c]}</h3>}
                <ul>
                  {g.items.map((s) => (
                    <li key={s.id}>
                      <button
                        className={`svc-row ${s.popular ? 'is-popular' : ''}`}
                        onClick={() => book(data, { serviceId: s.id })}
                        onMouseEnter={() => s.photo && setActive(s.id)}
                        onFocus={() => s.photo && setActive(s.id)}
                        aria-label={`${s.title}, ${fmtDuration(s.minutes)}, ${priceLabel(s)}. ${extB ? 'Записаться' : 'Выбрать время'}`}
                      >
                        <span className="svc-main">
                          {s.popular && <span className="svc-pop">Выбирают чаще всего</span>}
                          <span className="svc-name">{s.title}</span>
                          {s.note && <span className="svc-note">{typo(s.note)}</span>}
                        </span>
                        <span className="svc-time tnum">{fmtDuration(s.minutes)}</span>
                        <span className="svc-price tnum">
                          {s.priceFrom && <small>от&nbsp;</small>}
                          {fmtPrice(s.price)}
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
      ) : (
        <div className="frame">
          <p className="svc-empty">Цены уточняйте у&nbsp;мастера{data.studio.phone ? <> по&nbsp;телефону <a href={`tel:${data.studio.phone.replace(/[^\d+]/g, '')}`}>{data.studio.phone}</a></> : ''}.</p>
        </div>
      )}
    </section>
  )
}

/* ============ Работы ============ */

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
function showMasterWorks(id: string) {
  setWorksMaster(id)
  scrollToId('works')
}

const TAG_LABEL: Record<WorkTag, string> = { nude: 'Нюд', minimal: 'Минимализм', french: 'Френч', bright: 'Яркие', design: 'Дизайн' }
const FIRST_SHOWN = { wide: 9, narrow: 7 }

export function Works({ data }: { data: Data }) {
  const wide = useMedia('(min-width: 640px)')
  const headRef = useEnter<HTMLDivElement>()
  const [tag, setTag] = useState<WorkTag | 'all'>('all')
  const [open, setOpen] = useState<number | null>(null)
  const [all, setAll] = useState(false)
  const masterId = useWorksMaster()
  // Фильтр по мастеру — только если мастеров несколько и у каждого из кнопок есть работы
  const masters = data.masters.length > 1 ? data.masters.filter((m) => data.works.some((w) => w.masterId === m.id)) : []
  const byMaster = useMemo(() => data.works.filter((w) => !masterId || w.masterId === masterId), [data.works, masterId])
  const tags = useMemo(() => (Object.keys(TAG_LABEL) as WorkTag[]).filter((t) => byMaster.some((w) => w.tag === t)), [byMaster])
  useEffect(() => {
    if (tag !== 'all' && !tags.includes(tag)) setTag('all')
    setAll(false)
  }, [masterId])
  const list = useMemo(() => {
    const items = byMaster.filter((w) => tag === 'all' || w.tag === tag)
    const fi = Math.max(0, items.findIndex((w) => w.featured))
    return items.length ? [items[fi], ...items.filter((_, i) => i !== fi)] : []
  }, [byMaster, tag])
  if (!data.works.length) return null
  const curMaster = data.masters.find((m) => m.id === masterId)
  const limit = wide ? FIRST_SHOWN.wide : FIRST_SHOWN.narrow
  // Не оставлять за кнопкой «ещё» одну-две работы — показываем сразу все
  const shown = all || list.length <= limit + 2 ? list : list.slice(0, limit)
  const bands = planGallery(shown.length, wide)
  const serviceOf = (w: Work) => data.services.find((s) => s.id === w.serviceId)
  const masterOf = (w: Work) => (data.masters.length > 1 ? data.masters.find((m) => m.id === w.masterId) : undefined)
  const meta = (w: Work) => [serviceOf(w)?.title, masterOf(w) && `мастер ${masterOf(w)!.name}`].filter(Boolean).join(' · ')
  const count = byMaster.length

  return (
    <section className="works" id="works" aria-labelledby="works-title">
      <div className="frame grid12 works-head" ref={headRef}>
        <h2 className="h-chapter works-title enter" id="works-title">
          Работы
        </h2>
        <div className="works-side enter">
          <p className="intro">
            {curMaster ? `${curMaster.name}: ` : ''}
            {count} {plural(count, 'работа', 'работы', 'работ')}
            {!curMaster && data.masters.length > 1 ? ' наших мастеров' : ''}. Откройте снимок, чтобы рассмотреть, и&nbsp;запишитесь на&nbsp;такую&nbsp;же услугу.
          </p>
          {(masters.length > 1 || tags.length > 1) && (
            <div className="works-filters">
              {masters.length > 1 && (
                <div className="flt" role="group" aria-label="Мастер">
                  <span className="flt-label">Мастер</span>
                  <button className="flt-btn" aria-pressed={!masterId} onClick={() => setWorksMaster(null)}>
                    Все
                  </button>
                  {masters.map((m) => (
                    <button key={m.id} className="flt-btn" aria-pressed={masterId === m.id} onClick={() => setWorksMaster(m.id)}>
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
              {tags.length > 1 && (
                <div className="flt" role="group" aria-label="Стиль">
                  <span className="flt-label">Стиль</span>
                  {(['all', ...tags] as const).map((t) => (
                    <button key={t} className="flt-btn" aria-pressed={tag === t} onClick={() => (setTag(t), setAll(false))}>
                      {t === 'all' ? 'Все' : TAG_LABEL[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="frame">
        <div className="gallery" key={`${masterId}-${tag}-${wide}-${shown.length}`}>
          {bands.map((b, bi) => (
            <GalleryBand key={bi} band={b}>
              {b.items.map((i, k) => {
                const w = shown[i]
                return (
                  <figure key={w.id} className="tile" style={{ gridArea: 'abcd'[k] } as React.CSSProperties}>
                    <button className="tile-img" onClick={() => setOpen(i)} aria-label={`Открыть фото: ${w.title}`}>
                      <Photo photo={w.photo} w={k === 0 && b.kind !== 'row3' && b.kind !== 'duo' ? 1100 : 700} sizes={k === 0 ? '(min-width: 640px) 58vw, 100vw' : '(min-width: 640px) 30vw, 50vw'} alt={w.title} loading={bi === 0 ? 'eager' : 'lazy'} style={{ objectPosition: w.focus }} />
                    </button>
                    <figcaption className="tile-cap">
                      <b>{w.title}</b>
                      {meta(w) && <span>{meta(w)}</span>}
                    </figcaption>
                  </figure>
                )
              })}
              {b.kind === 'solo' && (
                <div className="tile-solo-cta">
                  <p>Понравилась работа? Покажите её мастеру на&nbsp;записи&nbsp;— сделаем так&nbsp;же или подберём похожее.</p>
                  <button className="cta" onClick={() => book(data, { serviceId: serviceOf(shown[0])?.id })}>
                    Записаться <Arrow />
                  </button>
                </div>
              )}
            </GalleryBand>
          ))}
          {!list.length && <p className="gallery-empty">С этим фильтром работ пока нет.</p>}
        </div>
        {list.length > shown.length && (
          <div className="gallery-more">
            <button className="cta cta--ghost" onClick={() => setAll(true)}>
              Показать ещё {list.length - shown.length} {plural(list.length - shown.length, 'работу', 'работы', 'работ')}
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

function GalleryBand({ band, children }: { band: Band; children: React.ReactNode }) {
  const ref = useEnter<HTMLDivElement>('0px 0px -6% 0px')
  return (
    <div ref={ref} className={`band band-${band.kind}`}>
      {children}
    </div>
  )
}

function Lightbox({ works, index, onIndex, onClose, onBook, canBook, caption }: { works: Work[]; index: number; onIndex: (i: number) => void; onClose: () => void; onBook: (w: Work) => void; canBook: (w: Work) => boolean; caption: (w: Work) => string }) {
  const w = works[index]
  const box = useRef<HTMLDivElement>(null)
  const go = (d: number) => onIndex((index + d + works.length) % works.length)
  // Фокус внутри окна, Esc — закрыть, стрелки — листать; после закрытия фокус возвращается на снимок
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
        const f = Array.from(box.current.querySelectorAll<HTMLElement>('button, a[href]'))
        if (!f.length) return
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
      className="lbx"
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
      <div className="lbx-top">
        <span className="tnum" aria-live="polite">
          {index + 1} / {works.length}
        </span>
        <button className="lbx-btn" onClick={onClose} aria-label="Закрыть" autoFocus>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="lbx-img" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <img key={w.id} src={photoUrl(w.photo, 1600)} alt={w.title} />
        {works.length > 1 && (
          <>
            <button className="lbx-btn lbx-nav is-prev" onClick={() => go(-1)} aria-label="Предыдущая работа">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button className="lbx-btn lbx-nav is-next" onClick={() => go(1)} aria-label="Следующая работа">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
      <div className="lbx-bottom">
        <div>
          <b>{w.title}</b>
          {caption(w) && <span>{caption(w)}</span>}
        </div>
        {canBook(w) && (
          <button className="cta cta--light" onClick={() => onBook(w)}>
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

const yearsLabel = (n: number) => `${n} ${plural(n, 'год', 'года', 'лет')}`

export function Masters({ data }: { data: Data }) {
  const ms = data.masters
  const ref = useEnter<HTMLDivElement>()
  if (!ms.length) return null
  const single = ms.length === 1
  return (
    <section className={`mst-sec ${single ? 'is-single' : ''}`} id="masters" aria-labelledby="mst-title">
      <div className="frame grid12 mst-head" ref={ref}>
        <h2 className="h-chapter enter" id="mst-title">
          {single ? 'Мастер' : 'Мастера'}
        </h2>
        {!single && <p className="intro enter">Можно выбрать мастера при&nbsp;записи или записаться к&nbsp;тому, у&nbsp;кого раньше свободное окно.</p>}
      </div>
      <div className="frame mst-list">
        {ms.map((m, i) => (
          <MasterRow key={m.id} data={data} m={m} single={single} flip={i % 2 === 1} />
        ))}
      </div>
    </section>
  )
}

function MasterRow({ data, m, single, flip }: { data: Data; m: Master; single: boolean; flip: boolean }) {
  const ref = useEnter<HTMLElement>()
  const works = data.works.filter((w) => w.masterId === m.id || (single && !w.masterId))
  const own = single ? data.works : works
  const services = m.serviceIds.length ? data.services.filter((s) => m.serviceIds.includes(s.id)) : []
  const native = !externalBooking(data.studio)
  const next = native ? nextSlotOf(data, m) : null
  const mosaic = own.slice(0, 3)
  return (
    <article ref={ref} className={`mst grid12 ${flip ? 'is-flip' : ''} ${m.photo ? 'has-photo' : mosaic.length ? `has-works n${mosaic.length}` : 'no-visual'}`}>
      {(m.photo || mosaic.length > 0) && (
        <div className="mst-visual enter">
          {m.photo ? (
            <Photo photo={m.photo} w={900} sizes="(min-width: 900px) 36vw, 100vw" alt={`${m.name}, мастер`} loading="lazy" />
          ) : (
            mosaic.map((w, k) => (
              <button key={w.id} className="mst-work" style={{ gridArea: 'abc'[k] }} onClick={() => (single ? scrollToId('works') : showMasterWorks(m.id))} aria-label={`Работа мастера ${m.name}: ${w.title}`}>
                <Photo photo={w.photo} w={k === 0 ? 800 : 420} sizes={k === 0 ? '(min-width: 900px) 24vw, 60vw' : '(min-width: 900px) 12vw, 40vw'} alt="" loading="lazy" style={{ objectPosition: w.focus }} />
              </button>
            ))
          )}
        </div>
      )}
      <div className="mst-text enter">
        <h3 className="mst-name">{m.name}</h3>
        <p className="mst-role">{m.role}</p>
        {m.about && <p className="body-text mst-about">{typo(m.about)}</p>}
        <dl className="mst-facts">
          {m.years ? (
            <div>
              <dt>Стаж</dt>
              <dd className="tnum">{yearsLabel(m.years)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Услуги</dt>
            <dd>{services.length ? services.map((s) => s.title).join(', ') : 'все услуги студии'}</dd>
          </div>
          {next && (
            <div>
              <dt>Ближайшее окно</dt>
              <dd className="tnum">
                {dayHuman(next.iso)}, {fmtTime(next.time)}
              </dd>
            </div>
          )}
        </dl>
        <div className="mst-actions">
          <button className="cta" onClick={() => book(data, { masterId: m.id })}>
            {m.nameDat ? `Записаться к ${m.nameDat}` : 'Записаться'} <Arrow />
          </button>
          {works.length > 0 && !single && (
            <button className="line-link" onClick={() => showMasterWorks(m.id)}>
              {works.length} {plural(works.length, 'работа', 'работы', 'работ')} в&nbsp;галерее <Arrow size={14} />
            </button>
          )}
          {m.portfolio && (
            <a className="line-link" href={m.portfolio} {...ext}>
              Портфолио <Out />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
