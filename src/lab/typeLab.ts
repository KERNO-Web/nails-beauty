// Прослушивание шрифта заголовка на утверждённом первом экране «Живой материал».
// Внутренний режим просмотра: три шрифтовые системы на одном и том же кадре, фото, тексте и анимации.
// Перед запуском удалить вместе с LabSwitch; выбранная система останется одним классом заголовка.
import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

export type FontId = 'a' | 'b' | 'c'
export type CopyId = '1' | '2' | '3'

/** Шрифт выбирается один на весь сайт: заголовок первого экрана, заголовки разделов, названия услуг, имена мастеров */
export const FONTS: { id: FontId; letter: string; label: string; note: string; family: string }[] = [
  { id: 'a', letter: 'A', label: 'Wix Madefor', note: 'чёткий современный гротеск', family: "'Wix Madefor Display Variable', system-ui, sans-serif" },
  { id: 'b', letter: 'B', label: 'Geologica', note: 'мягкая округлая геометрия', family: "'Geologica Variable', system-ui, sans-serif" },
  { id: 'c', letter: 'C', label: 'Unbounded', note: 'широкий, с характером', family: "'Unbounded Variable', system-ui, sans-serif" },
]

/** Строки заголовка заданы вручную — переносы осмысленные, короткие слова не отрываются */
export const COPIES: { id: CopyId; lines: string[]; text: string }[] = [
  { id: '1', lines: ['Красота', 'в деталях'], text: 'Красота в деталях' },
  { id: '2', lines: ['Маникюр', 'с характером'], text: 'Маникюр с характером' },
  { id: '3', lines: ['Всё решают', 'детали'], text: 'Всё решают детали' },
]

export const LEAD = 'Маникюр, педикюр и дизайн — с ценами на сайте и записью онлайн на свободное время.'

type State = { font: FontId; copy: CopyId }
const q = new URLSearchParams(location.search)
const isFont = (x: unknown): x is FontId => FONTS.some((f) => f.id === x)
const isCopy = (x: unknown): x is CopyId => COPIES.some((c) => c.id === x)
let state: State = { font: isFont(q.get('font')) ? (q.get('font') as FontId) : 'a', copy: isCopy(q.get('copy')) ? (q.get('copy') as CopyId) : '1' }
const listeners = new Set<() => void>()

export function useTypeLab() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )
}

export function setTypeLab(patch: Partial<State>) {
  const apply = () => {
    state = { ...state, ...patch }
    const url = new URL(location.href)
    url.searchParams.set('font', state.font)
    url.searchParams.set('copy', state.copy)
    history.replaceState(null, '', url)
    flushSync(() => {
      for (const l of listeners) l()
    })
  }
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (doc.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) doc.startViewTransition(apply)
  else apply()
}
