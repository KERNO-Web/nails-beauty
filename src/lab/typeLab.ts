// Подбор шрифтов на утверждённом первом экране «Живой материал». Внутренний режим просмотра.
// Независимые выборы: шрифт заголовков (первый экран, разделы, логотип), названий услуг и блока «Мастера».
// Выбор заказчика: заголовок — Lora, услуги — Comfortaa, текст «Красота в деталях» (стоят по умолчанию).
// Перед запуском: перенести выбранные значения в CSS-переменные темы и удалить LabSwitch и этот файл.
import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

export type LabFont = {
  id: string
  label: string
  note: string
  family: string
  /** Заголовок первого экрана: вес, разрядка, масштаб кегля (широким шрифтам — меньше) */
  hero: { w: number; ls: string; scale: number }
  /** Названия услуг: вес и разрядка */
  name: { w: number; ls: string }
}

const f = (id: string, label: string, note: string, family: string, hero: LabFont['hero'], name: LabFont['name']): LabFont => ({
  id,
  label,
  note,
  family: `'${family}', system-ui, sans-serif`,
  hero,
  name,
})

/** Все с кириллицей и настоящими весами (переменные шрифты, OFL) */
export const FONTS: LabFont[] = [
  f('jost', 'Jost', 'в духе Futura: геометрия, «модный» классический гротеск', 'Jost Variable', { w: 450, ls: '-0.035em', scale: 1.05 }, { w: 500, ls: '-0.01em' }),
  f('montserrat', 'Montserrat', 'широкая геометрия, привычная и уверенная', 'Montserrat Variable', { w: 500, ls: '-0.045em', scale: 0.9 }, { w: 600, ls: '-0.02em' }),
  f('manrope', 'Manrope', 'современный гротеск, в духе Gilroy', 'Manrope Variable', { w: 500, ls: '-0.05em', scale: 1 }, { w: 650, ls: '-0.02em' }),
  f('raleway', 'Raleway', 'изящная геометрия с тонкими деталями', 'Raleway Variable', { w: 450, ls: '-0.03em', scale: 0.98 }, { w: 600, ls: '-0.01em' }),
  f('rubik', 'Rubik', 'мягкие скругления, дружелюбный', 'Rubik Variable', { w: 450, ls: '-0.04em', scale: 0.98 }, { w: 500, ls: '-0.015em' }),
  f('comfortaa', 'Comfortaa', 'округлый, нежный', 'Comfortaa Variable', { w: 500, ls: '-0.05em', scale: 0.9 }, { w: 700, ls: '-0.02em' }),
  f('geologica', 'Geologica', 'мягкая округлая геометрия', 'Geologica Variable', { w: 400, ls: '-0.045em', scale: 1 }, { w: 550, ls: '-0.02em' }),
  f('unbounded', 'Unbounded', 'широкий, с характером', 'Unbounded Variable', { w: 340, ls: '-0.055em', scale: 0.86 }, { w: 500, ls: '-0.04em' }),
  f('lora', 'Lora', 'мягкая книжная антиква без резкого контраста', 'Lora Variable', { w: 500, ls: '-0.025em', scale: 1 }, { w: 600, ls: '-0.01em' }),
]

export type CopyId = '1' | '2' | '3'

/** Строки заголовка заданы вручную — переносы осмысленные, короткие слова не отрываются */
export const COPIES: { id: CopyId; lines: string[]; text: string }[] = [
  { id: '1', lines: ['Красота', 'в деталях'], text: 'Красота в деталях' },
  { id: '2', lines: ['Маникюр', 'с характером'], text: 'Маникюр с характером' },
  { id: '3', lines: ['Всё решают', 'детали'], text: 'Всё решают детали' },
]

export const LEAD = 'Маникюр, педикюр и дизайн — с ценами на сайте и записью онлайн на свободное время.'

type State = { hero: string; names: string; masters: string; copy: CopyId }
const q = new URLSearchParams(location.search)
const isFont = (x: string | null) => !!x && FONTS.some((v) => v.id === x)
const isCopy = (x: unknown): x is CopyId => COPIES.some((c) => c.id === x)
let state: State = {
  hero: isFont(q.get('hero')) ? q.get('hero')! : 'lora',
  names: isFont(q.get('names')) ? q.get('names')! : 'comfortaa',
  masters: isFont(q.get('masters')) ? q.get('masters')! : 'comfortaa',
  copy: isCopy(q.get('copy')) ? (q.get('copy') as CopyId) : '1',
}
const listeners = new Set<() => void>()

export const fontById = (id: string) => FONTS.find((v) => v.id === id) ?? FONTS[0]

export function useTypeLab() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )
}

export function setTypeLab(patch: Partial<State>) {
  state = { ...state, ...patch }
  const url = new URL(location.href)
  url.searchParams.delete('font')
  url.searchParams.set('hero', state.hero)
  url.searchParams.set('names', state.names)
  url.searchParams.set('masters', state.masters)
  url.searchParams.set('copy', state.copy)
  history.replaceState(null, '', url)
  flushSync(() => {
    for (const l of listeners) l()
  })
}
