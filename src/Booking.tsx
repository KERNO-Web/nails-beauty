// Запись: услуга → мастер → день → время → контакты. Всё на одном экране, справа — итог.
import { useEffect, useMemo, useRef, useState } from 'react'
import { masters, services, studio } from './data'
import { canDo, createBooking, dateOf, daySlots, days, fmtDuration, fmtTime, monthDay, plural, priceLabel, resetPick, setPick, studioNow, usePick, wdShort, addDays, type Booking as B, useBookings } from './slots'

const PARTS = [
  { label: 'Утро', to: 12 * 60 },
  { label: 'День', to: 17 * 60 },
  { label: 'Вечер', to: 24 * 60 },
]

/** Телефон (+7 и 10 цифр) или ник Telegram. Ответ: нормализованный контакт или текст ошибки */
function checkContact(raw: string): { ok: string } | { err: string } {
  const v = raw.trim()
  if (!v) return { err: 'Оставьте телефон или ник в Telegram' }
  if (/^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(v)) return { ok: v.startsWith('@') ? v : `@${v}` }
  let d = v.replace(/\D/g, '')
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) d = d.slice(1)
  if (d.length !== 10) return { err: 'В номере должно быть 10 цифр после +7' }
  if (/^(\d)\1+$/.test(d.slice(3)) || /0000000$/.test(d)) return { err: 'Похоже на случайный набор цифр' }
  return { ok: `+7 ${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}` }
}

function dayLabel(iso: string) {
  const t = studioNow().iso
  return iso === t ? 'сегодня' : iso === addDays(t, 1) ? 'завтра' : wdShort(iso)
}

export function Booking() {
  const pick = usePick()
  useBookings()
  const service = services.find((s) => s.id === pick.serviceId) ?? null
  const master = masters.find((m) => m.id === pick.masterId) ?? null
  const eligible = service ? masters.filter((m) => canDo(m, service.id)) : masters
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState<{ name?: string; contact?: string; form?: string }>({})
  const [done, setDone] = useState<B | null>(null)
  const timeRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  // Заполненный шаг свёрнут в строку; «Изменить» раскрывает его, новый выбор сворачивает обратно
  const [edit, setEdit] = useState({ svc: false, master: false, time: false })
  const close = (k: keyof typeof edit) => setEdit((e) => ({ ...e, [k]: false }))
  useEffect(() => close('svc'), [pick.serviceId])
  useEffect(() => close('master'), [pick.masterId])
  useEffect(() => close('time'), [pick.time])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (el.classList.add('is-in'), io.disconnect()), { rootMargin: '0px 0px -12% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (service && master && !canDo(master, service.id)) setPick({ masterId: null })
  }, [service?.id, master?.id])

  const ds = useMemo(() => days(service?.id ?? null, pick.masterId), [service?.id, pick.masterId, done])
  useEffect(() => {
    if (!service) return
    const cur = ds.find((d) => d.iso === pick.date)
    if (!cur || !cur.free) {
      const first = ds.find((d) => d.free)
      if (first && first.iso !== pick.date) setPick({ date: first.iso, time: pick.date === null && pick.time !== null ? pick.time : null })
    }
  }, [ds, service?.id])

  const slots = useMemo(() => (service && pick.date ? daySlots(service.id, pick.masterId, pick.date) : []), [service?.id, pick.masterId, pick.date, done])
  const chosen = slots.find((s) => s.time === pick.time)
  const ready = !!(service && pick.date && chosen)
  const anyFree = ds.some((d) => d.free)

  function choose(t: number) {
    setPick({ time: t })
    close('time')
    setErr((e) => ({ ...e, form: undefined }))
    if (innerWidth < 1024) setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
  }

  function submit() {
    if (!service) return
    if (!ready) {
      setErr({ form: 'Выберите день и время' })
      timeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const c = checkContact(contact)
    const e = { name: name.trim() ? undefined : 'Как к вам обращаться?', contact: 'err' in c ? c.err : undefined }
    setErr(e)
    if (e.name || e.contact) return
    const res = createBooking({ serviceId: service.id, masterId: pick.masterId, date: pick.date!, start: pick.time!, name: name.trim(), contact: (c as { ok: string }).ok, note: note.trim() || undefined })
    if (!res.ok) {
      setPick({ time: null })
      setErr({ form: res.error })
      return
    }
    setDone(res.booking)
    requestAnimationFrame(() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const when = pick.date && chosen ? `${dayLabel(pick.date)}, ${monthDay(pick.date)}, ${fmtTime(chosen.time)}` : ''
  const n = (i: number, ok: boolean) => <span className={`bn ${ok ? 'is-ok' : ''}`}>{i}</span>
  const masterName = master?.name ?? (service && eligible.length === 1 ? eligible[0].name : 'любой свободный')
  const row = (i: number, title: React.ReactNode, value: string, k: keyof typeof edit) => (
    <div className="bk-step is-done" ref={i === 3 ? timeRef : undefined}>
      <h3 className="bk-h">
        {n(i, true)}
        {title}
      </h3>
      <p className="bk-val">{value}</p>
      <button className="bk-edit" onClick={() => setEdit((e) => ({ ...e, [k]: true }))}>
        Изменить
      </button>
    </div>
  )

  return (
    <section className="sec booking" id="booking" aria-labelledby="bk-h">
      <div className="wrap" ref={ref}>
        <div className="bk-head rise">
          <h2 className="h2" id="bk-h">
            Запись
          </h2>
          <p className="lead">
            Только свободное время мастеров на {studio.horizonDays}&nbsp;{plural(studio.horizonDays, 'день', 'дня', 'дней')} вперёд. Без звонков и&nbsp;переписки.
          </p>
        </div>

        {done ? (
          <Done b={done} onAgain={() => (setDone(null), resetPick(), setNote(''))} />
        ) : (
          <div className="bk rise">
            <div className="bk-steps">
              {service && !edit.svc ? (
                row(1, 'Услуга', `${service.title}, ${priceLabel(service)}`, 'svc')
              ) : (
              <div className="bk-step">
                <h3 className="bk-h">{n(1, !!service)}Услуга</h3>
                <div className="bk-svcs" role="radiogroup" aria-label="Услуга">
                  {services.map((s) => (
                    <button key={s.id} role="radio" aria-checked={s.id === pick.serviceId} className="opt" onClick={() => (setPick({ serviceId: s.id }), close('svc'))}>
                      <b>{s.title}</b>
                      <span>
                        {priceLabel(s)}, {fmtDuration(s.minutes)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              )}

              {service && !edit.master ? (
                row(2, 'Мастер', masterName, 'master')
              ) : (
              <div className={`bk-step ${service ? '' : 'is-off'}`}>
                <h3 className="bk-h">{n(2, !!service)}Мастер</h3>
                {service && eligible.length === 1 ? (
                  <p className="bk-hint">Эту услугу делает {eligible[0].name}.</p>
                ) : (
                  <div className="pills" role="radiogroup" aria-label="Мастер">
                    <button className="pill" role="radio" aria-checked={!pick.masterId} onClick={() => (setPick({ masterId: null }), close('master'))}>
                      Любой свободный
                    </button>
                    {eligible.map((m) => (
                      <button key={m.id} className="pill" role="radio" aria-checked={pick.masterId === m.id} onClick={() => (setPick({ masterId: m.id }), close('master'))}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )}

              {chosen && !edit.time ? (
                row(3, <>День и&nbsp;время</>, when, 'time')
              ) : (
              <div className={`bk-step ${service ? '' : 'is-off'}`} ref={timeRef}>
                <h3 className="bk-h">
                  {n(3, !!chosen)}День и&nbsp;время
                  {!service && <small>сначала выберите услугу</small>}
                </h3>
                {service && !anyFree ? (
                  <p className="bk-hint">
                    На ближайшие {studio.horizonDays}&nbsp;дней свободного времени нет. Позвоните: <a href={`tel:${studio.phone.replace(/[^\d+]/g, '')}`}>{studio.phone}</a>
                  </p>
                ) : (
                  <>
                    <div className="days" role="radiogroup" aria-label="День">
                      {ds.map((d) => (
                        <button
                          key={d.iso}
                          className={`day ${weekdayEnd(d.iso) ? 'is-we' : ''}`}
                          role="radio"
                          aria-checked={service ? pick.date === d.iso : false}
                          disabled={!service || !d.free}
                          onClick={() => setPick({ date: d.iso })}
                          aria-label={`${monthDay(d.iso)}${!d.open ? ', выходной' : !d.free ? ', всё занято' : ''}`}
                        >
                          <small>{dayLabel(d.iso)}</small>
                          <b>{dateOf(d.iso).getDate()}</b>
                        </button>
                      ))}
                    </div>
                    {service && pick.date && (
                      <div className="times">
                        {slots.length === 0 ? (
                          <p className="bk-hint">На этот день всё занято.</p>
                        ) : (
                          PARTS.map((p, i) => {
                            const from = i ? PARTS[i - 1].to : 0
                            const part = slots.filter((s) => s.time >= from && s.time < p.to)
                            if (!part.length) return null
                            return (
                              <div key={p.label} className="part">
                                <p className="part-h">
                                  {p.label} <span>{part.length} {plural(part.length, 'окно', 'окна', 'окон')}</span>
                                </p>
                                <div className="slots" role="radiogroup" aria-label={p.label}>
                                  {part.map((s) => (
                                    <button key={s.time} className="slot" role="radio" aria-checked={pick.time === s.time} onClick={() => choose(s.time)}>
                                      {fmtTime(s.time)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              )}

              <div className="bk-step" ref={formRef}>
                <h3 className="bk-h">{n(4, !!(name.trim() && contact.trim()))}Контакты</h3>
                <div className="fields">
                  <label className="field">
                    <span>Имя</span>
                    <input value={name} onChange={(e) => (setName(e.target.value), setErr((x) => ({ ...x, name: undefined })))} autoComplete="given-name" aria-invalid={!!err.name} />
                    {err.name && <em>{err.name}</em>}
                  </label>
                  <label className="field">
                    <span>Телефон или Telegram</span>
                    <input value={contact} onChange={(e) => (setContact(e.target.value), setErr((x) => ({ ...x, contact: undefined })))} autoComplete="tel" inputMode={/^[@a-zA-Z]/.test(contact) ? 'text' : 'tel'} aria-invalid={!!err.contact} />
                    {err.contact ? <em>{err.contact}</em> : <small>+7 900 123-45-67 или @ник</small>}
                  </label>
                  <label className="field is-wide">
                    <span>Пожелание мастеру</span>
                    <input value={note} onChange={(e) => setNote(e.target.value)} />
                    <small>Например: хочу как на фото, пришлю в Telegram</small>
                  </label>
                </div>
              </div>
            </div>

            <aside className="sum" aria-label="Ваша запись">
              <p className="sum-h">Ваша запись</p>
              <dl>
                <div>
                  <dt>Услуга</dt>
                  <dd className={service ? '' : 'is-empty'}>{service?.title ?? 'не выбрана'}</dd>
                </div>
                <div>
                  <dt>Мастер</dt>
                  <dd>{masterName}</dd>
                </div>
                <div>
                  <dt>Когда</dt>
                  <dd className={when ? '' : 'is-empty'}>{when || 'не выбрано'}</dd>
                </div>
              </dl>
              <p className="sum-total">
                <span>Стоимость</span>
                <b>{service ? priceLabel(service) : '0 ₽'}</b>
              </p>
              {err.form && <p className="sum-err" role="alert">{err.form}</p>}
              <button className="btn is-orange is-wide" onClick={submit} disabled={!service}>
                {!service ? 'Выберите услугу' : !ready ? 'Выберите время' : 'Записаться'}
              </button>
              <p className="sum-fine">Мастер подтвердит запись в&nbsp;течение часа. Время указано по&nbsp;Красноярску.</p>
              {studio.demo && <p className="sum-demo">Демо: запись сохранится только в&nbsp;этом браузере, часть окон занята для примера.</p>}
            </aside>
          </div>
        )}
      </div>
    </section>
  )
}

const weekdayEnd = (iso: string) => [5, 6].includes((dateOf(iso).getDay() + 6) % 7)

function Done({ b, onAgain }: { b: B; onAgain: () => void }) {
  const s = services.find((x) => x.id === b.serviceId)
  const m = masters.find((x) => x.id === b.masterId)
  return (
    <div className="done" role="status">
      <div>
        <p className="done-k">{studio.demo ? 'Демо: запись сохранена в этом браузере' : 'Запись отправлена мастеру'}</p>
        <h3 className="h3">{b.name}, вы&nbsp;записаны</h3>
        <p className="lead">Мастер подтвердит запись в&nbsp;течение часа и&nbsp;напомнит о&nbsp;визите накануне.</p>
        <div className="done-actions">
          <a className="btn is-blue" href={`https://t.me/${studio.telegram}`} target="_blank" rel="noreferrer">
            Написать мастеру
          </a>
          <button className="btn is-line-ink" onClick={onAgain}>
            Записаться ещё раз
          </button>
        </div>
      </div>
      <dl className="ticket">
        <div>
          <dt>Услуга</dt>
          <dd>{s?.title}</dd>
        </div>
        <div>
          <dt>Когда</dt>
          <dd>
            {dayLabel(b.date)}, {monthDay(b.date)}, {fmtTime(b.start)}
          </dd>
        </div>
        <div>
          <dt>Мастер</dt>
          <dd>{m?.name}</dd>
        </div>
        <div>
          <dt>Адрес</dt>
          <dd>
            {studio.address}
            <small>{studio.addressNote}</small>
          </dd>
        </div>
      </dl>
    </div>
  )
}
