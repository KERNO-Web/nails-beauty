// Данные конкретного салона. На zapisvonline.ru/<slug> сборка одна на всех, а данные салона
// (salons/<slug>.json) скрипт сборки вшивает в его index.html как window.__STUDIO__.
import { demo } from './demo'
import { fromConfig, type SiteConfig } from './config'
import type { Data } from './types'

export type { SiteConfig }

// Только при разработке: ?fixture=<имя> — проверочные студии из fixtures/ (в сборку не попадают)
const fixtures: Record<string, SiteConfig> = import.meta.env.DEV
  ? Object.fromEntries(
      Object.entries(import.meta.glob<SiteConfig>('../../fixtures/*.json', { eager: true, import: 'default' })).map(([k, v]) => [k.split('/').pop()!.replace('.json', ''), v]),
    )
  : {}
const params = import.meta.env.DEV ? new URLSearchParams(location.search) : null
const fixture = params?.get('fixture')
// ?works=N — демо LUMI с N разными работами (2…15): проверка раскладки галереи
const worksN = Number(params?.get('works'))
const EXTRA_WORKS = ['photo-1772983166346-93afb9898264', 'photo-1707725238063-0c54fb6963d1', 'photo-1753285310651-6974a839c992'].map((photo, i) => ({ id: `x${i}`, photo, tag: 'minimal' as const, title: `Работа ${13 + i}`, serviceId: 'manicure-gel', masterId: 'vera' }))
const galleryFixture: SiteConfig | undefined = worksN ? { slug: `fixture-works-${worksN}`, base: 'lumi-demo', works: [...demo.works, ...EXTRA_WORKS].slice(0, worksN) } : undefined

const config = galleryFixture || (fixture && fixtures[fixture]) || (globalThis as { __STUDIO__?: SiteConfig }).__STUDIO__

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/** Исходные данные этого сайта */
export const initial: Data = config ? fromConfig(config) : demo

/** Демо-сайт: вымышленные данные допустимы и помечаются */
export const isDemo = !config || config.base === 'lumi-demo'

/**
 * Ключ хранилища в браузере: у каждого салона свой (все живут на одном домене),
 * а после правки файла салона — новый, чтобы не показывать старую копию.
 */
export const storageKey = config ? `nail-studio:${config.slug}:${hash(JSON.stringify(config))}` : 'nail-studio:data'
