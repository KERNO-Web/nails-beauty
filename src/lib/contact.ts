// Контакт клиента: российский телефон или Telegram. Проверка телефона — из shina-booking/shared/phone.ts.

export function phoneDigits(raw: string): string | null {
  let d = raw.replace(/\D/g, '')
  if (d.length === 11 && (d.startsWith('7') || d.startsWith('8'))) d = d.slice(1)
  return d.length === 10 ? d : null
}

export const formatPhone = (d: string) => `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`

const TG = /^(?:@|(?:https?:\/\/)?t\.me\/)([a-zA-Z][a-zA-Z0-9_]{4,31})$/

export type Contact = { kind: 'phone' | 'telegram'; value: string }

/** Разбор поля «Телефон или Telegram»: контакт или текст ошибки */
export function parseContact(raw: string): Contact | string {
  const s = raw.trim()
  if (!s) return 'Оставьте телефон или ник в Telegram — по нему мастер подтвердит запись'
  const tg = s.match(TG)
  if (tg) return { kind: 'telegram', value: `@${tg[1]}` }
  if (/^[a-zA-Z@]/.test(s)) return 'Ник в Telegram начинается с @ и содержит от 5 латинских букв или цифр'
  const all = s.replace(/\D/g, '')
  const d = phoneDigits(s)
  if (!d) return all.length < 10 ? 'Не хватает цифр в номере' : 'Лишние цифры: нужно +7 и ещё 10 цифр'
  if (!/^[34789]/.test(d)) return 'Проверьте первые цифры после +7'
  if (/^(\d)\1+$/.test(d.slice(3))) return 'Похоже на случайный набор цифр'
  return { kind: 'phone', value: formatPhone(d) }
}

/** Пока клиент печатает номер — аккуратно расставляем пробелы и скобки */
export function maskTyping(raw: string) {
  if (/^[@a-zA-Z]|t\.me/.test(raw.trim())) return raw
  let d = raw.replace(/\D/g, '')
  if (!d) return raw.startsWith('+') ? '+' : ''
  if (d[0] === '8') d = '7' + d.slice(1)
  if (d[0] !== '7') d = '7' + d
  d = d.slice(0, 11)
  const p = d.slice(1)
  let out = '+7'
  if (p.length) out += ' (' + p.slice(0, 3)
  if (p.length >= 3) out += ')'
  if (p.length > 3) out += ' ' + p.slice(3, 6)
  if (p.length > 6) out += '-' + p.slice(6, 8)
  if (p.length > 8) out += '-' + p.slice(8, 10)
  return out
}
