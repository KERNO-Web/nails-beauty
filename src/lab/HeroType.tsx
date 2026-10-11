// Концепция 2 — «Типографика как пространство». Услуги студии набраны во всю ширину — каждая строка подогнана
// по оси ширины шрифта (Roboto Flex, 25–151 %). Одно фото вплетено между строками: часть строк проходит перед
// снимком, часть — за ним. При загрузке строки «сжимаются» из широких тонких в узкие плотные, при прокрутке
// расходятся в разные стороны. Слова берутся из списка услуг, поэтому у другой студии будут свои строки.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Data } from '../data/types'
import { Photo, typo, useMedia } from '../lib/ui'
import type { Concept } from './concepts'
import { HeroCta, HeroFacts } from './HeroParts'

/** Строки — первые слова услуг без повторов: сначала по одной из каждой категории («Маникюр», «Педикюр», «Дизайн»),
 * потом остальные услуги для рук и ног, дополнительные — в последнюю очередь */
export function serviceWords(data: Data, max = 4) {
  const first = (c: string) => data.services.filter((s) => s.category === c).map((s) => s.title.split(/[\s+,]+/)[0])
  const [hands, feet, extra] = [first('hands'), first('feet'), first('extra')]
  const order = [hands[0], feet[0], extra[0], ...hands.slice(1), ...feet.slice(1), ...extra.slice(1)]
  const words: string[] = []
  for (const w of order) if (w && words.length < max && !words.some((x) => x.toLowerCase() === w.toLowerCase())) words.push(w)
  return words.length ? words : [data.studio.name]
}

type Fit = { stretch: number; size: number; track?: number }

/** Подобрать ширину шрифта так, чтобы строка ровно заняла контейнер; если и самая узкая не влезает — уменьшить кегль */
function fitLine(probe: HTMLSpanElement, text: string, width: number, size: number, weight: number): Fit {
  probe.textContent = text
  probe.style.fontSize = `${size}px`
  probe.style.fontWeight = String(weight)
  const at = (st: number) => ((probe.style.fontStretch = `${st}%`), probe.getBoundingClientRect().width)
  let lo = 25
  let hi = 151
  if (at(lo) > width) return { stretch: 25, size: Math.floor((size * width) / at(25)) }
  // Короткое слово и в самой широкой ширине не достаёт до края — добираем разрядкой
  if (at(hi) < width) return { stretch: 151, size, track: (width - at(151)) / Math.max(1, text.length - 1) }
  for (let i = 0; i < 9; i++) {
    const mid = (lo + hi) / 2
    if (at(mid) > width) hi = mid
    else lo = mid
  }
  return { stretch: lo, size }
}

const WEIGHT = { front: 860, back: 230 }

export function HeroType({ data, concept }: { data: Data; concept: Concept }) {
  const s = data.studio
  // На компьютере три строки — так они крупнее и кнопка записи остаётся в первом экране; на телефоне четыре
  const wide = useMedia('(min-width: 900px)')
  const words = serviceWords(data, wide ? 3 : 4)
  const photo = s.heroPhoto || data.works[0]?.photo
  const lines = useRef<HTMLDivElement>(null)
  const probe = useRef<HTMLSpanElement>(null)
  const section = useRef<HTMLElement>(null)
  const [fits, setFits] = useState<Fit[] | null>(null)
  const [set, setSet] = useState(false)

  useLayoutEffect(() => {
    const box = lines.current
    const pr = probe.current
    if (!box || !pr) return
    let frame = 0
    const run = () => {
      const width = box.clientWidth
      // Кегль — от ширины, но так, чтобы на компьютере строки и кнопка записи вместились в первый экран
      const byHeight = width < 700 ? Infinity : (window.innerHeight - 340) / (0.88 * words.length)
      const size = Math.max(40, Math.min(width * (width < 700 ? 0.235 : 0.15), byHeight, 220))
      setFits(words.map((w, i) => fitLine(pr, w, width, size, i % 2 ? WEIGHT.back : WEIGHT.front)))
    }
    const later = () => (cancelAnimationFrame(frame), (frame = requestAnimationFrame(run)))
    run()
    // Шрифт мог догрузиться позже первого замера — пересчитать
    document.fonts?.ready.then(later)
    const ro = new ResizeObserver(later)
    ro.observe(box)
    return () => (ro.disconnect(), cancelAnimationFrame(frame))
  }, [words.join('|')])

  useEffect(() => {
    if (!fits || set) return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSet(true)))
    return () => cancelAnimationFrame(id)
  }, [fits, set])

  useEffect(() => {
    const sec = section.current
    if (!sec || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => sec.style.setProperty('--sy', String(Math.min(window.scrollY, window.innerHeight * 1.2))))
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => (window.removeEventListener('scroll', on), cancelAnimationFrame(raf))
  }, [])

  return (
    <section className={`hero-t ${set ? 'is-set' : ''}`} id="top" data-hero="light" ref={section}>
      <div className="wrap-wide t-wrap">
        <div className="t-top">
          <p className="h-kicker">
            {s.name} · {s.city}
          </p>
          <h1 className="t-title">{typo(concept.title)}</h1>
        </div>
        <div className="t-lines" ref={lines} aria-hidden>
          <span className="t-probe" ref={probe} />
          {words.map((w, i) => (
            <span
              key={w}
              className={`t-line ${i % 2 ? 'is-back' : 'is-front'}`}
              style={
                {
                  '--st': `${fits?.[i]?.stretch ?? 100}%`,
                  '--fs': `${fits?.[i]?.size ?? 100}px`,
                  '--tr': `${fits?.[i]?.track ?? 0}px`,
                  '--wt': i % 2 ? WEIGHT.back : WEIGHT.front,
                  '--dir': i % 2 ? 1 : -1,
                  '--i': i,
                } as React.CSSProperties
              }
            >
              {w}
            </span>
          ))}
          {photo && (
            <figure className={`t-photo n${words.length}`}>
              <Photo photo={photo} w={900} sizes="(min-width: 900px) 30vw, 46vw" alt="Работа студии" fetchPriority="high" />
            </figure>
          )}
        </div>
        <div className="t-bottom">
          <div className="t-offer">
            <p className="h-lead">{typo(concept.lead)}</p>
            <HeroCta />
          </div>
          <HeroFacts data={data} />
        </div>
      </div>
    </section>
  )
}
