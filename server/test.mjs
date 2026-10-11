import assert from 'node:assert/strict'
import test from 'node:test'
import { reminderText, zonedToUtc } from './time.mjs'

test('время визита в поясе студии', () => {
  assert.equal(new Date(zonedToUtc('2026-10-12', 16 * 60, 'Asia/Krasnoyarsk')).toISOString(), '2026-10-12T09:00:00.000Z')
  assert.equal(new Date(zonedToUtc('2026-10-12', 16 * 60, 'Europe/Moscow')).toISOString(), '2026-10-12T13:00:00.000Z')
})

test('тексты напоминаний', () => {
  const tz = 'Asia/Krasnoyarsk'
  const at = zonedToUtc('2026-10-12', 16 * 60, tz)
  const b = { date: '2026-10-12', start: 960, at, service: 'Маникюр + покрытие', master: 'Вере' }
  const info = { name: 'LUMI', address: 'пр. Мира, 30', timezone: tz }
  assert.equal(reminderText(b, info, at - 24 * 3600_000).title, 'LUMI: завтра в 16:00')
  assert.equal(reminderText(b, info, at - 12 * 3600_000).title, 'LUMI: сегодня в 16:00')
  assert.equal(reminderText(b, info, at - 3 * 3600_000).title, 'Через 3 часа — LUMI, в 16:00')
  assert.equal(reminderText(b, info, at - 3600_000).title, 'Через час — LUMI, в 16:00')
  assert.equal(reminderText(b, info, at - 3600_000).body, 'Маникюр + покрытие · к Вере · пр. Мира, 30')
})

import { createCore } from './core.mjs'

const H = 3600_000
const sub = (n) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: 'k', auth: 'a' } })
function setup() {
  const sent = []
  const core = createCore({ db: { studios: {} }, save() {}, push: async (s, p) => void sent.push([s.endpoint, p.title]) })
  return { core, sent }
}
const booking = (id, date, start, phone) => ({
  booking: { id, date, start, minutes: 90, name: 'Евгения', phone, source: 'online' },
  studio: { name: 'LUMI', address: 'пр. Мира, 30', timezone: 'Asia/Krasnoyarsk', reminders: [24, 12, 3, 1] },
  service: 'Маникюр',
})

test('напоминания за 24, 12, 3 и 1 час — по одному разу', async () => {
  const { core, sent } = setup()
  const at = zonedToUtc('2026-10-14', 16 * 60, 'Asia/Krasnoyarsk')
  core.book('lumi', booking('b1', '2026-10-14', 960, '9135552418'), at - 48 * H)
  core.subscribe('lumi', { role: 'client', subscription: sub(1), bookingId: 'b1' })
  for (let t = at - 48 * H; t <= at + H; t += 60_000) await core.tick(t)
  assert.deepEqual(sent.map((x) => x[1]), ['LUMI: завтра в 16:00', 'LUMI: сегодня в 16:00', 'Через 3 часа — LUMI, в 16:00', 'Через час — LUMI, в 16:00'])
})

test('по телефону (приложение на iPhone) и без лишних — записались за 2 часа', async () => {
  const { core, sent } = setup()
  const at = zonedToUtc('2026-10-14', 16 * 60, 'Asia/Krasnoyarsk')
  core.book('lumi', booking('b2', '2026-10-14', 960, '9135552418'), at - 2 * H)
  core.subscribe('lumi', { role: 'client', subscription: sub(2), phone: '9135552418' })
  core.subscribe('lumi', { role: 'client', subscription: sub(3), phone: '9990000000' })
  for (let t = at - 2 * H; t <= at; t += 60_000) await core.tick(t)
  assert.deepEqual(sent, [['https://push.example/2', 'Через час — LUMI, в 16:00']])
})

test('отменённой записи не напоминаем; мастеру — о новой записи', async () => {
  const { core, sent } = setup()
  core.subscribe('lumi', { role: 'master', subscription: sub(9) })
  const at = zonedToUtc('2026-10-14', 16 * 60, 'Asia/Krasnoyarsk')
  core.book('lumi', booking('b3', '2026-10-14', 960, '9135552418'), at - 30 * H)
  assert.equal(sent[0][1], 'Новая запись: Евгения')
  core.subscribe('lumi', { role: 'client', subscription: sub(4), bookingId: 'b3' })
  core.cancel('lumi', 'b3')
  for (let t = at - 30 * H; t <= at; t += 60_000) await core.tick(t)
  assert.equal(sent.length, 1)
})
