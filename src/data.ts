// Данные студии. Сайт — шаблон: для нового салона меняется только этот файл (и фото).
// Демо-студия «На пять» вымышлена, это помечено в подвале. Фото — Unsplash.

export type Category = 'hands' | 'feet' | 'design'
export type Service = { id: string; title: string; note: string; minutes: number; price: number; from?: boolean; category: Category; popular?: boolean }
/** Часы на день недели (0 = понедельник), null — выходной */
export type Day = [string, string] | null
export type Master = { id: string; name: string; nameDat: string; role: string; about: string; schedule: Day[]; services?: string[] }
export type Style = 'nude' | 'french' | 'bright' | 'dark' | 'art'
export type Work = { id: string; photo: string; title: string; style: Style; serviceId: string; masterId: string; pos?: string }
export type Review = { id: string; name: string; service: string; date: string; text: string; demo?: boolean }

export const studio = {
  name: 'на пять',
  city: 'Красноярск',
  address: 'ул. Карла Маркса, 48',
  addressNote: 'Вход со двора, второй этаж, домофон 12.',
  map: 'https://2gis.ru/krasnoyarsk/search/%D0%9A%D0%B0%D1%80%D0%BB%D0%B0%20%D0%9C%D0%B0%D1%80%D0%BA%D1%81%D0%B0%2048',
  phone: '+7 (391) 205-48-12',
  telegram: 'napyat_nails',
  whatsapp: '73912054812',
  lead: 'Студия в центре Красноярска. Свободное время видно сразу, запись за минуту.',
  horizonDays: 21,
  stepMin: 30,
  demo: true,
  demoNote: 'Демонстрационный сайт: студия, мастера и отзывы вымышлены, фото с Unsplash.',
}

/** Пять работ на первом экране: большой палец, указательный, средний, безымянный, мизинец */
export const heroNails = [
  { photo: '1754799670312-8e7da8e40ad7', alt: 'Синий с золотом', h: 0.46, r: -34, pos: '50% 45%' },
  { photo: '1641814250010-9887d86eedfd', alt: 'Пудровый с кольцом', h: 0.7, r: -11, pos: '45% 50%' },
  { photo: '1736434518489-0eb84070017f', alt: 'Бежевый миндаль', h: 0.8, r: -2, pos: '55% 30%' },
  { photo: '1769687209448-025548dfca8b', alt: 'Нюд с декором', h: 0.73, r: 7, pos: '50% 35%' },
  { photo: '1604654894610-df63bc536371', alt: 'Чёрный и черепаховый дизайн', h: 0.58, r: 16, pos: '50% 40%' },
]

export const services: Service[] = [
  { id: 'mani-gel', title: 'Маникюр с покрытием', note: 'Обработка, выравнивание, гель-лак в один цвет. Держится три-четыре недели.', minutes: 105, price: 2300, category: 'hands', popular: true },
  { id: 'mani', title: 'Маникюр без покрытия', note: 'Аппаратный или комбинированный: форма, кутикула, уход.', minutes: 60, price: 1200, category: 'hands' },
  { id: 'ext', title: 'Наращивание', note: 'Гель на верхние формы, любая длина и форма, покрытие в один цвет.', minutes: 180, price: 3400, from: true, category: 'hands' },
  { id: 'corr', title: 'Коррекция наращивания', note: 'Отросшее наращивание: выравниваем архитектуру, обновляем покрытие.', minutes: 150, price: 2900, from: true, category: 'hands' },
  { id: 'pedi-gel', title: 'Педикюр с покрытием', note: 'Аппаратная обработка пальцев и стоп, гель-лак в один цвет.', minutes: 120, price: 2700, category: 'feet' },
  { id: 'pedi', title: 'Педикюр пальчики', note: 'Обработка пальцев без стоп, с покрытием.', minutes: 75, price: 1800, category: 'feet' },
  { id: 'french', title: 'Френч', note: 'Классический или цветной, к любому покрытию.', minutes: 30, price: 500, category: 'design' },
  { id: 'art', title: 'Роспись и декор', note: 'Рисунок, фольга, стразы, втирка. Цена за все ногти.', minutes: 40, price: 600, from: true, category: 'design' },
]

const week = (d: Day, n = 7): Day[] => Array.from({ length: n }, () => d)

export const masters: Master[] = [
  {
    id: 'alina',
    name: 'Алина',
    nameDat: 'Алине',
    role: 'Наращивание и сложный дизайн',
    about: 'Делает длину, которая не мешает жить: форму подбирает под пальцы, а не под картинку из ленты.',
    schedule: [['10:00', '20:00'], ['10:00', '20:00'], null, ['10:00', '20:00'], ['10:00', '20:00'], ['11:00', '18:00'], null],
  },
  {
    id: 'katya',
    name: 'Катя',
    nameDat: 'Кате',
    role: 'Маникюр и педикюр',
    about: 'Быстрый аккуратный маникюр перед работой или в обед. Любит нюд и короткий квадрат.',
    schedule: [null, ['09:00', '19:00'], ['09:00', '19:00'], ['12:00', '21:00'], null, ['10:00', '18:00'], ['11:00', '18:00']],
    services: ['mani-gel', 'mani', 'pedi-gel', 'pedi', 'french'],
  },
  {
    id: 'vika',
    name: 'Вика',
    nameDat: 'Вике',
    role: 'Роспись и френч',
    about: 'Рисует от тонкой линии до сюжета на всех ногтях. Если принесёте фото, повторит его.',
    schedule: week(['12:00', '21:00'], 5).concat([null, null]),
  },
]

export const works: Work[] = [
  { id: 'w1', photo: '1770210257340-dc2b0f44642a', title: 'Золотой миндаль', style: 'art', serviceId: 'ext', masterId: 'alina' },
  { id: 'w2', photo: '1618606679166-7f313aa5b26f', title: 'Вишнёвый, короткий', style: 'bright', serviceId: 'mani-gel', masterId: 'katya' },
  { id: 'w3', photo: '1754799670410-b282791342c3', title: 'Белый френч на длине', style: 'french', serviceId: 'ext', masterId: 'alina' },
  { id: 'w4', photo: '1777287216954-2b4b22bb6bf2', title: 'Хром со стразами', style: 'art', serviceId: 'art', masterId: 'vika' },
  { id: 'w5', photo: '1762373349045-c2decd4ec3f3', title: 'Тонкий френч', style: 'french', serviceId: 'french', masterId: 'vika' },
  { id: 'w6', photo: '1633955726992-2b7c0d2d2a69', title: 'Молочный, овал', style: 'nude', serviceId: 'mani-gel', masterId: 'katya' },
  { id: 'w7', photo: '1720343409646-960f6dcccae3', title: 'Стилеты с росписью', style: 'art', serviceId: 'art', masterId: 'vika' },
  { id: 'w8', photo: '1607779097040-26e80aa78e66', title: 'Лиловый с серебром', style: 'art', serviceId: 'art', masterId: 'vika', pos: '50% 60%' },
  { id: 'w9', photo: '1604902396830-aca29e19b067', title: 'Розовый нюд', style: 'nude', serviceId: 'mani-gel', masterId: 'katya' },
  { id: 'w10', photo: '1604654894610-df63bc536371', title: 'Чёрный с черепахой', style: 'dark', serviceId: 'art', masterId: 'alina' },
  { id: 'w11', photo: '1664643411326-6c589531be3c', title: 'Бордовый педикюр', style: 'dark', serviceId: 'pedi-gel', masterId: 'katya' },
  { id: 'w12', photo: '1476571000482-3f8d96222bb9', title: 'Бирюзовый педикюр', style: 'bright', serviceId: 'pedi-gel', masterId: 'katya', pos: '50% 70%' },
]

export const reviews: Review[] = [
  { id: 'r1', demo: true, name: 'Полина', service: 'Наращивание', date: '2026-10-04', text: 'Алина отговорила меня от стилетов и сделала миндаль чуть короче. Хожу третью неделю, ни разу не зацепилась.' },
  { id: 'r2', demo: true, name: 'Оксана', service: 'Маникюр с покрытием', date: '2026-10-09', text: 'Записалась вечером на утро, пришла к девяти, к половине одиннадцатого была на работе.' },
  { id: 'r3', demo: true, name: 'Дарина', service: 'Роспись и декор', date: '2026-09-27', text: 'Принесла картинку из пинтереста, Вика повторила её точнее, чем я ожидала. Цена совпала с сайтом.' },
]

export const STYLE_LABEL: Record<Style, string> = { nude: 'Нюд', french: 'Френч', bright: 'Яркие', dark: 'Тёмные', art: 'Дизайн' }
export const CATEGORY_LABEL: Record<Category, string> = { hands: 'Руки', feet: 'Ноги', design: 'Дизайн' }

export const photoUrl = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`
