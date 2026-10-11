import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Booking as BookingT, Data } from '../data/types'
import { parseContact, maskTyping } from '../lib/contact'
import { Arrow, Calendar, Check, ChevronLeft, ChevronRight, People, Telegram } from '../lib/icons'
import { resetSelection, select, useSelection } from '../lib/selection'
import { canDo, dateOf, dayFull, dayHuman, daySlots, daysAhead, fmtDuration, fmtTime, monthName, plural, priceLabel, WD_SHORT, weekdayOf } from '../lib/slots'
import { createBooking } from '../lib/store'
import { remindHours } from '../lib/push'
import { Avatar } from '../lib/ui'
import { RemindCard } from '../notify/Remind'

const PARTS = [
  { label: 'Утро', to: 12 * 60 },
  { label: 'День', to: 17 * 60 },
  { label: 'Вечер', to: 24 * 60 },
]

export function Booking({ data }: { data: Data }) {
  const sel = useSelection()
  const service = data.services.find((s) => s.id === sel.serviceId) ?? null
  const multi = data.masters.length > 1
  const master = data.masters.find((m) => m.id === sel.masterId) ?? null
  const [editService, setEditService] = useState(!service)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; contact?: string; form?: string }>({})
  const [done, setDone] = useState<BookingT | null>(null)
  const timeRef = useRef<HTMLDivElement>(null)
  const contactRef = useRef<HTMLDivElement>(null)

  // Услугу выбрали снаружи (карточка, галерея) — сворачиваем список
  useEffect(() => {
    if (service) setEditService(false)
  }, [service?.id])

  // Мастер не делает выбранную услугу — переключаем на «любого»
  useEffect(() => {
    if (service && master && !canDo(master, service.id)) select({ masterId: null })
  }, [service?.id, master?.id])

  const days = useMemo(() => daysAhead(data, service?.id ?? null, sel.masterId), [data, service?.id, sel.masterId])

  // Дата не выбрана или на ней нет окон — ставим ближайший день со свободным временем
  useEffect(() => {
    if (!service) return
    const cur = days.find((d) => d.iso === sel.date)
    if (!cur || cur.free === 0) {
      const first = days.find((d) => d.free > 0)
      if (first && first.iso !== sel.date) select({ date: first.iso })
    }
  }, [days, service?.id])

  const slots = useMemo(() => (service && sel.date ? daySlots(data, service.id, sel.masterId, sel.date) : []), [data, service?.id, sel.masterId, sel.date])
  const freeCount = slots.filter((s) => s.free).length
  const nextFree = days.find((d) => d.free > 0 && d.iso > (sel.date ?? ''))

  const chosenSlot = slots.find((s) => s.time === sel.time && s.free)
  const ready = !!(service && sel.date && chosenSlot)
  const contactsFilled = name.trim().length > 0 && contact.trim().length > 0

  function pickTime(t: number) {
    select({ time: t })
    // На телефоне сразу показываем следующий шаг
    if (window.innerWidth < 1000) setTimeout(() => contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
  }

  function submit() {
    if (!service) return
    if (!ready) {
      timeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'Как к вам обращаться?'
    const c = parseContact(contact)
    if (typeof c === 'string') errs.contact = c
    setErrors(errs)
    if (errs.name || errs.contact) {
      contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const res = createBooking({
      serviceId: service.id,
      masterId: sel.masterId,
      date: sel.date!,
      start: sel.time!,
      name,
      contact: typeof c === 'string' ? contact : c.value,
      note,
      source: 'online',
    })
    if (!res.ok) {
      select({ time: null })
      setErrors({ form: res.error })
      return
    }
    setDone(res.booking)
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function again() {
    setDone(null)
    resetSelection()
    setEditService(true)
    setNote('')
    setShowNote(false)
  }

  const stepN = (n: number) => (multi ? n : n > 2 ? n - 1 : n)
  const whenText = sel.date ? `${dayHuman(sel.date)}${chosenSlot ? `, ${fmtTime(chosenSlot.time)}` : ''}` : ''

  return (
    <section className="booking" id="booking">
      <div className="wrap-wide">
        <header className="bk-head">
          <h2>Онлайн-запись</h2>
          <p>Только реально свободные окна — их видит и&nbsp;мастер. Занятое время зачёркнуто.</p>
        </header>

        {done ? (
          <Done data={data} booking={done} onAgain={again} />
        ) : (
          <div className="booking-grid">
            <div className="panel steps">
              {/* 1. Услуга */}
              <div className={`step ${service ? 'is-done' : ''}`}>
                <div className="step-head">
                  <span className="step-n">{service ? <Check size={14} /> : '01'}</span>
                  <span className="step-title">Услуга</span>
                </div>
                <div className="step-body">
                  {service && !editService ? (
                    <div className="collapsed-pick">
                      <span className="opt-main">
                        <b>{service.title}</b>
                        <small>
                          {fmtDuration(service.minutes)} · {priceLabel(service)}
                        </small>
                      </span>
                      <button className="btn btn-sm btn-line" onClick={() => setEditService(true)}>
                        Изменить
                      </button>
                    </div>
                  ) : (
                    <div className="opt-list" role="radiogroup" aria-label="Услуга">
                      {data.services.map((s) => (
                        <button
                          key={s.id}
                          role="radio"
                          aria-checked={s.id === sel.serviceId}
                          className="opt"
                          onClick={() => {
                            select({ serviceId: s.id })
                            setEditService(false)
                          }}
                        >
                          <span className="opt-radio" />
                          <span className="opt-main">
                            <b>{s.title}</b>
                            <small>{fmtDuration(s.minutes)}</small>
                          </span>
                          <span className="opt-price num">{priceLabel(s)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Мастер */}
              {multi && (
                <div className={`step ${service ? 'is-done' : 'is-locked'}`}>
                  <div className="step-head">
                    <span className="step-n">{service ? <Check size={14} /> : '02'}</span>
                    <span className="step-title">Мастер</span>
                  </div>
                  <div className="step-body">
                    <div className="master-pick" role="radiogroup" aria-label="Мастер">
                      <button className="mp" role="radio" aria-checked={!sel.masterId} onClick={() => select({ masterId: null })}>
                        <span className="mp-any">
                          <People />
                        </span>
                        <span>
                          <b>Любой мастер</b>
                          <small>больше свободных окон</small>
                        </span>
                      </button>
                      {data.masters
                        .filter((m) => !service || canDo(m, service.id))
                        .map((m) => (
                          <button key={m.id} className="mp" role="radio" aria-checked={sel.masterId === m.id} onClick={() => select({ masterId: m.id })}>
                            <Avatar name={m.name} photo={m.photo} size={40} />
                            <span>
                              <b>{m.name}</b>
                              <small>{m.role}</small>
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Дата и время */}
              <div className={`step ${chosenSlot ? 'is-done' : ''} ${service ? '' : 'is-locked'}`} ref={timeRef}>
                <div className="step-head">
                  <span className="step-n">{chosenSlot ? <Check size={14} /> : `0${stepN(3)}`}</span>
                  <span className="step-title">Дата и время</span>
                  {!service && <span className="step-value">сначала выберите услугу</span>}
                </div>
                <div className="step-body">
                  <DateStrip days={days} value={sel.date} onChange={(iso) => select({ date: iso })} />
                  {service && sel.date && (
                    <div className="times" key={`${sel.date}-${service.id}-${sel.masterId}`} style={{ marginTop: 18 }}>
                      {freeCount === 0 ? (
                        <div className="no-slots">
                          <span>
                            {slots.length ? `На ${dayHuman(sel.date)} всё занято.` : `${dayFull(sel.date)} — выходной.`}
                            {nextFree ? ` Ближайшее свободное — ${dayHuman(nextFree.iso)}.` : ''}
                          </span>
                          {nextFree && (
                            <button className="btn btn-sm btn-soft" onClick={() => select({ date: nextFree.iso })}>
                              Показать {dayHuman(nextFree.iso)} <Arrow size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        PARTS.map((p, i) => {
                          const from = i ? PARTS[i - 1].to : 0
                          const part = slots.filter((s) => s.time >= from && s.time < p.to)
                          if (!part.length) return null
                          const free = part.filter((s) => s.free).length
                          return (
                            <div key={p.label}>
                              <div className="part-title">
                                <span>{p.label}</span>
                                <span>{free ? `${free} ${plural(free, 'окно', 'окна', 'окон')}` : 'занято'}</span>
                              </div>
                              <div className="slots" role="radiogroup" aria-label={p.label}>
                                {part.map((s) => (
                                  <button key={s.time} className="slot" role="radio" aria-checked={sel.time === s.time && s.free} disabled={!s.free} onClick={() => pickTime(s.time)} aria-label={`${fmtTime(s.time)}${s.free ? '' : ', занято'}`}>
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
                </div>
              </div>

              {/* 4. Контакты */}
              <div className={`step ${contactsFilled && ready ? 'is-done' : ''}`} ref={contactRef}>
                <div className="step-head">
                  <span className="step-n">{contactsFilled && ready ? <Check size={14} /> : `0${stepN(4)}`}</span>
                  <span className="step-title">Ваши контакты</span>
                </div>
                <div className="step-body fields">
                  <div className="field">
                    <label htmlFor="bk-name">Имя</label>
                    <input id="bk-name" className={`input ${errors.name ? 'has-error' : ''}`} value={name} onChange={(e) => (setName(e.target.value), errors.name && setErrors({ ...errors, name: undefined }))} autoComplete="given-name" placeholder="Как к вам обращаться" enterKeyHint="next" />
                    {errors.name && <span className="field-error">{errors.name}</span>}
                  </div>
                  <div className="field">
                    <label htmlFor="bk-contact">Телефон или Telegram</label>
                    <input
                      id="bk-contact"
                      className={`input ${errors.contact ? 'has-error' : ''}`}
                      value={contact}
                      onChange={(e) => (setContact(maskTyping(e.target.value)), errors.contact && setErrors({ ...errors, contact: undefined }))}
                      autoComplete="tel"
                      inputMode={/^[@a-zA-Z]/.test(contact) ? 'text' : 'tel'}
                      placeholder="+7 (900) 000-00-00 или @ник"
                      enterKeyHint="done"
                    />
                    {errors.contact && <span className="field-error">{errors.contact}</span>}
                  </div>
                  {showNote ? (
                    <div className="field full">
                      <label htmlFor="bk-note">Пожелание мастеру</label>
                      <textarea id="bk-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: хочу как на фото, пришлю в Telegram" autoFocus />
                    </div>
                  ) : (
                    <button className="add-note full" onClick={() => setShowNote(true)}>
                      + Добавить пожелание
                    </button>
                  )}
                </div>
              </div>

              <div className="summary-mobile-only" style={{ paddingBottom: 20 }}>
                <p className="confirm-note">{data.studio.confirmNote}</p>
              </div>
            </div>

            <aside className="panel summary" aria-label="Ваша запись">
              <p className="summary-title">Ваша запись</p>
              <dl>
                <div>
                  <dt>Услуга</dt>
                  <dd className={service ? '' : 'empty'}>{service?.title ?? 'не выбрана'}</dd>
                </div>
                {multi && (
                  <div>
                    <dt>Мастер</dt>
                    <dd>{master?.name ?? 'любой'}</dd>
                  </div>
                )}
                <div>
                  <dt>Когда</dt>
                  <dd className={chosenSlot ? '' : 'empty'}>{chosenSlot ? whenText : 'не выбрано'}</dd>
                </div>
                {service && (
                  <div>
                    <dt>Длительность</dt>
                    <dd>{fmtDuration(service.minutes)}</dd>
                  </div>
                )}
                <div className="total">
                  <dt>Стоимость</dt>
                  <dd className={service ? 'num' : 'empty'}>{service ? priceLabel(service) : '—'}</dd>
                </div>
              </dl>
              {errors.form && <p className="form-error">{errors.form}</p>}
              <button className="btn btn-primary btn-block" onClick={submit} disabled={!service}>
                {!service ? 'Выберите услугу' : !ready ? 'Выберите время' : 'Записаться'}
              </button>
              <p className="confirm-note">{data.studio.confirmNote}</p>
              <p className="fineprint">Нажимая «Записаться», вы соглашаетесь на обработку имени и контакта для связи по записи.</p>
            </aside>
          </div>
        )}
      </div>
      {!done && <BookBar service={service?.title} when={chosenSlot ? whenText : undefined} price={service ? priceLabel(service) : undefined} ready={ready} error={errors.form} onSubmit={submit} />}
    </section>
  )
}

/* ---------- Лента дат ---------- */

function DateStrip({ days, value, onChange }: { days: ReturnType<typeof daysAhead>; value: string | null; onChange: (iso: string) => void }) {
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

  // Выбранный день — в зоне видимости ленты (без прокрутки страницы)
  useLayoutEffect(() => {
    const el = ref.current
    const btn = el?.querySelector<HTMLElement>('[aria-checked="true"]')
    if (!el || !btn) return
    const left = btn.offsetLeft - el.offsetLeft
    if (left < el.scrollLeft || left + btn.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollTo({ left: left - 16 })
  }, [value])

  return (
    <div>
      <div className="dates-head">
        <span>
          <b>{month}</b>
        </span>
        <div className="dates-nav">
          <button onClick={() => ref.current?.scrollBy({ left: -320 })} disabled={edge.start} aria-label="Раньше">
            <ChevronLeft />
          </button>
          <button onClick={() => ref.current?.scrollBy({ left: 320 })} disabled={edge.end} aria-label="Позже">
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="dates" ref={ref} onScroll={onScroll} role="radiogroup" aria-label="Дата">
        {days.map((d, i) => {
          const wd = weekdayOf(d.iso)
          return (
            <button
              key={d.iso}
              data-iso={d.iso}
              className={`date ${wd >= 5 ? 'is-weekend' : ''}`}
              role="radio"
              aria-checked={value === d.iso}
              disabled={!d.open || d.free === 0}
              onClick={() => onChange(d.iso)}
              aria-label={`${dayFull(d.iso)}${!d.open ? ', выходной' : d.free === 0 ? ', всё занято' : ''}`}
            >
              <small>{i === 0 ? 'Сег' : i === 1 ? 'Завт' : WD_SHORT[wd]}</small>
              <b>{dateOf(d.iso).getDate()}</b>
              {!d.open ? <i>вых</i> : d.free === 0 ? <i>занято</i> : <span className="dot" aria-hidden />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Нижняя панель на телефоне ---------- */

function BookBar({ service, when, price, ready, error, onSubmit }: { service?: string; when?: string; price?: string; ready: boolean; error?: string; onSubmit: () => void }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = document.getElementById('booking')
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: '-35% 0px -20% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    document.body.classList.toggle('has-bookbar', on)
  }, [on])
  if (!service) return null
  return (
    <div className={`bookbar ${on ? 'is-on' : ''}`} aria-hidden={!on}>
      <div className="bookbar-inner">
        <div className="bookbar-text">
          <b>{service}</b>
          {error ? <span style={{ color: '#a2443f' }}>{error}</span> : when ? `${when} · ${price}` : 'Выберите время'}
        </div>
        <button className="btn btn-primary" onClick={onSubmit} tabIndex={on ? 0 : -1}>
          {ready ? 'Записаться' : 'Время'}
          {!ready && <Arrow size={16} />}
        </button>
      </div>
    </div>
  )
}

/* ---------- Готово ---------- */

function icsFor(data: Data, b: BookingT) {
  const s = data.services.find((x) => x.id === b.serviceId)
  const pad = (n: number) => String(n).padStart(2, '0')
  const at = (min: number) => `${b.date.replace(/-/g, '')}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`
  const text = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//nail-studio//RU',
    'BEGIN:VEVENT',
    `UID:${b.id}@nail-studio`,
    `DTSTART:${at(b.start)}`,
    `DTEND:${at(b.start + b.minutes)}`,
    `SUMMARY:${s?.title ?? 'Маникюр'} — ${data.studio.name}`,
    `LOCATION:${data.studio.city}\\, ${data.studio.address.replace(/,/g, '\\,')}`,
    // Календарь телефона напомнит сам — за 24, 12, 3 и 1 час (studio.reminders), без сервера и установки
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

function Done({ data, booking, onAgain }: { data: Data; booking: BookingT; onAgain: () => void }) {
  const s = data.services.find((x) => x.id === booking.serviceId)
  const m = data.masters.find((x) => x.id === booking.masterId)
  return (
    <div className="panel done" role="status">
      <span className="done-mark">
        <Check />
      </span>
      <h3>
        {booking.name}, вы записаны
      </h3>
      <p className="muted" style={{ maxWidth: '46ch' }}>
        {data.studio.confirmNote}
      </p>
      <div className="done-card">
        <dl>
          <div>
            <dt>Услуга</dt>
            <dd>{s?.title}</dd>
          </div>
          <div>
            <dt>Когда</dt>
            <dd>
              {dayFull(booking.date)}, {fmtTime(booking.start)}
            </dd>
          </div>
          {data.masters.length > 1 && m && (
            <div>
              <dt>Мастер</dt>
              <dd>{m.name}</dd>
            </div>
          )}
          <div>
            <dt>Адрес</dt>
            <dd>{data.studio.address}</dd>
          </div>
          {s && (
            <div>
              <dt>Стоимость</dt>
              <dd className="num">{priceLabel(s)}</dd>
            </div>
          )}
        </dl>
      </div>
      <RemindCard data={data} booking={booking} />
      <div className="done-actions">
        <button className="btn btn-primary" onClick={() => icsFor(data, booking)}>
          <Calendar /> В календарь
        </button>
        {data.studio.telegram && (
          <a className="btn btn-soft" href={`https://t.me/${data.studio.telegram}`} target="_blank" rel="noreferrer">
            <Telegram size={18} /> Написать мастеру
          </a>
        )}
      </div>
      <button className="link" onClick={onAgain}>
        Записаться ещё на одну услугу
      </button>
    </div>
  )
}
