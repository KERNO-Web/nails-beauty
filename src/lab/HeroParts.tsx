import { useEffect } from 'react'
import type { Data } from '../data/types'
import { Arrow } from '../lib/icons'
import { dayHuman, fmtPrice, fmtTime, nearestSlot } from '../lib/slots'
import { scrollToId } from '../lib/ui'
import { labVisible } from './concepts'
import { COPIES, FONTS, setTypeLab, useTypeLab } from './typeLab'

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

/** Внутренний переключатель: шрифт заголовка (A/B/C) и, отдельно, варианты текста.
 * Тексты сравниваются только после выбора шрифта — по умолчанию у всех шрифтов один заголовок */
export function LabSwitch() {
  const lab = useTypeLab()
  const on = labVisible()
  // Полоса под шапкой; первые экраны сдвигаются на её высоту (--lab)
  useEffect(() => {
    document.documentElement.classList.toggle('has-lab', on)
    return () => document.documentElement.classList.remove('has-lab')
  }, [on])
  if (!on) return null
  return (
    <div className="lab" role="group" aria-label="Внутренний просмотр: шрифты и текст">
      <span className="lab-tag">Внутренний просмотр</span>
      <label className="lab-pick">
        <span>Заголовок</span>
        <select value={lab.hero} onChange={(e) => setTypeLab({ hero: e.target.value })}>
          {FONTS.map((f, i) => (
            <option key={f.id} value={f.id}>
              {i + 1}. {f.label} — {f.note}
            </option>
          ))}
        </select>
      </label>
      <label className="lab-pick">
        <span>Услуги</span>
        <select value={lab.names} onChange={(e) => setTypeLab({ names: e.target.value })}>
          {FONTS.map((f, i) => (
            <option key={f.id} value={f.id}>
              {i + 1}. {f.label} — {f.note}
            </option>
          ))}
        </select>
      </label>
      <label className="lab-pick">
        <span>Текст</span>
        <select value={lab.copy} onChange={(e) => setTypeLab({ copy: e.target.value as (typeof COPIES)[number]['id'] })}>
          {COPIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.text}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
