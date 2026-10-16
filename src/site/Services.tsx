// Услуги и цены: крупный прайс строками. На компьютере слева фото услуги, на которую навели.
import { useState } from 'react'
import type { Data, Service } from '../data/types'
import { fmtDuration, priceLabel } from '../lib/slots'
import { Photo, typo } from '../lib/ui'
import { Arrow } from '../lib/icons'
import { book, CATEGORY_LABEL, mainService, useEnter } from './common'

export function Services({ data }: { data: Data }) {
  const ref = useEnter<HTMLDivElement>()
  const [hover, setHover] = useState<Service | null>(null)
  if (!data.services.length) return null
  const shown = hover ?? mainService(data)!
  const groups = (['hands', 'feet', 'extra'] as const).map((c) => ({ c, items: data.services.filter((s) => s.category === c) })).filter((g) => g.items.length)
  return (
    <section className="sec svc" id="services" aria-labelledby="svc-h">
      <div className="wrap svc-grid" ref={ref}>
        <div className="svc-aside">
          <h2 className="h2 rise" id="svc-h">
            Услуги
            <br />и&nbsp;цены
          </h2>
          <div className="svc-pic rise" aria-hidden>
            {data.services.map((s) =>
              s.photo ? <Photo key={s.id} photo={s.photo} w={720} sizes="(min-width: 1024px) 34vw, 0px" alt="" loading="lazy" className={s.id === shown.id ? 'is-on' : ''} /> : null,
            )}
          </div>
        </div>
        <div className="svc-list" onMouseLeave={() => setHover(null)}>
          {groups.map((g) => (
            <div key={g.c} className="svc-group rise">
              {groups.length > 1 && <h3 className="svc-cat">{CATEGORY_LABEL[g.c]}</h3>}
              <ul>
                {g.items.map((s) => (
                  <li key={s.id}>
                    <button className="svc-row" onMouseEnter={() => setHover(s)} onFocus={() => setHover(s)} onClick={() => book(data, { serviceId: s.id })}>
                      <span className="svc-main">
                        <b>{s.title}</b>
                        {s.note && <small>{typo(s.note)}</small>}
                      </span>
                      <span className="svc-dur num">{fmtDuration(s.minutes)}</span>
                      <span className="svc-price num">{priceLabel(s)}</span>
                      <span className="svc-go" aria-hidden>
                        <Arrow size={20} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="svc-fine rise">Цена «от» зависит от длины и сложности дизайна. Точную сумму мастер назовёт до начала работы.</p>
        </div>
      </div>
    </section>
  )
}
