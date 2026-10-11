// Тема студии → CSS-переменные на <html>. Всё оформление считается от трёх цветов и формы ногтя.
import type { NailShape, Theme } from '../data/types'

/** Контур ногтя: viewBox 100×1000, кончик сверху, дальше прямоугольник. Маска растягивается по ширине,
 * поэтому кончик всегда одной пропорции, а «ноготь» может быть любой высоты (до 1:10) */
const NAIL_PATH: Record<NailShape, string> = {
  almond: 'M0 1000V120C0 74 28 20 45 4Q50 0 55 4C72 20 100 74 100 120V1000Z',
  oval: 'M0 1000V62C0 22 24 0 50 0C76 0 100 22 100 62V1000Z',
  square: 'M0 1000V16Q0 0 16 0H84Q100 0 100 16V1000Z',
  coffin: 'M0 1000V58Q0 52 3 47L20 4Q22 0 27 0H73Q78 0 80 4L97 47Q100 52 100 58V1000Z',
}

export function nailMask(shape: NailShape) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 1000' preserveAspectRatio='none'><path d='${NAIL_PATH[shape] ?? NAIL_PATH.almond}'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

function rgb(hex: string) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Относительная яркость (WCAG) */
export function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

export function applyTheme(t: Theme) {
  const root = document.documentElement.style
  // Текст на акценте: светлая бумага или тёмные чернила — что контрастнее
  const onAccent = contrast(t.accent, t.paper) >= contrast(t.accent, t.ink) ? t.paper : t.ink
  root.setProperty('--accent', t.accent)
  root.setProperty('--on-accent', onAccent)
  root.setProperty('--paper', t.paper)
  root.setProperty('--ink', t.ink)
  root.setProperty('--nail', nailMask(t.nailShape))
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.accent)
}
