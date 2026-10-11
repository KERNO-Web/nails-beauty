import type { Data } from '../data/types'
import { Arrow } from '../lib/icons'
import { dayHuman, fmtPrice, fmtTime, nearestSlot } from '../lib/slots'
import { scrollToId } from '../lib/ui'

export const go = (id: string) => (e: React.MouseEvent) => (e.preventDefault(), scrollToId(id))

/** Главные факты под заголовком: цена «от», ближайшее реально свободное окно, адрес — одинаковые во всех концепциях */
export function HeroFacts({ data, className = '' }: { data: Data; className?: string }) {
  const main = data.services.filter((x) => x.category !== 'extra')
  const minPrice = main.length ? Math.min(...main.map((x) => x.price)) : 0
  const near = nearestSlot(data)
  return (
    <dl className={`h-facts ${className}`}>
      {minPrice > 0 && (
        <div>
          <dt>Цены</dt>
          <dd>от {fmtPrice(minPrice)}</dd>
        </div>
      )}
      {near && (
        <div>
          <dt>Ближайшее окно</dt>
          <dd>
            {dayHuman(near.iso)}, {fmtTime(near.time)}
          </dd>
        </div>
      )}
      <div>
        <dt>Адрес</dt>
        <dd>{data.studio.address}</dd>
      </div>
    </dl>
  )
}

export function HeroCta({ label = 'Выбрать время', onClick, className = '' }: { label?: string; onClick?: () => void; className?: string }) {
  return (
    <div className={`h-cta ${className}`}>
      <a className="btn h-btn" href="#booking" onClick={onClick ? (e) => (e.preventDefault(), onClick()) : go('booking')}>
        {label} <Arrow size={16} className="arrow" />
      </a>
      <a className="text-link" href="#services" onClick={go('services')}>
        Цены
      </a>
    </div>
  )
}
