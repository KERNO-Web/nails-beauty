// Раскладка галереи без ручной настройки: из числа снимков получается ряд строк по 3 и 2.
// Первая работа (featured или просто первая) — крупная, с двумя снимками рядом.
// Фото любых пропорций кадрируются по высоте строки (object-fit + необязательный focus у работы),
// поэтому сетка ровная при 4, 6, 9 или 15 снимках — без дыр и мелочи.

export type GalleryRow =
  | { kind: 'lead'; items: number[] }
  | { kind: 'row'; items: number[]; cols: string }
  /** Единственная работа: снимок и рядом карточка записи */
  | { kind: 'solo'; items: number[] }

const COLS3 = ['1fr 1.35fr 1fr', '1.25fr 1fr 1.25fr']
const COLS2 = ['1.5fr 1fr', '1fr 1.5fr']

/** Разбить n на строки по 3 и 2, чередуя, без строки из одного снимка */
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

export function galleryRows(n: number, wide: boolean): GalleryRow[] {
  if (n <= 0) return []
  if (n === 1) return [{ kind: 'solo', items: [0] }]
  const rows: GalleryRow[] = []
  let i = 0
  if (wide) {
    // Крупная первая — только если после неё не останется одинокого снимка (4 работы = 2 + 2)
    if (n >= 3 && n !== 4) {
      rows.push({ kind: 'lead', items: [0, 1, 2] })
      i = 3
    }
    let r3 = 0
    let r2 = 0
    for (const size of split(n - i)) {
      const items = Array.from({ length: size }, (_, k) => i + k)
      i += size
      rows.push({ kind: 'row', items, cols: size === 3 ? COLS3[r3++ % 2] : size === 2 ? COLS2[r2++ % 2] : '1fr' })
    }
    return rows
  }
  // Телефон: крупная первая, дальше пары; нечётный хвост — снова во всю ширину
  rows.push({ kind: 'row', items: [0], cols: '1fr' })
  i = 1
  let r2 = 0
  while (i < n) {
    if (n - i === 1) {
      rows.push({ kind: 'row', items: [i], cols: '1fr' })
      break
    }
    rows.push({ kind: 'row', items: [i, i + 1], cols: r2++ % 2 ? '1fr 1.25fr' : '1.25fr 1fr' })
    i += 2
  }
  return rows
}
