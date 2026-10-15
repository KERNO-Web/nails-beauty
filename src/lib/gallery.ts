// Раскладка галереи без ручной настройки. Снимки идут «полосами» по 12-колоночной сетке:
// у каждой полосы своя фиксированная схема (крупный снимок + стопка, тройка разной ширины, пара 7:5),
// поэтому края ровные при любом числе работ — 2, 3, 4, 6, 9, 12, 15 — без дыр, повторов и одиноких хвостов.
// Фото любых пропорций кадрируются по ячейке (object-fit + необязательный focus у работы).

export type BandKind =
  /** Крупный слева на две строки, высокий рядом, два друг над другом справа */
  | 'lead4'
  /** Крупный слева, два друг над другом справа */
  | 'trioL'
  /** Два друг над другом слева, крупный справа */
  | 'trioR'
  /** Три в ряд разной ширины */
  | 'row3'
  /** Пара 7:5 и зеркальная 5:7 */
  | 'pair'
  | 'pairR'
  /** Единственная работа: снимок и рядом приглашение записаться */
  | 'solo'
  /** Телефон: во всю ширину */
  | 'full'
  /** Телефон: пара */
  | 'duo'

export type Band = { kind: BandKind; items: number[] }

/** Разбить n на полосы по 3 и 2 без полосы из одного снимка */
function split(n: number) {
  const out: number[] = []
  let rest = n
  let next = 3
  while (rest > 0) {
    if (rest === 4) {
      out.push(2, 2)
      break
    }
    if (rest <= 3) {
      out.push(rest)
      break
    }
    out.push(next)
    rest -= next
    next = next === 3 ? 2 : 3
  }
  return out
}

const take = (from: number, count: number) => Array.from({ length: count }, (_, k) => from + k)

export function planGallery(n: number, wide: boolean): Band[] {
  if (n <= 0) return []
  if (n === 1) return [{ kind: 'solo', items: [0] }]
  if (!wide) return planNarrow(n)
  if (n === 2) return [{ kind: 'pair', items: [0, 1] }]
  if (n === 3) return [{ kind: 'trioL', items: [0, 1, 2] }]
  if (n === 5) return [{ kind: 'trioL', items: [0, 1, 2] }, { kind: 'pairR', items: [3, 4] }]
  const bands: Band[] = [{ kind: 'lead4', items: [0, 1, 2, 3] }]
  let i = 4
  const threes: BandKind[] = ['trioR', 'row3', 'trioL']
  const twos: BandKind[] = ['pair', 'pairR']
  let t3 = 0
  let t2 = 0
  for (const size of split(n - 4)) {
    bands.push({ kind: size === 3 ? threes[t3++ % threes.length] : twos[t2++ % twos.length], items: take(i, size) })
    i += size
  }
  return bands
}

/** Телефон: крупный первый, дальше две пары и снова крупный; без одиночного хвоста */
function planNarrow(n: number): Band[] {
  const bands: Band[] = [{ kind: 'full', items: [0] }]
  let i = 1
  let pairs = 0
  while (i < n) {
    const rest = n - i
    if (rest === 1 || (pairs === 2 && rest !== 2 && rest !== 4)) {
      bands.push({ kind: 'full', items: [i] })
      i += 1
      pairs = 0
      continue
    }
    bands.push({ kind: 'duo', items: [i, i + 1] })
    i += 2
    pairs++
  }
  return bands
}
