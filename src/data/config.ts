// Файл салона → данные сайта. Без зависимостей от браузера и Vite: этим же пользуется сборка (scripts/build-sites.mjs).
//
// Вымышленное содержимое LUMI (мастера, отзывы, работы, адрес) достаётся салону, только если в его файле
// явно написано "base": "lumi-demo". Иначе всё, чего нет в файле, — пусто: у настоящей студии
// не появятся чужие мастера, выдуманные отзывы и демо-занятость.
import { demo } from './demo.ts'
import type { Data, Master, Review, Service, Studio, Theme, Work } from './types.ts'

export type SiteConfig = {
  slug: string
  /** "lumi-demo" — взять недостающее из демо LUMI (только для демо-сайтов) */
  base?: 'lumi-demo'
  studio?: Partial<Studio>
  theme?: Partial<Theme>
  masters?: Master[]
  services?: Service[]
  works?: Work[]
  reviews?: Review[]
}

/** Пустая студия: только технические настройки по умолчанию, никаких вымышленных фактов */
export const blankStudio: Studio = {
  name: 'Студия',
  kind: 'студия маникюра',
  city: '',
  address: '',
  addressNote: '',
  map: [0, 0],
  phone: '',
  telegram: '',
  whatsapp: '',
  vk: '',
  heroTitle: '',
  heroLead: '',
  heroPhoto: '',
  booking: { mode: 'native' },
  stepMin: 30,
  bufferMin: 0,
  horizonDays: 21,
  confirmNote: 'Мастер подтвердит запись и напомнит о визите.',
  demoBusy: false,
}

const blankTheme: Theme = { preset: 'mulberry' }

/** Данные сайта из файла салона. Экспорт — для сборки и проверок */
export function fromConfig(config: SiteConfig): Data {
  if (config.base === 'lumi-demo')
    return {
      ...demo,
      studio: { ...demo.studio, ...config.studio },
      theme: { ...demo.theme, ...config.theme },
      masters: config.masters ?? demo.masters,
      services: config.services ?? demo.services,
      works: config.works ?? demo.works,
      reviews: config.reviews ?? demo.reviews,
      bookings: [],
    }
  return {
    version: demo.version,
    // Демо-занятость у настоящего салона не включается даже по ошибке в файле
    studio: { ...blankStudio, ...config.studio, demoBusy: false },
    theme: { ...blankTheme, ...config.theme },
    masters: config.masters ?? [],
    services: config.services ?? [],
    works: config.works ?? [],
    reviews: (config.reviews ?? []).filter((r) => !r.demo),
    bookings: [],
  }
}

