// Работы: фильтр по стилю (с цветом покрытия) и сетка. По тапу: крупно + «Хочу так же».
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Data, Work, WorkTag } from '../data/types'
import { Close } from '../lib/icons'
import { priceLabel } from '../lib/slots'
import { Photo } from '../lib/ui'
import { book, useEnter } from './common'

const TAGS: Record<WorkTag, string> = { nude: 'Нюд', minimal: 'Минимализм', french: 'Френч', bright: 'Яркие', design: 'Дизайн' }

export function Works({ data }: { data: Data }) {
  const ref = useEnter<HTMLDivElement>()
  const [tag, setTag] = useState<WorkTag | null>(null)
  const [open, setOpen] = useState<Work | null>(null)
  const tags = useMemo(() => {
    const out: { tag: WorkTag; tone?: string; n: number }[] = []
    for (const w of data.works) {
      const t = out.find((x) => x.tag === w.tag)
      if (t) {
        t.n++
        t.tone ??= w.tone
      } else out.push({ tag: w.tag, tone: w.tone, n: 1 })
    }
    return out
  }, [data.works])
  if (!data.works.length) return null
  const featured = data.works.find((w) => w.featured) ?? data.works[0]
  const list = tag ? data.works.filter((w) => w.tag === tag) : [featured, ...data.works.filter((w) => w !== featured)]
  return (
    <section className="sec works" id="works" aria-labelledby="works-h">
      <div className="wrap" ref={ref}>
        <div className="works-head">
          <h2 className="h2 rise" id="works-h">
            Работы
          </h2>
          {tags.length > 1 && (
            <div className="works-filter rise" role="group" aria-label="Стиль">
              <button className="pill" aria-pressed={!tag} onClick={() => setTag(null)}>
                Все <span className="num">{data.works.length}</span>
              </button>
              {tags.map((t) => (
                <button key={t.tag} className="pill" aria-pressed={tag === t.tag} onClick={() => setTag(t.tag)}>
                  {t.tone && <i style={{ background: t.tone }} aria-hidden />}
                  {TAGS[t.tag]} <span className="num">{t.n}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <ul className={`works-grid n${Math.min(list.length, 6)} ${tag ? 'is-filtered' : ''}`} key={tag ?? 'all'}>
          {list.map((w, i) => (
            <li key={w.id} className={!tag && i === 0 && list.length > 3 ? 'is-big' : ''} style={{ ['--i' as string]: i }}>
              <button className="work" onClick={() => setOpen(w)} aria-label={`${w.title}, открыть`}>
                <span className="work-pic">
                  <Photo photo={w.photo} w={!tag && i === 0 ? 900 : 520} sizes={!tag && i === 0 ? '(min-width: 1024px) 46vw, 100vw' : '(min-width: 1024px) 23vw, 50vw'} alt={w.title} loading="lazy" style={w.focus ? { objectPosition: w.focus } : undefined} />
                </span>
                <span className="work-cap">
                  <b>{w.title}</b>
                  {data.masters.length > 1 && w.masterId && <small>{data.masters.find((m) => m.id === w.masterId)?.name}</small>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {open && <Viewer data={data} work={open} onClose={() => setOpen(null)} />}
    </section>
  )
}

function Viewer({ data, work, onClose }: { data: Data; work: Work; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const service = data.services.find((s) => s.id === work.serviceId)
  const master = data.masters.find((m) => m.id === work.masterId)
  // Закрываем только по действию пользователя (крестик, Esc, клик мимо), а не по событию close:
  // иначе повторный запуск эффекта в режиме разработки сразу закрывает окно
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])
  return (
    <dialog ref={ref} className="viewer" onCancel={(e) => (e.preventDefault(), onClose())} onClick={(e) => e.target === ref.current && onClose()} aria-label={work.title}>
      <div className="viewer-in">
        <div className="viewer-pic">
          <Photo photo={work.photo} w={1200} sizes="(min-width: 900px) 60vw, 100vw" alt={work.title} style={work.focus ? { objectPosition: work.focus } : undefined} />
        </div>
        <div className="viewer-side">
          <button className="viewer-x" onClick={onClose} aria-label="Закрыть">
            <Close />
          </button>
          <h3 className="h3">{work.title}</h3>
          <dl className="viewer-dl">
            {service && (
              <div>
                <dt>Услуга</dt>
                <dd>
                  {service.title}, <span className="num">{priceLabel(service)}</span>
                </dd>
              </div>
            )}
            {master && data.masters.length > 1 && (
              <div>
                <dt>Мастер</dt>
                <dd>{master.name}</dd>
              </div>
            )}
          </dl>
          <button
            className="btn is-accent is-wide"
            onClick={() => {
              onClose()
              book(data, { serviceId: work.serviceId, masterId: data.masters.length > 1 ? work.masterId : undefined })
            }}
          >
            Хочу так же
          </button>
          <p className="viewer-fine">Можно приложить это фото в пожелании к записи, мастер повторит дизайн.</p>
        </div>
      </div>
    </dialog>
  )
}
