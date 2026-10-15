// Размер названия студии на первом экране — по его настоящей ширине, а не по числу букв.
// Короткое имя (LUMI, БЛИК) встаёт крупно в левые четыре колонки, и фото начинается там, где оно кончается.
// Длиннее — во всю строку над фото. Совсем длинное («Маникюрная мастерская Анны Ивановой») — аккуратный
// логотип, а крупным становится заголовок. Никаких ручных правок под клиента и обрезанных букв.
import { useLayoutEffect, useState, type RefObject } from 'react'

export type MarkVariant = 'short' | 'wide' | 'compact'
export type Mark = { variant: MarkVariant; size: number; wrap: boolean }

const DESKTOP = 900

/** Ширина текста при font-size 100px — тем же шрифтом и трекингом, что у названия */
function measure(texts: string[]) {
  const probe = document.createElement('span')
  probe.className = 'hero-mark-probe'
  probe.setAttribute('aria-hidden', 'true')
  document.body.appendChild(probe)
  const out = texts.map((t) => {
    probe.textContent = t
    return probe.getBoundingClientRect().width / 100
  })
  probe.remove()
  return out
}

const clamp = (min: number, v: number, max: number) => Math.max(min, Math.min(max, v))

export function fitMark(name: string, stageWidth: number, viewport: number, gap: number): Mark {
  const words = name.trim().split(/\s+/)
  const [full, ...wordW] = measure([name.trim(), ...words])
  if (!full) return { variant: 'compact', size: 40, wrap: true }
  const longest = Math.max(...wordW)
  if (viewport >= DESKTOP) {
    const max = clamp(88, viewport * 0.118, 172)
    const col = (stageWidth - gap * 11) / 12
    const slot4 = col * 4 + gap * 3
    const slot9 = col * 9 + gap * 8
    const short = slot4 / full
    if (short >= max * 0.86) return { variant: 'short', size: Math.floor(Math.min(max, short)), wrap: false }
    const wide = Math.min(max, slot9 / full)
    if (wide >= 72) return { variant: 'wide', size: Math.floor(wide), wrap: false }
    return { variant: 'compact', size: Math.floor(clamp(34, viewport * 0.032, 46)), wrap: true }
  }
  const max = clamp(60, viewport * 0.22, 86)
  const one = Math.min(max, stageWidth / full)
  if (one >= 52) return { variant: 'short', size: Math.floor(one), wrap: false }
  if (words.length <= 3) {
    const two = Math.min(max * 0.9, stageWidth / longest)
    if (two >= 46) return { variant: 'wide', size: Math.floor(two), wrap: true }
  }
  return { variant: 'compact', size: Math.floor(clamp(28, viewport * 0.085, 34)), wrap: true }
}

export function useWordmark(name: string, stage: RefObject<HTMLElement | null>) {
  const [mark, setMark] = useState<Mark>({ variant: 'short', size: 120, wrap: false })
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const run = () => {
      const cs = getComputedStyle(el)
      const gap = parseFloat(cs.getPropertyValue('--gap')) || 22
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const next = fitMark(name, w, window.innerWidth, gap)
      setMark((m) => (m.variant === next.variant && m.size === next.size && m.wrap === next.wrap ? m : next))
    }
    run()
    // Пока шрифт не пришёл, ширина считается по запасному — пересчитываем, когда он загрузится
    document.fonts?.ready.then(run)
    const ro = new ResizeObserver(run)
    ro.observe(el)
    return () => ro.disconnect()
  }, [name, stage])
  return mark
}
