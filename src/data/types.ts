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
  /** Оценка 1–5 — только если клиент её поставил (на картах); нет — звёзды не показываются */
  rating?: number
  /** Где оставлен: «2ГИС», «Яндекс Карты»… Нет — источник не показывается */
  source?: string
  /** Ссылка на сам отзыв */
  url?: string
  /** Показать крупно первым */
  featured?: boolean
  /** Пример для демо-сайта, не настоящий отзыв: помечается на сайте «пример». У клиента — убрать */
  demo?: boolean
}

/** Карточка студии на картах/в отзовике. Цифры — только настоящие, с публичной страницы */
export type ReviewsSource = {
  /** «2ГИС», «Яндекс Карты» */
  name: string
  /** Публичная страница с отзывами */
  url: string
  /** Средняя оценка, например 4.9 */
  rating?: number
  /** Сколько отзывов на этой странице */
  count?: number
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

/** Форма ногтя — осталась от прежнего дизайна, на сайте больше не используется */
export type NailShape = 'almond' | 'oval' | 'square' | 'coffin'

/** Три готовые палитры одного дизайна (src/design/tokens.css) */
export type ThemePreset = 'mulberry' | 'taupe' | 'rose'

/** Внешний вид. Меняется под клиента вместе с фото — вёрстка общая */
export type Theme = {
  /** Палитра. Нет — «mulberry» */
  preset?: ThemePreset
  /** Свой тёмный акцент вместо цвета палитры, #RRGGBB (необязательно). Слишком светлый затемняется до читаемого */
  accent?: string
  /** Прежние поля темы — больше не используются: фон и текст задаёт палитра */
  paper?: string
  ink?: string
  nailShape?: NailShape
}

/** Как клиент записывается. native — запись на сайте; external — кнопки ведут в DIKIDI/YCLIENTS и т.п.;
 * messenger — кнопки открывают WhatsApp или Telegram студии с готовым текстом (номер/ник — из контактов студии) */
export type BookingMode =
  | { mode: 'native' }
  | { mode: 'external'; url: string; /** «DIKIDI», «YCLIENTS» — подпись к кнопке */ name?: string }
  | { mode: 'messenger'; channel: 'whatsapp' | 'telegram' }

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
  /** Карточка с отзывами на картах (2ГИС, Яндекс). Нет — в первом экране ссылка ведёт к отзывам на сайте */
  reviewsSource?: ReviewsSource
  /** Сервер уведомлений (папка server/): публичный ключ VAPID и адрес студии на сервере, например
   * https://api.example.ru/s/lumi. Нет — мастеру уведомления показывает сам кабинет, пока он открыт,
   * а клиентам напоминает только календарь (.ics) */
  push?: { vapidPublicKey: string; server: string }
  /** За сколько часов до визита напомнить клиенту. Нет — за 24, 12, 3 и 1 час */
  reminders?: number[]
  /** Часовой пояс студии (IANA), в нём записано время визитов. Нет — Europe/Moscow */
  timezone?: string
  /** Своя ссылка «Маршрут» (например, на карточку в 2ГИС). Нет — маршрут строится по координатам map */
  routeUrl?: string
  /** Заголовок первого экрана. Пусто — «Маникюр и педикюр» (город и так стоит над заголовком) */
  heroTitle: string
  /** Одна-две фразы под заголовком (необязательно) */
  heroLead: string
  /** Главное фото первого экрана: работа крупным планом, без надписей */
  heroPhoto: string
  /** Точка кадра фото первого экрана (как object-position) на компьютере и на телефоне */
  heroPositionDesktop?: string
  heroPositionMobile?: string
  /** Раскладка первого экрана: auto — по пропорциям фото; photographic — с фото; typographic — без фото */
  heroLayout?: 'auto' | 'photographic' | 'typographic'
  /** Запись: на сайте (по умолчанию) или во внешнем сервисе */
  booking?: BookingMode
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
