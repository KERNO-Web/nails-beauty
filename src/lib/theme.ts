// Тема студии → CSS-переменные на <html>. Палитра — одна из трёх готовых (у каждой выверен контраст);
// свой акцент студии подменяет только тёмный цвет палитры и затемняется, пока текст на нём читается.
import type { Theme, ThemePreset } from '../data/types'

export type Palette = {
  label: string
  paper: string
  canvas: string
  ink: string
  /** Тёмный фирменный цвет: кнопки, тёмные поля */
  wine: string
  /** Мягкий акцент: мелкие детали */
  rose: string
  line: string
  white: string
  muted: string
}

export const PRESETS: Record<ThemePreset, Palette> = {
  mulberry: { label: 'Шелковица', paper: '#F7F4F0', canvas: '#EEE8E4', ink: '#241C20', wine: '#552A3A', rose: '#D8A1A6', line: '#D4CBCB', white: '#FFFCFB', muted: '#6D6266' },
  taupe: { label: 'Тёплый тауп', paper: '#F6F4F0', canvas: '#ECE7E0', ink: '#22201D', wine: '#3B332D', rose: '#C38E63', line: '#D7CFC5', white: '#FFFDFA', muted: '#6A635C' },
  rose: { label: 'Пыльная роза', paper: '#F8F3F1', canvas: '#F0E5E2', ink: '#2A1D22', wine: '#7A2E4C', rose: '#E2A3B1', line: '#DDCCCC', white: '#FFFBFB', muted: '#725F66' },
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
  for (let i = 0; i < 12 && contrast(hex(c), p.white) < 7; i++) c = c.map((v, k) => v * 0.85 + ink[k] * 0.15)
  return hex(c)
}

export function paletteOf(t: Theme): Palette {
  const p = PRESETS[t.preset ?? 'mulberry'] ?? PRESETS.mulberry
  return isHex(t.accent) && t.accent.toLowerCase() !== p.wine.toLowerCase() ? { ...p, wine: darkAccent(t.accent, p) } : p
}

export function applyTheme(t: Theme) {
  const p = paletteOf(t)
  const root = document.documentElement
  const st = root.style
  root.dataset.palette = t.preset ?? 'mulberry'
  st.setProperty('--color-paper', p.paper)
  st.setProperty('--color-canvas', p.canvas)
  st.setProperty('--color-ink', p.ink)
  st.setProperty('--color-wine', p.wine)
  st.setProperty('--color-rose', p.rose)
  st.setProperty('--color-line', p.line)
  st.setProperty('--color-white', p.white)
  st.setProperty('--color-muted', p.muted)
  // Кабинет и окна уведомлений считают цвета от этих трёх
  st.setProperty('--accent', p.wine)
  st.setProperty('--on-accent', p.white)
  st.setProperty('--paper', p.paper)
  st.setProperty('--ink', p.ink)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.paper)
}
