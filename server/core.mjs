// Логика сервера без сети: подписки, записи, расписание напоминаний. index.mjs подключает HTTP и web-push.
import { reminderText, zonedToUtc } from './time.mjs'

const HOUR = 3_600_000
const fmtTime = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
const validSub = (s) => s && typeof s.endpoint === 'string' && s.endpoint.startsWith('https://') && s.keys?.p256dh && s.keys?.auth
const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const digits = (v) => (typeof v === 'string' && /^\d{10}$/.test(v) ? v : undefined)

/**
 * db — { studios: {} } (читается из файла), save() — сохранить, push(sub, payload) — отправить;
 * push возвращает 'gone', если подписка больше не действует.
 */
export function createCore({ db, save, push }) {
  const studio = (slug) => (db.studios[slug] ??= { masters: [], clients: [], bookings: {}, info: {} })

  async function send(st, sub, payload) {
    if ((await push(sub, payload)) !== 'gone') return
    // Приложение удалено или уведомления выключены — забываем подписку
    st.masters = st.masters.filter((s) => s.endpoint !== sub.endpoint)
    st.clients = st.clients.filter((c) => c.sub.endpoint !== sub.endpoint)
    save()
  }

  function subscribe(slug, body) {
    if (!validSub(body.subscription)) return 400
    const st = studio(slug)
    const sub = { endpoint: body.subscription.endpoint, keys: { p256dh: body.subscription.keys.p256dh, auth: body.subscription.keys.auth } }
    if (body.role === 'master') {
      if (!st.masters.some((s) => s.endpoint === sub.endpoint)) st.masters.push(sub)
    } else {
      let c = st.clients.find((x) => x.sub.endpoint === sub.endpoint)
      if (!c) st.clients.push((c = { sub, bookingIds: [], created: Date.now() }))
      const phone = digits(body.phone)
      if (phone) c.phone = phone
      const id = str(body.bookingId, 40)
      if (id && !c.bookingIds.includes(id)) c.bookingIds.push(id)
    }
    save()
    return 200
  }

  function book(slug, body, now = Date.now()) {
    const b = body.booking || {}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !Number.isInteger(b.start) || !str(b.id, 40)) return 400
    const st = studio(slug)
    if (body.studio) {
      const s = body.studio
      st.info = {
        name: str(s.name, 80),
        address: str(s.address, 160),
        timezone: str(s.timezone, 60),
        reminders: Array.isArray(s.reminders) ? s.reminders.filter((h) => Number.isFinite(h) && h > 0 && h <= 72).slice(0, 6) : undefined,
      }
    }
    if (st.bookings[b.id]) return 200
    const tz = st.info.timezone || 'Europe/Moscow'
    const rec = {
      date: b.date,
      start: b.start,
      at: zonedToUtc(b.date, b.start, tz),
      name: str(b.name, 80),
      phone: digits(b.phone),
      service: str(body.service, 120),
      master: str(body.master, 80),
      source: b.source === 'online' ? 'online' : 'manual',
      created: now,
      sent: [],
    }
    st.bookings[b.id] = rec
    save()
    if (rec.source === 'online') {
      const text = [rec.service, `${reminderText.day(rec, tz, now)}, ${fmtTime(rec.start)}`, rec.master && `к ${rec.master}`].filter(Boolean).join(' · ')
      for (const sub of st.masters) send(st, sub, { title: `Новая запись: ${rec.name}`, body: text, url: './#/admin', tag: `new-${b.id}` })
    }
    return 200
  }

  function cancel(slug, id) {
    const b = studio(slug).bookings[id]
    if (b) (b.cancelled = true), save()
    return 200
  }

  /** Раз в минуту: кому пора напомнить */
  async function tick(now = Date.now()) {
    for (const st of Object.values(db.studios)) {
      const hours = [...(st.info.reminders?.length ? st.info.reminders : [24, 12, 3, 1])].sort((a, b) => a - b)
      for (const [id, b] of Object.entries(st.bookings)) {
        if (b.at < now - 2 * 24 * HOUR) {
          delete st.bookings[id]
          save()
          continue
        }
        if (b.cancelled || b.at <= now) continue
        // Наступившие и не отправленные; если сервер простаивал — только самое близкое к визиту.
        // Наступившие раньше, чем сделана запись (записались за 2 часа до визита), пропускаем.
        const due = hours.filter((h) => b.at - h * HOUR <= now && !b.sent.includes(h))
        if (!due.length) continue
        b.sent.push(...due)
        save()
        const h = due[0]
        if (b.at - h * HOUR < b.created) continue
        const msg = reminderText(b, st.info, now)
        const seen = new Set()
        for (const c of st.clients.filter((c) => c.bookingIds.includes(id) || (b.phone && c.phone === b.phone))) {
          if (seen.has(c.sub.endpoint)) continue
          seen.add(c.sub.endpoint)
          await send(st, c.sub, { ...msg, url: './', tag: `visit-${id}` })
        }
      }
    }
  }

  return { subscribe, book, cancel, tick }
}
