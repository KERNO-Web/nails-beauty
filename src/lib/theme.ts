// Тема студии → CSS-переменные на <html>. Палитра — одна из трёх готовых (у каждой выверен контраст);
// свой акцент студии подменяет только тёмный цвет палитры и затемняется, пока текст на нём читается.
import type { Theme, ThemePreset } from '../data/types'

export type Palette = {
  label: string
  /** Фон страницы — тёплый фарфор */
  bg: string
  /** Белая поверхность карточек */
  surface: string
  /** Мягкое цветное поле (панель фото, мастера) */
  panel: string
  ink: string
  /** Тёмный акцент: кнопки, тёмные поля */
  accent: string
  /** Мягкий второй тон */
  soft: string
  /** Служебный тон — только для линий и декора, не для текста */
  muted: string
}

export const PRESETS: Record<ThemePreset, Palette> = {
  mulberry: { label: 'Бордо', bg: '#F6F1EB', surface: '#FFFCF8', panel: '#ECDDD8', ink: '#1E1720', accent: '#5B2030', soft: '#CDAEB7', muted: '#A5958B' },
  taupe: { label: 'Какао', bg: '#F5F0E9', surface: '#FFFCF7', panel: '#E7DBCD', ink: '#211915', accent: '#4A3126', soft: '#C9A98D', muted: '#A3958A' },
  rose: { label: 'Слива', bg: '#F7F1EF', surface: '#FFFBFA', panel: '#EDDCE1', ink: '#231A22', accent: '#5E2A4E', soft: '#D4B0C2', muted: '#A6929C' },
}

function rgb(hex: string) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const hex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/** Относительная яркость (WCAG) */
export function luminance(color: string) {
  const [r, g, b] = rgb(color).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const isHex = (s?: string): s is string => !!s && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)

/** Свой цвет студии → тёмный акцент, на котором светлый текст читается (≥ 7:1) */
function darkAccent(color: string, p: Palette) {
  let c = rgb(color)
  const ink = rgb(p.ink)
  for (let i = 0; i < 12 && contrast(hex(c), p.surface) < 7; i++) c = c.map((v, k) => v * 0.85 + ink[k] * 0.15)
  return hex(c)
}

export function paletteOf(t: Theme): Palette {
  const p = PRESETS[t.preset ?? 'mulberry'] ?? PRESETS.mulberry
  return isHex(t.accent) && t.accent.toLowerCase() !== p.accent.toLowerCase() ? { ...p, accent: darkAccent(t.accent, p) } : p
}

export function applyTheme(t: Theme) {
  const p = paletteOf(t)
  const root = document.documentElement
  const st = root.style
  root.dataset.palette = t.preset ?? 'mulberry'
  const set: Record<string, string> = { bg: p.bg, surface: p.surface, panel: p.panel, ink: p.ink, accent: p.accent, soft: p.soft, muted: p.muted }
  for (const [k, v] of Object.entries(set)) st.setProperty(`--c-${k}`, v)
  // Кабинет и окна уведомлений считают цвета от этих трёх
  st.setProperty('--accent', p.accent)
  st.setProperty('--on-accent', p.surface)
  st.setProperty('--paper', p.bg)
  st.setProperty('--ink', p.ink)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.bg)
}
