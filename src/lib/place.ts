// Где студия и что о ней пишут — общее для первого экрана, отзывов и контактов
import type { Studio } from '../data/types'
import { plural } from './slots'

/** Маршрут до студии: своя ссылка из настроек или Яндекс Карты по точным координатам (откуда — определит сам сервис) */
export function routeUrl(s: Studio) {
  if (s.routeUrl) return s.routeUrl
  const [lon, lat] = s.map
  return `https://yandex.ru/maps/?rtext=~${lat}%2C${lon}`
}

/** 4.9 → «4,9» */
export const fmtRating = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const reviewsCount = (n: number) => `${n.toLocaleString('ru-RU')} ${plural(n, 'отзыв', 'отзыва', 'отзывов')}`

/** Внешняя карточка с отзывами — только если есть ссылка */
export const reviewsSource = (s: Studio) => (s.reviewsSource?.url ? s.reviewsSource : undefined)
