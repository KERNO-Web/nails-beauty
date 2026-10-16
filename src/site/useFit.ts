// Размер названия студии по его настоящей ширине: короткое (LUMI, БЛИК) — крупно в одну строку,
// длиннее — в две строки по словам, совсем длинное — компактный логотип (тогда крупным становится заголовок).
// Работает для любого названия без ручной правки стилей.
import { useLayoutEffect, useState, type RefObject } from 'react'

export type Fit = { size: number; mode: 'big' | 'two' | 'compact' }

function widths(texts: string[]) {
  const probe = document.createElement('span')
  probe.className = 'fit-probe'
  probe.setAttribute('aria-hidden', 'true')
  document.body.appendChild(probe)
  const out = texts.map((t) => ((probe.textContent = t), probe.getBoundingClientRect().width / 100))
  probe.remove()
  return out
}

export function fitName(name: string, avail: number, max: number, min: number, compact: number): Fit {
  const words = name.trim().split(/\s+/)
  const [full, ...ws] = widths([name.trim(), ...words])
  if (!full) return { size: compact, mode: 'compact' }
  const one = Math.min(max, avail / full)
  if (one >= min) return { size: Math.floor(one), mode: 'big' }
  if (words.length <= 3) {
    const two = Math.min(max * 0.86, avail / Math.max(...ws))
    if (two >= min) return { size: Math.floor(two), mode: 'two' }
  }
  return { size: compact, mode: 'compact' }
}

/** box — элемент, в ширину которого должно поместиться название */
export function useFit(name: string, box: RefObject<HTMLElement | null>, opts: (vw: number) => { max: number; min: number; compact: number }) {
  const [fit, setFit] = useState<Fit>({ size: 120, mode: 'big' })
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const run = () => {
      const o = opts(window.innerWidth)
      const next = fitName(name, el.clientWidth, o.max, o.min, o.compact)
      setFit((f) => (f.size === next.size && f.mode === next.mode ? f : next))
    }
    run()
    document.fonts?.ready.then(run)
    const ro = new ResizeObserver(run)
    ro.observe(el)
    return () => ro.disconnect()
  }, [name, box])
  return fit
}
