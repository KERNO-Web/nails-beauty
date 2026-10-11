// Концепция 3 — «Цвет как объект». Главный объект — крупный мазок лака, как на палитре в салоне. Его цвет —
// оттенок одной из работ студии (поле tone у работы); мазок перетекает в круглую «линзу» с фото этой работы.
// Выбор оттенка перекрашивает мазок новым движением кисти, меняет фото и акцент страницы,
// а кнопка записывает на услугу этой работы. Оттенки берутся из данных; если их нет — один цвет темы.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Data, Work } from '../data/types'
import { Arrow } from '../lib/icons'
import { select } from '../lib/selection'
import { priceLabel } from '../lib/slots'
import { applyAccent } from '../lib/theme'
import { photoUrl, scrollToId, typo } from '../lib/ui'
import type { Concept } from './concepts'
import { HeroFacts } from './HeroParts'

function hexRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
const mixHex = (a: string, b: string, k: number) => {
  const x = hexRgb(a)
  const y = hexRgb(b)
  return toHex(x.map((v, i) => v + (y[i] - v) * k))
}
function saturation(hex: string) {
  const [r, g, b] = hexRgb(hex).map((v) => v / 255)
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  return mx === 0 ? 0 : (mx - mn) / mx
}
const dist = (a: string, b: string) => {
  const x = hexRgb(a)
  const y = hexRgb(b)
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

type Tone = { color: string; work?: Work }

/** Оттенки из работ: без повторов, сначала ближайший к цвету темы, дальше — от насыщенных к спокойным */
export function tonesOf(data: Data, accent: string, max = 6): Tone[] {
  const seen = new Set<string>()
  const list: Tone[] = []
  for (const w of data.works) {
    if (!w.tone || seen.has(w.tone.toLowerCase())) continue
    seen.add(w.tone.toLowerCase())
    list.push({ color: w.tone, work: w })
  }
  if (!list.length) return [{ color: accent, work: data.works.find((w) => w.featured) ?? data.works[0] }]
  list.sort((a, b) => saturation(b.color) - saturation(a.color))
  const first = list.reduce((best, t) => (dist(t.color, accent) < dist(best.color, accent) ? t : best), list[0])
  return [first, ...list.filter((t) => t !== first)].slice(0, max)
}

// Мазок: от нижнего левого края вверх-вправо, к «линзе» с фото
const STROKE = 'M70 650 C 280 575, 430 520, 560 430 S 740 250, 800 240'
const LENS = { x: 790, y: 250, r: 178 }

/** Сдвиги следов кисти поперёк мазка: направление мазка ≈ (0.87, −0.49), поперёк — (0.49, 0.87) */
const STREAKS = [-68, -48, -27, -10, 8, 24, 42, 62].map((k, i) => ({ dx: k * 0.49, dy: k * 0.87, w: [3, 1.5, 4, 2, 3, 1.5, 3.5, 2][i], light: i % 2 === 0 }))

function Swatch({ color, id, animate }: { color: string; id: string; animate: boolean }) {
  const deep = mixHex(color, '#000000', 0.16)
  const thin = mixHex(color, '#ffffff', 0.14)
  const rim = mixHex(color, '#000000', 0.26)
  return (
    <g className={`c-swatch ${animate ? 'is-drawing' : ''}`}>
      <defs>
        {/* Лак гуще в начале мазка и тоньше к концу — цвет вдоль мазка, а не поперёк (иначе выходит «трубка») */}
        <linearGradient id={`g-${id}`} gradientUnits="userSpaceOnUse" x1="120" y1="640" x2="800" y2="240">
          <stop offset="0" stopColor={deep} />
          <stop offset="0.55" stopColor={color} />
          <stop offset="1" stopColor={thin} />
        </linearGradient>
      </defs>
      <path className="c-shadow" d={STROKE} pathLength={1} />
      <g filter="url(#c-rough)">
        <path className="c-rim" d={STROKE} pathLength={1} stroke={rim} />
        <path className="c-body" d={STROKE} pathLength={1} stroke={`url(#g-${id})`} />
        {STREAKS.map((t, i) => (
          <path key={i} className="c-streak" d={STROKE} pathLength={1} stroke={t.light ? thin : rim} strokeWidth={t.w} transform={`translate(${t.dx.toFixed(1)} ${t.dy.toFixed(1)})`} />
        ))}
      </g>
      <path className="c-gloss" d={STROKE} pathLength={1} transform="translate(-8 -14)" />
      <path className="c-spark" d={STROKE} pathLength={1} transform="translate(-14 -26)" />
    </g>
  )
}

export function HeroColor({ data, concept }: { data: Data; concept: Concept }) {
  const tones = useMemo(() => tonesOf(data, concept.theme.accent), [data, concept.theme.accent])
  const [idx, setIdx] = useState(0)
  const [layers, setLayers] = useState<{ key: number; color: string }[]>([{ key: 0, color: tones[0].color }])
  const [touched, setTouched] = useState(false)
  const section = useRef<HTMLElement>(null)
  const cur = tones[Math.min(idx, tones.length - 1)]
  const work = cur.work
  const service = data.services.find((s) => s.id === work?.serviceId)
  const reduce = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  const choose = (i: number, byUser = true) => {
    if (byUser) setTouched(true)
    if (i === idx) return
    setIdx(i)
    setLayers((ls) => [...ls.slice(-1), { key: (ls[ls.length - 1]?.key ?? 0) + 1, color: tones[i].color }])
  }

  // Предыдущий мазок остаётся под новым, пока тот не дорисуется
  useEffect(() => {
    if (layers.length < 2) return
    const t = setTimeout(() => setLayers((ls) => ls.slice(-1)), 1300)
    return () => clearTimeout(t)
  }, [layers])

  // Сам перебирает оттенки, пока посетитель не выбрал свой и пока первый экран на виду
  useEffect(() => {
    if (touched || reduce || tones.length < 2) return
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    if (section.current) io.observe(section.current)
    const t = setInterval(() => visible && !document.hidden && choose((idx + 1) % tones.length, false), 5600)
    return () => (clearInterval(t), io.disconnect())
  })

  // Акцент страницы следует за оттенком, если он достаточно контрастен к фону
  useEffect(() => applyAccent(cur.color, concept.theme), [cur.color, concept.theme])

  const book = () => {
    if (service) select({ serviceId: service.id, ...(data.masters.length > 1 && work?.masterId ? { masterId: work.masterId } : {}) })
    scrollToId('booking')
  }

  return (
    <section className="hero-c" id="top" data-hero="light" ref={section} style={{ '--tone': cur.color, '--tone-soft': mixHex(cur.color, concept.theme.paper, 0.78) } as React.CSSProperties}>
      <div className="wrap-wide c-grid">
        <div className="c-copy">
          <p className="h-kicker">
            {data.studio.name} · {data.studio.kind} · {data.studio.city}
          </p>
          <h1>{typo(concept.title)}</h1>
          <p className="h-lead">{typo(concept.lead)}</p>
          {tones.length > 1 && (
            <div className="c-tones" role="radiogroup" aria-label="Оттенок">
              {tones.map((t, i) => (
                <button key={t.color} role="radio" aria-checked={i === idx} className="c-tone" style={{ '--c': t.color } as React.CSSProperties} onClick={() => choose(i)} aria-label={t.work?.title ?? t.color} title={t.work?.title} />
              ))}
            </div>
          )}
          <div className="h-cta">
            <button className="btn h-btn" onClick={book}>
              {service ? 'Записаться на такой цвет' : 'Выбрать время'} <Arrow size={16} className="arrow" />
            </button>
          </div>
        </div>
        <figure className="c-object">
          <svg viewBox="0 0 1000 800" className="c-svg" role="img" aria-label={work ? `Оттенок: ${work.title}` : 'Оттенок студии'}>
            <defs>
              <clipPath id="c-lens">
                <circle cx={LENS.x} cy={LENS.y} r={LENS.r} />
              </clipPath>
              {/* Области фильтров — в координатах холста: по умолчанию они считаются от контура без толщины линии и обрезают мазок */}
              <filter id="c-blur" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1200" height="1000">
                <feGaussianBlur stdDeviation="14" />
              </filter>
              <filter id="c-soft" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1200" height="1000">
                <feGaussianBlur stdDeviation="5" />
              </filter>
              {/* Неровный край, как у настоящего мазка кистью */}
              <filter id="c-rough" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1200" height="1000">
                <feTurbulence type="fractalNoise" baseFrequency="0.022 0.005" numOctaves="1" seed="7" />
                <feDisplacementMap in="SourceGraphic" scale="5" />
              </filter>
            </defs>
            {layers.map((l, i) => (
              <Swatch key={l.key} id={`s${l.key}`} color={l.color} animate={!reduce && (l.key > 0 || i === layers.length - 1)} />
            ))}
            <g className="c-lens" key={work?.id ?? 'none'}>
              <circle className="c-lens-shadow" cx={LENS.x} cy={LENS.y + 22} r={LENS.r} />
              {work && <image href={photoUrl(work.photo, 800)} x={LENS.x - LENS.r} y={LENS.y - LENS.r} width={LENS.r * 2} height={LENS.r * 2} preserveAspectRatio="xMidYMid slice" clipPath="url(#c-lens)" />}
              <circle className="c-lens-ring" cx={LENS.x} cy={LENS.y} r={LENS.r - 5} />
              <ellipse className="c-lens-gloss" cx={LENS.x - 60} cy={LENS.y - 92} rx="70" ry="26" transform={`rotate(-28 ${LENS.x - 60} ${LENS.y - 92})`} />
            </g>
          </svg>
          {work && (
            <figcaption className="c-cap" key={work.id}>
              <b>{work.title}</b>
              {service && (
                <span>
                  {service.title} · {priceLabel(service)}
                </span>
              )}
            </figcaption>
          )}
        </figure>
      </div>
      <div className="wrap-wide c-foot">
        <HeroFacts data={data} />
      </div>
    </section>
  )
}
