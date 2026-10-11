// Что клиент выбирает для записи. Общее для всей страницы: карточка услуги, работа в галерее
// или карточка мастера могут сразу подставить выбор в блок записи.
import { useSyncExternalStore } from 'react'

export type Selection = {
  serviceId: string | null
  /** null — «любой свободный мастер» */
  masterId: string | null
  date: string | null
  time: number | null
}

let sel: Selection = { serviceId: null, masterId: null, date: null, time: null }
const listeners = new Set<() => void>()

export function useSelection() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => sel,
  )
}

export function select(patch: Partial<Selection>) {
  sel = { ...sel, ...patch }
  // Сменили услугу или мастера — выбранное время могло перестать подходить
  if ('serviceId' in patch || 'masterId' in patch) sel.time = patch.time ?? null
  if ('date' in patch && !('time' in patch)) sel.time = null
  for (const l of listeners) l()
}

export function resetSelection() {
  sel = { serviceId: null, masterId: null, date: null, time: null }
  for (const l of listeners) l()
}
