// Сервер уведомлений для сайтов записи (одна установка — много студий: /s/<студия>/…).
// Мастеру — пуш о новой онлайн-записи. Клиентке — напоминания за 24, 12, 3 и 1 час до визита (studio.reminders).
// Хранилище — один JSON-файл: записей и подписок немного, база не нужна.
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import webpush from 'web-push'
import { createCore, originMatcher } from './core.mjs'

const env = process.env
const PORT = Number(env.PORT || 8787)
const DATA_FILE = env.DATA_FILE || './data/db.json'
const ORIGINS = originMatcher(env.ALLOWED_ORIGINS)
const TICK_MS = 60_000

if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
  console.error('Нет ключей VAPID. Создайте: npm run keys — и укажите VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY')
  process.exit(1)
}
webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:admin@example.ru', env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)

/* ---------- Хранилище ---------- */
let db = { studios: {} }
try {
  db = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
} catch {
  /* первый запуск */
}
let saveTimer = null
function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    mkdirSync(dirname(DATA_FILE), { recursive: true })
    writeFileSync(DATA_FILE + '.tmp', JSON.stringify(db))
    renameSync(DATA_FILE + '.tmp', DATA_FILE)
  }, 200)
}

const core = createCore({
  db,
  save,
  async push(sub, payload) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 6 * 3600, urgency: 'high' })
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) return 'gone'
      console.error('push', e.statusCode || '', e.body || e.message)
    }
  },
})

/* ---------- HTTP ---------- */
const hits = new Map()
setInterval(() => hits.clear(), 60_000).unref()

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > 64 * 1024) reject(new Error('too large')), req.destroy()
      else chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(new Error('bad json'))
      }
    })
  })
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin
  const allowed = !origin || ORIGINS(origin)
  if (origin && allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
  const out = (code, data = { ok: code < 300 }) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(data))
  }
  if (req.method === 'OPTIONS') return res.writeHead(allowed ? 204 : 403).end()
  if (!allowed) return out(403)

  const url = new URL(req.url, 'http://x')
  if (req.method === 'GET' && url.pathname.endsWith('/health')) return out(200, { ok: true })
  if (req.method === 'GET' && url.pathname.endsWith('/vapid')) return out(200, { key: env.VAPID_PUBLIC_KEY })

  const m = url.pathname.match(/^(?:\/api)?\/s\/([a-z0-9-]{1,40})\/(subscribe|bookings(?:\/([^/]{1,40})\/cancel)?)$/)
  if (!m || req.method !== 'POST') return out(404)
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
  hits.set(ip, (hits.get(ip) || 0) + 1)
  if (hits.get(ip) > 60) return out(429)

  let body
  try {
    body = await readBody(req)
  } catch {
    return out(400)
  }
  if (m[2] === 'subscribe') return out(core.subscribe(m[1], body))
  if (m[3]) return out(core.cancel(m[1], decodeURIComponent(m[3])))
  return out(core.book(m[1], body))
})

server.listen(PORT, () => console.log(`Уведомления: http://localhost:${PORT}`))
setInterval(() => core.tick().catch((e) => console.error('tick', e)), TICK_MS)
