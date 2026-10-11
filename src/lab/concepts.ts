// Лаборатория первого экрана: три направления на одном сайте, чтобы сравнить их рядом.
// Это внутренний режим просмотра, не часть клиентского сайта: в боевой версии останется одно направление,
// а его палитра и тексты уйдут в данные студии (theme / heroTitle).
import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import type { Theme } from '../data/types'

export type ConceptId = 'material' | 'type' | 'color'

export type Concept = {
  id: ConceptId
  n: number
  label: string
  /** Короткая подпись в переключателе */
  note: string
  theme: Theme
  /** Шрифт заголовков — CSS font-family */
  display: string
  title: string
  lead: string
}

export const CONCEPTS: Concept[] = [
  {
    id: 'material',
    n: 1,
    label: 'Живой материал',
    note: 'жидкий глянец',
    theme: { accent: '#5E4A55', paper: '#E9E6E2', ink: '#141113', nailShape: 'oval' },
    display: "'Wix Madefor Display Variable', system-ui, sans-serif",
    title: 'Ровный глянец, чистая кутикула',
    lead: 'Маникюр и педикюр с покрытием, которое держится три–четыре недели. Окна на ближайшие дни видно сразу.',
  },
  {
    id: 'type',
    n: 2,
    label: 'Типографика как пространство',
    note: 'буквы и фото в глубине',
    theme: { accent: '#E2462B', paper: '#ECEAE5', ink: '#121212', nailShape: 'square' },
    display: "'Roboto Flex Variable', 'Arial Narrow', sans-serif",
    title: 'Студия маникюра',
    lead: 'Аккуратная работа с кутикулой, ровное покрытие и дизайн любой сложности. Цены и свободное время — ниже.',
  },
  {
    id: 'color',
    n: 3,
    label: 'Цвет как объект',
    note: 'оттенок решает',
    theme: { accent: '#8E1730', paper: '#EEEBE6', ink: '#171415', nailShape: 'oval' },
    display: "'Unbounded Variable', system-ui, sans-serif",
    title: 'Какой цвет на этот раз?',
    lead: 'Оттенки из наших последних работ. Выберите цвет — покажем его на руках и запишем на свободное время.',
  },
]

const isId = (x: unknown): x is ConceptId => CONCEPTS.some((c) => c.id === x)

/** Утверждена концепция «Живой материал» — она по умолчанию; две другие доступны только по ссылке ?concept=type|color */
function initial(): ConceptId {
  const q = new URLSearchParams(location.search).get('concept')
  return isId(q) ? q : 'material'
}

let current: ConceptId = initial()
const listeners = new Set<() => void>()

export function useConcept() {
  const id = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
  )
  return CONCEPTS.find((c) => c.id === id)!
}

/** Переключить концепцию; с View Transitions — плавной сменой кадра */
export function setConcept(id: ConceptId) {
  if (id === current) return
  const apply = () => {
    current = id
    const url = new URL(location.href)
    url.searchParams.set('concept', id)
    history.replaceState(null, '', url)
    // View Transition снимает кадр после колбэка — DOM должен обновиться синхронно
    flushSync(() => {
      for (const l of listeners) l()
    })
  }
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (doc.startViewTransition && !reduce) doc.startViewTransition(apply)
  else apply()
}

/** Лаборатория включена по умолчанию в этой сборке; ?lab=0 — посмотреть страницу без переключателя */
export const labVisible = () => new URLSearchParams(location.search).get('lab') !== '0'
