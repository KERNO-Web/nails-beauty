// Онлайн-запись: услуга → мастер (если их несколько) → день и время → контакты.
// Свободное время — lib/slots.ts. Куда уходит запись — lib/backend.ts (сейчас демо: браузер).
// При внешней записи или записи через мессенджер своей сетки времени нет, только понятный вход.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { isDemo } from '../data/site'
import type { Booking as BookingT, Data } from '../data/types'
import { backendFor } from '../lib/backend'
import { maskTyping, parseContact } from '../lib/contact'
import { Check, ChevronLeft, ChevronRight } from '../lib/icons'
import { remindHours } from '../lib/push'
import { resetSelection, select, useSelection } from '../lib/selection'
import { canDo, dateOf, dayFull, dayHuman, daySlots, daysAhead, fmtDuration, fmtTime, monthName, plural, priceLabel, studioToUtc, WD_SHORT, weekdayOf } from '../lib/slots'
import { RemindCard } from '../notify/Remind'
import { bookingRoute, Out, telHref, useEnter } from './common'

const PARTS = [
  { label: 'Утро', to: 12 * 60 },
  { label: 'День', to: 17 * 60 },
  { label: 'Вечер', to: 24 * 60 },
]

export function Booking({ data }: { data: Data }) {
  const s = data.studio
  const route = bookingRoute(s)
  const ref = useEnter<HTMLDivElement>()

  if (route.kind === 'link')
    return (
      <section className="sec bk" id="booking" aria-labelledby="bk-h">
        <div className="wrap" ref={ref}>
          <div className="bk-entry rise">
            <h2 className="h2" id="bk-h">
              Запись {route.via}
            </h2>
            <p className="bk-lead">{s.booking?.mode === 'messenger' ? 'Напишите нам, мастер предложит свободное время и подтвердит запись.' : 'Там видно свободное время мастеров. Подтверждение придёт туда же.'}</p>
            <div className="bk-entry-actions">
              <a className="btn is-accent" href={route.url} target="_blank" rel="noreferrer">
                Открыть {route.label} <Out />
              </a>
              {s.phone && (
                <a className="btn is-line" href={telHref(s.phone)}>
                  {s.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    )

  if (!data.services.length || !data.masters.length)
    return (
      <section className="sec bk" id="booking" aria-labelledby="bk-h">
        <div className="wrap" ref={ref}>
          <div className="bk-entry rise">
            <h2 className="h2" id="bk-h">
              Запись
            </h2>
            <p className="bk-lead">Онлайн-запись откроется, когда студия добавит услуги и график мастеров.</p>
            {s.phone && (
              <a className="btn is-accent" href={telHref(s.phone)}>
                Позвонить: {s.phone}
              </a>
            )}
          </div>
        </div>
      </section>
    )

  return (
    <section className="sec bk" id="booking" aria-labelledby="bk-h">
      <div className="wrap" ref={ref}>
        <div className="bk-head rise">
          <h2 className="h2" id="bk-h">
            Запись
          </h2>
          <p className="bk-lead">
            Видно только свободное время мастеров на {s.horizonDays}&nbsp;{plural(s.horizonDays, 'день', 'дня', 'дней')} вперёд. Без звонков и&nbsp;переписки.
          </p>
        </div>
        <NativeBooking data={data} />
      </div>
    </section>
  )
}

function NativeBooking({ data }: { data: Data }) {
  const sel = useSelection()
  const backend = backendFor(data.studio)
  const service = data.services.find((s) => s.id === sel.serviceId) ?? null
  const multi = data.masters.length > 1
  const master = data.masters.find((m) => m.id === sel.masterId) ?? null
  const eligible = service ? data.masters.filter((m) => canDo(m, service.id)) : data.masters
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; contact?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<BookingT | null>(null)
  const timeRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const contactRef = useRef<HTMLInputElement>(null)
  const contactsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (service && master && !canDo(master, service.id)) select({ masterId: null })
  }, [service?.id, master?.id])

  const days = useMemo(() => daysAhead(data, service?.id ?? null, sel.masterId), [data, service?.id, sel.masterId])
  useEffect(() => {
    if (!service) return
    const cur = days.find((d) => d.iso === sel.date)
    if (!cur || cur.free === 0) {
      const first = days.find((d) => d.free > 0)
      if (first && first.iso !== sel.date) select({ date: first.iso })
    }
  }, [days, service?.id])

  const slots = useMemo(() => (service && sel.date ? daySlots(data, service.id, sel.masterId, sel.date) : []), [data, service?.id, sel.masterId, sel.date])
  const freeCount = slots.filter((x) => x.free).length
  const nextFree = days.find((d) => d.free > 0 && d.iso > (sel.date ?? ''))
  const anyFree = days.some((d) => d.free > 0)
  const chosenSlot = slots.find((x) => x.time === sel.time && x.free)
  const ready = !!(service && sel.date && chosenSlot)

  function pickTime(t: number) {
    select({ time: t })
    setErrors((e) => ({ ...e, form: undefined }))
    if (window.innerWidth < 1024) setTimeout(() => contactsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 140)
  }

  async function submit() {
    if (!service || busy) return
    if (!ready) {
      timeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setErrors((e) => ({ ...e, form: 'Выберите день и время' }))
      return
    }
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'Как к вам обращаться?'
    const c = parseContact(contact)
    if (typeof c === 'string') errs.contact = c
    setErrors(errs)
    if (errs.name || errs.contact) {
      const first = errs.name ? nameRef.current : contactRef.current
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      first?.focus({ preventScroll: true })
      return
    }
    setBusy(true)
    try {
      const res = await backend.create({ serviceId: service.id, masterId: sel.masterId, date: sel.date!, start: sel.time!, name, contact: typeof c === 'string' ? contact : c.value, note, source: 'online' })
      if (!res.ok) {
        // Окно успели занять: время сбрасываем, имя и контакт остаются
        select({ time: null })
        setErrors({ form: res.error })
        timeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      setDone(res.booking)
      requestAnimationFrame(() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch {
      setErrors({ form: 'Не получилось отправить запись. Проверьте интернет и попробуйте ещё раз.' })
    } finally {
      setBusy(false)
    }
  }

  function again() {
    setDone(null)
    resetSelection()
    setNote('')
    setShowNote(false)
  }

  if (done) return <Done data={data} booking={done} demo={backend.kind === 'local-demo'} onAgain={again} />

  const whenText = sel.date && chosenSlot ? `${dayHuman(sel.date)}, ${fmtTime(chosenSlot.time)}` : ''
  const masterLabel = master?.name ?? (eligible.length === 1 ? eligible[0].name : 'любой свободный')
  const step = (n: number, doneStep: boolean) => <span className={`bk-n ${doneStep ? 'is-done' : ''}`}>{doneStep ? <Check size={14} /> : n}</span>

  return (
    <>
      <div className="bk-panel rise">
        <div className="bk-steps">
          <div className="bk-step">
            <h3 className="bk-step-h">
              {step(1, !!service)}
              Услуга
            </h3>
            <div className="bk-svcs" role="radiogroup" aria-label="Услуга">
              {data.services.map((x) => (
                <button key={x.id} role="radio" aria-checked={x.id === sel.serviceId} className="bk-svc" onClick={() => select({ serviceId: x.id })}>
                  <b>{x.title}</b>
                  <span className="num">
                    {priceLabel(x)}, {fmtDuration(x.minutes)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {multi && (
            <div className={`bk-step ${service ? '' : 'is-off'}`}>
              <h3 className="bk-step-h">
                {step(2, !!service)}
                Мастер
              </h3>
              {service && eligible.length === 1 ? (
                <p className="bk-hint">Эту услугу делает {eligible[0].name}.</p>
              ) : service && eligible.length === 0 ? (
                <p className="bk-hint">Эту услугу сейчас никто не делает. Выберите другую или позвоните в&nbsp;студию.</p>
              ) : (
                <div className="bk-ms" role="radiogroup" aria-label="Мастер">
                  <button className="pill" role="radio" aria-checked={!sel.masterId} onClick={() => select({ masterId: null })}>
                    Любой, больше окон
                  </button>
                  {eligible.map((m) => (
                    <button key={m.id} className="pill" role="radio" aria-checked={sel.masterId === m.id} onClick={() => select({ masterId: m.id })}>
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={`bk-step ${service ? '' : 'is-off'}`} ref={timeRef}>
            <h3 className="bk-step-h">
              {step(multi ? 3 : 2, !!chosenSlot)}
              День и&nbsp;время
              {!service && <span className="bk-step-note">сначала выберите услугу</span>}
            </h3>
            {service && !anyFree ? (
              <p className="bk-hint">
                На&nbsp;ближайшие {data.studio.horizonDays}&nbsp;{plural(data.studio.horizonDays, 'день', 'дня', 'дней')} свободного времени нет.
                {multi && sel.masterId ? ' Попробуйте «Любой мастер».' : ''}
                {data.studio.phone ? (
                  <>
                    {' '}
                    Позвоните: <a href={telHref(data.studio.phone)}>{data.studio.phone}</a>.
                  </>
                ) : (
                  ''
                )}
              </p>
            ) : (
              <>
                <DateStrip days={days} value={service ? sel.date : null} disabled={!service} onChange={(iso) => select({ date: iso })} />
                {service && sel.date && (
                  <div className="bk-times" key={`${sel.date}-${service.id}-${sel.masterId}`}>
                    {freeCount === 0 ? (
                      <div className="bk-none">
                        <span>
                          {slots.length ? `На ${dayHuman(sel.date)} всё занято.` : `${dayFull(sel.date)}: выходной.`}
                          {nextFree ? ` Ближайшее свободное: ${dayHuman(nextFree.iso)}.` : ''}
                        </span>
                        {nextFree && (
                          <button className="btn is-line is-sm" onClick={() => select({ date: nextFree.iso })}>
                            Показать
                          </button>
                        )}
                      </div>
                    ) : (
                      PARTS.map((p, i) => {
                        const from = i ? PARTS[i - 1].to : 0
                        const part = slots.filter((x) => x.time >= from && x.time < p.to)
                        if (!part.length) return null
                        const free = part.filter((x) => x.free).length
                        return (
                          <div key={p.label} className="bk-part">
                            <p className="bk-part-h">
                              {p.label} <span>{free ? `${free} ${plural(free, 'окно', 'окна', 'окон')}` : 'всё занято'}</span>
                            </p>
                            <div className="bk-slots" role="radiogroup" aria-label={p.label}>
                              {part.map((x) => (
                                <button key={x.time} className="bk-slot num" role="radio" aria-checked={sel.time === x.time && x.free} disabled={!x.free} onClick={() => pickTime(x.time)} aria-label={`${fmtTime(x.time)}${x.free ? '' : ', занято'}`}>
                                  {fmtTime(x.time)}
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

          <div className="bk-step" ref={contactsRef}>
            <h3 className="bk-step-h">
              {step(multi ? 4 : 3, !!(name.trim() && contact.trim()))}
              Как с&nbsp;вами связаться
            </h3>
            <div className="bk-fields">
              <label className="bk-field">
                <span>Имя</span>
                <input
                  ref={nameRef}
                  className="bk-input"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'bk-name-err' : undefined}
                  value={name}
                  onChange={(e) => (setName(e.target.value), errors.name && setErrors({ ...errors, name: undefined }))}
                  autoComplete="given-name"
                  enterKeyHint="next"
                />
                {errors.name && (
                  <span className="bk-err" id="bk-name-err">
                    {errors.name}
                  </span>
                )}
              </label>
              <label className="bk-field">
                <span>Телефон или&nbsp;Telegram</span>
                <input
                  ref={contactRef}
                  className="bk-input num"
                  aria-invalid={!!errors.contact}
                  aria-describedby={errors.contact ? 'bk-contact-err' : 'bk-contact-help'}
                  value={contact}
                  onChange={(e) => (setContact(maskTyping(e.target.value)), errors.contact && setErrors({ ...errors, contact: undefined }))}
                  autoComplete="tel"
                  inputMode={/^[@a-zA-Z]/.test(contact) ? 'text' : 'tel'}
                  enterKeyHint="done"
                />
                {errors.contact ? (
                  <span className="bk-err" id="bk-contact-err">
                    {errors.contact}
                  </span>
                ) : (
                  <span className="bk-help" id="bk-contact-help">
                    +7 900 000-00-00 или @ник
                  </span>
                )}
              </label>
              {showNote ? (
                <label className="bk-field is-wide">
                  <span>Пожелание мастеру</span>
                  <textarea className="bk-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
                  <span className="bk-help">Например: хочу как на фото, пришлю в Telegram</span>
                </label>
              ) : (
                <button className="bk-more" onClick={() => setShowNote(true)}>
                  + Пожелание мастеру
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="bk-sum" aria-label="Ваша запись">
          <p className="bk-sum-h">Ваша запись</p>
          <dl>
            <div>
              <dt>Услуга</dt>
              <dd className={service ? '' : 'is-empty'}>{service?.title ?? 'не выбрана'}</dd>
            </div>
            {multi && (
              <div>
                <dt>Мастер</dt>
                <dd>{masterLabel}</dd>
              </div>
            )}
            <div>
              <dt>Когда</dt>
              <dd className={chosenSlot ? 'num' : 'is-empty'}>{chosenSlot ? whenText : 'не выбрано'}</dd>
            </div>
            {service && (
              <div>
                <dt>Длится</dt>
                <dd className="num">{fmtDuration(service.minutes)}</dd>
              </div>
            )}
          </dl>
          <p className="bk-total">
            <span>Стоимость</span>
            <b className="num">{service ? priceLabel(service) : '0 ₽'}</b>
          </p>
          <p className="bk-form-err" role="alert">
            {errors.form ?? ''}
          </p>
          <button className="btn is-accent is-wide bk-submit" onClick={submit} disabled={!service || busy} aria-busy={busy}>
            {busy ? 'Записываем…' : !service ? 'Выберите услугу' : !ready ? 'Выберите время' : 'Записаться'}
          </button>
          <p className="bk-fine">{data.studio.confirmNote}</p>
          <p className="bk-fine is-dim">
            Время по&nbsp;часам студии{data.studio.city ? ` (${data.studio.city})` : ''}. Нажимая «Записаться», вы соглашаетесь на&nbsp;обработку имени и&nbsp;контакта для связи по&nbsp;этой записи.
          </p>
          {isDemo && backend.kind === 'local-demo' && <p className="bk-demo">Демо: запись сохранится только в&nbsp;этом браузере и&nbsp;не&nbsp;уйдёт мастеру; часть окон занята для примера.</p>}
        </aside>
      </div>
      <BookBar service={service?.title} when={whenText || undefined} price={service ? priceLabel(service) : undefined} ready={ready} busy={busy} error={errors.form} onSubmit={submit} />
    </>
  )
}

function DateStrip({ days, value, disabled, onChange }: { days: ReturnType<typeof daysAhead>; value: string | null; disabled: boolean; onChange: (iso: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })
  const [month, setMonth] = useState(days[0] ? monthName(days[0].iso) : '')
  const onScroll = () => {
    const el = ref.current
    if (!el) return
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 })
    const first = Array.from(el.children).find((c) => (c as HTMLElement).offsetLeft + (c as HTMLElement).offsetWidth / 2 > el.scrollLeft) as HTMLElement | undefined
    if (first?.dataset.iso) setMonth(monthName(first.dataset.iso))
  }
  useLayoutEffect(() => {
    const el = ref.current
    const btn = el?.querySelector<HTMLElement>('[aria-checked="true"]')
    if (!el || !btn) return
    const left = btn.offsetLeft
    if (left < el.scrollLeft || left + btn.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollTo({ left: left - 16 })
  }, [value])
  useEffect(onScroll, [])
  return (
    <div className="bk-dates">
      <div className="bk-dates-h">
        <b>{month}</b>
        <span>
          <button onClick={() => ref.current?.scrollBy({ left: -280, behavior: 'smooth' })} disabled={edge.start} aria-label="Раньше">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => ref.current?.scrollBy({ left: 280, behavior: 'smooth' })} disabled={edge.end} aria-label="Позже">
            <ChevronRight size={18} />
          </button>
        </span>
      </div>
      <div className="bk-days" ref={ref} onScroll={onScroll} role="radiogroup" aria-label="День">
        {days.map((d, i) => {
          const wd = weekdayOf(d.iso)
          return (
            <button
              key={d.iso}
              data-iso={d.iso}
              className={`bk-day ${wd >= 5 ? 'is-we' : ''}`}
              role="radio"
              aria-checked={value === d.iso}
              disabled={disabled || !d.open || d.free === 0}
              onClick={() => onChange(d.iso)}
              aria-label={`${dayFull(d.iso)}${!d.open ? ', выходной' : d.free === 0 ? ', всё занято' : ''}`}
            >
              <small>{i === 0 ? 'сегодня' : i === 1 ? 'завтра' : WD_SHORT[wd].toLowerCase()}</small>
              <b className="num">{dateOf(d.iso).getDate()}</b>
              <i>{!d.open ? 'выходной' : d.free === 0 ? 'занято' : ''}</i>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BookBar({ service, when, price, ready, busy, error, onSubmit }: { service?: string; when?: string; price?: string; ready: boolean; busy: boolean; error?: string; onSubmit: () => void }) {
  const [inView, setInView] = useState(false)
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const el = document.getElementById('booking')
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '-30% 0px -25% 0px' })
    io.observe(el)
    const fin = (e: FocusEvent) => setTyping((e.target as HTMLElement).matches?.('input, textarea'))
    const fout = () => setTyping(false)
    el.addEventListener('focusin', fin)
    el.addEventListener('focusout', fout)
    return () => (io.disconnect(), el.removeEventListener('focusin', fin), el.removeEventListener('focusout', fout))
  }, [])
  const on = inView && !typing && !!service
  if (!service) return null
  return (
    <div className={`bar ${on ? 'is-on' : ''}`} aria-hidden={!on}>
      <div className="bar-t">
        <b>{service}</b>
        <span className={error ? 'is-err' : ''}>{error ?? (when ? `${when}, ${price}` : 'Выберите время')}</span>
      </div>
      <button className="btn is-accent" onClick={onSubmit} tabIndex={on ? 0 : -1} disabled={busy}>
        {ready ? 'Записаться' : 'Время'}
      </button>
    </div>
  )
}

function icsFor(data: Data, b: BookingT) {
  const s = data.services.find((x) => x.id === b.serviceId)
  // Время в UTC: календарь телефона в другом часовом поясе покажет визит правильно
  const utc = (min: number) => studioToUtc(b.date, min).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const text = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//nail-studio//RU',
    'BEGIN:VEVENT',
    `UID:${b.id}@nail-studio`,
    `DTSTAMP:${utc(0).slice(0, 8)}T000000Z`,
    `DTSTART:${utc(b.start)}`,
    `DTEND:${utc(b.start + b.minutes)}`,
    `SUMMARY:${s?.title ?? 'Маникюр'}, ${data.studio.name}`,
    `LOCATION:${[data.studio.city, data.studio.address].filter(Boolean).join(', ').replace(/,/g, '\\,')}`,
    ...remindHours(data.studio).flatMap((h) => ['BEGIN:VALARM', `TRIGGER:-PT${h}H`, 'ACTION:DISPLAY', 'DESCRIPTION:Напоминание о записи', 'END:VALARM']),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'zapis.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Done({ data, booking, demo, onAgain }: { data: Data; booking: BookingT; demo: boolean; onAgain: () => void }) {
  const s = data.services.find((x) => x.id === booking.serviceId)
  const m = data.masters.find((x) => x.id === booking.masterId)
  return (
    <div className="bk-done rise" role="status">
      <div className="bk-done-main">
        <p className="bk-done-k">{demo ? 'Демо: запись сохранена в этом браузере' : 'Запись отправлена мастеру'}</p>
        <h3 className="h3">{booking.name}, вы&nbsp;записаны</h3>
        <p className="bk-lead">{data.studio.confirmNote}</p>
        <div className="bk-done-actions">
          <button className="btn is-accent" onClick={() => icsFor(data, booking)}>
            Добавить в&nbsp;календарь
          </button>
          {data.studio.telegram && (
            <a className="btn is-line" href={`https://t.me/${data.studio.telegram.replace(/^@/, '')}`} target="_blank" rel="noreferrer">
              Написать мастеру <Out />
            </a>
          )}
        </div>
        <RemindCard data={data} booking={booking} />
        <button className="bk-more" onClick={onAgain}>
          Записаться ещё на&nbsp;одну услугу
        </button>
      </div>
      <dl className="bk-ticket">
        <div>
          <dt>Услуга</dt>
          <dd>{s?.title}</dd>
        </div>
        <div>
          <dt>Когда</dt>
          <dd className="num">
            {dayFull(booking.date)}, {fmtTime(booking.start)}
          </dd>
        </div>
        {data.masters.length > 1 && m && (
          <div>
            <dt>Мастер</dt>
            <dd>{m.name}</dd>
          </div>
        )}
        {data.studio.address && (
          <div>
            <dt>Адрес</dt>
            <dd>
              {data.studio.address}
              {data.studio.addressNote && <small>{data.studio.addressNote}</small>}
            </dd>
          </div>
        )}
        {s && (
          <div>
            <dt>Стоимость</dt>
            <dd className="num">{priceLabel(s)}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
