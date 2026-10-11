// Данные конкретного салона. На zapisvonline.ru/<slug> сборка одна на всех, а данные салона
// (salons/<slug>.json) скрипт сборки вшивает в его index.html как window.__STUDIO__.
// Чего в файле салона нет — берётся из демо (studio и theme — по полям, списки — целиком).
import { demo } from './demo'
import type { Data, Master, Review, Service, Studio, Theme, Work } from './types'

export type SiteConfig = {
  slug: string
  studio?: Partial<Studio>
  theme?: Partial<Theme>
  masters?: Master[]
  services?: Service[]
  works?: Work[]
  reviews?: Review[]
}

const config = (globalThis as { __STUDIO__?: SiteConfig }).__STUDIO__

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/** Исходные данные этого сайта */
export const initial: Data = config
  ? {
      ...demo,
      studio: { ...demo.studio, ...config.studio },
      theme: { ...demo.theme, ...config.theme },
      masters: config.masters ?? demo.masters,
      services: config.services ?? demo.services,
      works: config.works ?? demo.works,
      reviews: config.reviews ?? demo.reviews,
      bookings: [],
    }
  : demo

/**
 * Ключ хранилища в браузере: у каждого салона свой (все живут на одном домене),
 * а после правки файла салона — новый, чтобы не показывать старую копию.
 */
export const storageKey = config ? `nail-studio:${config.slug}:${hash(JSON.stringify(config))}` : 'nail-studio:data'
