// Все данные студии. Шаблон под нового мастера = поменять demo.ts (или настроить в /#admin).

/** Часы работы на день недели; null — выходной */
export type DayHours = { open: string; close: string } | null

/** Понедельник…воскресенье (индекс 0 = Пн) */
export type WeekSchedule = [DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours]

export type Master = {
  id: string
  name: string
  /** Имя в дательном падеже для кнопки «Записаться к Анне» */
  nameDat?: string
  /** Коротко: «Наращивание и сложный дизайн» */
  role: string
  about: string
  /** Портрет мастера; нет — вместо портрета показываем его работы */
  photo?: string
  /** Стаж в годах — только если клиент его подтвердил; нет — не показываем */
  years?: number
  /** Ссылка на личное портфолио мастера: канал, страница (необязательно) */
  portfolio?: string
  schedule: WeekSchedule
  /** Отдельные выходные/отпуск, YYYY-MM-DD */
  daysOff: string[]
  /** Какие услуги делает; пусто — все */
  serviceIds: string[]
}

export type ServiceCategory = 'hands' | 'feet' | 'extra'

export type Service = {
  id: string
  title: string
  note: string
  minutes: number
  price: number
  /** Показывать «от» — цена зависит от длины/дизайна */
  priceFrom?: boolean
  category: ServiceCategory
  photo: string
  /** Плашка «Выбирают чаще всего» */
  popular?: boolean
}

export type WorkTag = 'nude' | 'minimal' | 'french' | 'bright' | 'design'

export type Work = {
  id: string
  photo: string
  tag: WorkTag
  title: string
  serviceId?: string
  masterId?: string
  /** Главная работа в галерее */
  featured?: boolean
  /** Точка фокуса при кадрировании, как CSS object-position: '50% 30%' */
  focus?: string
  /** Основной цвет покрытия на снимке, #RRGGBB (необязательно) — для выбора по цвету */
  tone?: string
}

export type Review = {
  id: string
  name: string
  service: string
  /** YYYY-MM-DD */
  date: string
  text: string
}

export type Booking = {
  id: string
  serviceId: string
  masterId: string
  /** YYYY-MM-DD */
  date: string
  /** Минуты от полуночи */
  start: number
  minutes: number
  name: string
  contact: string
  note?: string
  source: 'online' | 'manual'
  status: 'active' | 'cancelled'
  createdAt: string
}

/** Форма ногтя — силуэт окон с фото на первом экране и в акцентах */
export type NailShape = 'almond' | 'oval' | 'square' | 'coffin'

/** Внешний вид. Меняется под клиента вместе с фото — вёрстка общая */
export type Theme = {
  /** Цвет первого экрана и акцентов, #RRGGBB */
  accent: string
  /** Фон страницы */
  paper: string
  /** Основной текст и тёмные сцены */
  ink: string
  nailShape: NailShape
}

export type Studio = {
  name: string
  /** Подпись под названием в шапке: «nail studio» */
  kind: string
  /** Ссылка на логотип; нет — название текстом */
  logo?: string
  city: string
  address: string
  addressNote: string
  /** Долгота, широта — для карты */
  map: [number, number]
  phone: string
  telegram: string
  whatsapp: string
  vk: string
  /** Ссылка на отзывы на картах (необязательно) */
  reviewsUrl?: string
  /** Заголовок первого экрана. Пусто — «Маникюр и педикюр» (город и так стоит над заголовком) */
  heroTitle: string
  /** Одна-две фразы под заголовком (необязательно) */
  heroLead: string
  /** Главное фото первого экрана — средний, самый длинный «ноготь». Остальные берутся из работ */
  heroPhoto: string
  /** Шаг сетки времени, минут */
  stepMin: number
  /** Запас между клиентами, минут */
  bufferMin: number
  /** На сколько дней вперёд открыта запись */
  horizonDays: number
  /** Как клиент узнает о подтверждении — текст под кнопкой записи */
  confirmNote: string
  /** Демо: заполнять расписание выдуманными записями, чтобы сетка выглядела живой */
  demoBusy: boolean
  /** Пометка в подвале для демо-версии: «студия вымышлена, фото — Unsplash». У настоящей студии пусто */
  demoNote?: string
}

export type Data = {
  version: number
  studio: Studio
  theme: Theme
  masters: Master[]
  services: Service[]
  works: Work[]
  reviews: Review[]
  bookings: Booking[]
}
