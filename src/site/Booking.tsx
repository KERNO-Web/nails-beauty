// Онлайн-запись: услуга → мастер (если их несколько) → день и время → контакты.
// Логика свободного времени — lib/slots.ts, запись и перепроверка окна — lib/store.ts. Здесь только подача.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { isDemo } from '../data/site'
import type { Booking as BookingT, Data } from '../data/types'
import { maskTyping, parseContact } from '../lib/contact'
import { remindHours } from '../lib/push'
import { resetSelection, select, useSelection } from '../lib/selection'
import { canDo, dateOf, dayFull, dayHuman, daySlots, daysAhead, fmtDuration, fmtTime, monthName, plural, priceLabel, studioToUtc, WD_SHORT, weekdayOf } from '../lib/slots'
import { createBooking } from '../lib/store'
import { Photo } from '../lib/ui'
import { RemindCard } from '../notify/Remind'
import { Arrow, ext, externalBooking, Out } from './common'

const PARTS = [
  { label: 'Утро', to: 12 * 60 },
  { label: 'День', to: 17 * 60 },
  { label: 'Вечер', to: 24 * 60 },
]

const Tick = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

export function Booking({ data }: { data: Data }) {
  const s = data.studio
  const extB = externalBooking(s)
  const phoneHref = s.phone ? `tel:${s.phone.replace(/[^\d+]/g, '')}` : ''

  // Внешняя запись: никакой своей сетки времени — только честная кнопка в сервис студии
  if (extB)
    return (
      <section className="bk" id="booking" aria-labelledby="bk-title">
        <div className="frame grid12 bk-head">
          <h2 className="h-chapter bk-title" id="bk-title">
            Онлайн-запись
          </h2>
          <div className="bk-ext">
            <p className="bk-intro">
              Свободное время и&nbsp;запись&nbsp;— {extB.name ? <>в&nbsp;{extB.name}</> : 'в сервисе студии'}: там видно расписание мастеров, а&nbsp;подтверждение приходит сразу.
            </p>
            <a className="cta cta--light" href={extB.url} {...ext}>
              Выбрать время {extB.name ? `в ${extB.name}` : ''} <Out />
            </a>
            {s.phone && (
              <p className="bk-alt">
                Или по&nbsp;телефону <a href={phoneHref}>{s.phone}</a>
              </p>
            )}
          </div>
        </div>
      </section>
    )

  if (!data.services.length || !data.masters.length)
    return (
      <section className="bk" id="booking" aria-labelledby="bk-title">
        <div className="frame grid12 bk-head">
          <h2 className="h-chapter bk-title" id="bk-title">
            Запись
          </h2>
          <div className="bk-ext">
            <p className="bk-intro">Онлайн-запись откроется, когда студия добавит услуги и&nbsp;график мастеров.</p>
            {s.phone && (
              <a className="cta cta--light" href={phoneHref}>
                Позвонить {s.phone}
              </a>
            )}
          </div>
        </div>
      </section>
    )

  return <NativeBooking data={data} />
}

function NativeBooking({ data }: { data: Data }) {
  const sel = useSelection()
  const service = data.services.find((s) => s.id === sel.serviceId) ?? null
  const multi = data.masters.length > 1
  const master = data.masters.find((m) => m.id === sel.masterId) ?? null
  const eligible = service ? data.masters.filter((m) => canDo(m, service.id)) : data.masters
  const [editService, setEditService] = useState(!service)
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

  // Услугу выбрали снаружи (меню цен, галерея) — сворачиваем список
  useEffect(() => {
    if (service) setEditService(false)
  }, [service?.id])

  // Мастер не делает выбранную услугу — переключаем на «любого»; один подходящий мастер — выбираем его
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
  const freeCount = slots.filter((x) => x.free).length
  const nextFree = days.find((d) => d.free > 0 && d.iso > (sel.date ?? ''))
  const anyFree = days.some((d) => d.free > 0)

  const chosenSlot = slots.find((x) => x.time === sel.time && x.free)
  const ready = !!(service && sel.date && chosenSlot)
  const contactsFilled = name.trim().length > 0 && contact.trim().length > 0

  function pickTime(t: number) {
    select({ time: t })
    setErrors((e) => ({ ...e, form: undefined }))
    // На телефоне сразу показываем следующий шаг
    if (window.innerWidth < 1024) setTimeout(() => contactsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 140)
  }

  function submit() {
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
    setBusy(false)
    if (!res.ok) {
      // Окно успели занять: время сбрасываем, имя и контакт остаются
      select({ time: null })
      setErrors({ form: res.error })
      timeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setDone(res.booking)
    requestAnimationFrame(() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function again() {
    setDone(null)
    resetSelection()
    setEditService(true)
    setNote('')
    setShowNote(false)
  }

  const whenText = sel.date && chosenSlot ? `${dayHuman(sel.date)}, ${fmtTime(chosenSlot.time)}` : ''
  const masterLabel = master?.name ?? (eligible.length === 1 ? eligible[0].name : 'любой свободный')

  return (
    <section className="bk" id="booking" aria-labelledby="bk-title">
      <div className="frame grid12 bk-head">
        <h2 className="h-chapter bk-title" id="bk-title">
          Онлайн-запись
        </h2>
        <div className="bk-head-side">
          <p className="bk-intro">Свободное время&nbsp;— по&nbsp;графику мастеров, на&nbsp;{data.studio.horizonDays}&nbsp;{plural(data.studio.horizonDays, 'день', 'дня', 'дней')} вперёд. Занятые окна видны, но&nbsp;не&nbsp;выбираются.</p>
          {isDemo && (
            <p className="bk-demo">
              <b>Демо-режим.</b> Запись сохраняется только в&nbsp;этом браузере и&nbsp;не&nbsp;уходит мастеру; часть окон занята для примера.
            </p>
          )}
        </div>
      </div>

      <div className="frame">
        {done ? (
          <Done data={data} booking={done} onAgain={again} />
        ) : (
          <div className="bk-grid">
            <div className="bk-steps">
              {/* Услуга */}
              <div className={`bk-step ${service ? 'is-done' : ''}`}>
                <div className="bk-step-head">
                  <h3>Услуга</h3>
                  {service && <Tick />}
                </div>
                {service && !editService ? (
                  <div className="bk-picked">
                    <span>
                      <b>{service.title}</b>
                      <small className="tnum">
                        {fmtDuration(service.minutes)} · {priceLabel(service)}
                      </small>
                    </span>
                    <button className="bk-change" onClick={() => setEditService(true)}>
                      Изменить
                    </button>
                  </div>
                ) : (
                  <div className="bk-opts" role="radiogroup" aria-label="Услуга">
                    {data.services.map((x) => (
                      <button
                        key={x.id}
                        role="radio"
                        aria-checked={x.id === sel.serviceId}
                        className="bk-opt"
                        onClick={() => {
                          select({ serviceId: x.id })
                          setEditService(false)
                        }}
                      >
                        <span className="bk-radio" aria-hidden />
                        <span className="bk-opt-main">
                          <b>{x.title}</b>
                          <small>{fmtDuration(x.minutes)}</small>
                        </span>
                        <span className="bk-opt-price tnum">{priceLabel(x)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Мастер — только если их несколько */}
              {multi && (
                <div className={`bk-step ${service ? '' : 'is-locked'}`}>
                  <div className="bk-step-head">
                    <h3>Мастер</h3>
                    {service && <Tick />}
                  </div>
                  {service && eligible.length === 1 ? (
                    <p className="bk-hint">
                      Эту услугу делает {eligible[0].name}.
                    </p>
                  ) : service && eligible.length === 0 ? (
                    <p className="bk-hint is-warn">Эту услугу сейчас никто не делает. Выберите другую или позвоните в&nbsp;студию.</p>
                  ) : (
                    <div className="bk-masters" role="radiogroup" aria-label="Мастер">
                      <button className="bk-mp" role="radio" aria-checked={!sel.masterId} onClick={() => select({ masterId: null })}>
                        <span className="bk-mp-any" aria-hidden>
                          {eligible.length}
                        </span>
                        <span>
                          <b>Любой мастер</b>
                          <small>больше свободных окон</small>
                        </span>
                      </button>
                      {eligible.map((m) => {
                        const pic = m.photo ?? data.works.find((w) => w.masterId === m.id)?.photo
                        return (
                          <button key={m.id} className="bk-mp" role="radio" aria-checked={sel.masterId === m.id} onClick={() => select({ masterId: m.id })}>
                            <span className="bk-mp-pic" aria-hidden>
                              {pic ? <Photo photo={pic} w={96} sizes="44px" alt="" loading="lazy" /> : m.name.charAt(0)}
                            </span>
                            <span>
                              <b>{m.name}</b>
                              <small>{m.role}</small>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Дата и время */}
              <div className={`bk-step ${service ? '' : 'is-locked'}`} ref={timeRef}>
                <div className="bk-step-head">
                  <h3>День и&nbsp;время</h3>
                  {chosenSlot && <Tick />}
                  {!service && <span className="bk-step-note">сначала выберите услугу</span>}
                </div>
                {service && !anyFree ? (
                  <p className="bk-hint is-warn">
                    На&nbsp;ближайшие {data.studio.horizonDays}&nbsp;{plural(data.studio.horizonDays, 'день', 'дня', 'дней')} свободного времени нет.
                    {multi && sel.masterId ? ' Попробуйте «Любой мастер».' : ''}
                    {data.studio.phone ? <> Позвоните&nbsp;— <a href={`tel:${data.studio.phone.replace(/[^\d+]/g, '')}`}>{data.studio.phone}</a>, иногда окна освобождаются.</> : ''}
                  </p>
                ) : (
                  <>
                    <DateStrip days={days} value={service ? sel.date : null} disabled={!service} onChange={(iso) => select({ date: iso })} />
                    {service && sel.date && (
                      <div className="bk-times" key={`${sel.date}-${service.id}-${sel.masterId}`}>
                        {freeCount === 0 ? (
                          <div className="bk-none">
                            <span>
                              {slots.length ? `На ${dayHuman(sel.date)} всё занято.` : `${dayFull(sel.date)} — выходной.`}
                              {nextFree ? ` Ближайшее свободное — ${dayHuman(nextFree.iso)}.` : ''}
                            </span>
                            {nextFree && (
                              <button className="cta cta--ghost cta--sm" onClick={() => select({ date: nextFree.iso })}>
                                Показать {dayHuman(nextFree.iso)} <Arrow size={14} />
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
                                <p className="bk-part-title">
                                  <span>{p.label}</span>
                                  <span>{free ? `${free} ${plural(free, 'окно', 'окна', 'окон')}` : 'всё занято'}</span>
                                </p>
                                <div className="bk-slots" role="radiogroup" aria-label={p.label}>
                                  {part.map((x) => (
                                    <button key={x.time} className="bk-slot tnum" role="radio" aria-checked={sel.time === x.time && x.free} disabled={!x.free} onClick={() => pickTime(x.time)} aria-label={`${fmtTime(x.time)}${x.free ? '' : ', занято'}`}>
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

              {/* Контакты */}
              <div className={`bk-step ${contactsFilled && ready ? 'is-done' : ''}`} ref={contactsRef}>
                <div className="bk-step-head">
                  <h3>Ваши контакты</h3>
                  {contactsFilled && ready && <Tick />}
                </div>
                <div className="bk-fields">
                  <div className="bk-field">
                    <label htmlFor="bk-name">Имя</label>
                    <input
                      id="bk-name"
                      ref={nameRef}
                      className="bk-input"
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? 'bk-name-err' : undefined}
                      value={name}
                      onChange={(e) => (setName(e.target.value), errors.name && setErrors({ ...errors, name: undefined }))}
                      autoComplete="given-name"
                      placeholder="Как к вам обращаться"
                      enterKeyHint="next"
                    />
                    {errors.name && (
                      <span className="bk-err" id="bk-name-err">
                        {errors.name}
                      </span>
                    )}
                  </div>
                  <div className="bk-field">
                    <label htmlFor="bk-contact">Телефон или&nbsp;Telegram</label>
                    <input
                      id="bk-contact"
                      ref={contactRef}
                      className="bk-input tnum"
                      aria-invalid={!!errors.contact}
                      aria-describedby={errors.contact ? 'bk-contact-err' : undefined}
                      value={contact}
                      onChange={(e) => (setContact(maskTyping(e.target.value)), errors.contact && setErrors({ ...errors, contact: undefined }))}
                      autoComplete="tel"
                      inputMode={/^[@a-zA-Z]/.test(contact) ? 'text' : 'tel'}
                      placeholder="+7 (900) 000-00-00 или @ник"
                      enterKeyHint="done"
                    />
                    {errors.contact && (
                      <span className="bk-err" id="bk-contact-err">
                        {errors.contact}
                      </span>
                    )}
                  </div>
                  {showNote ? (
                    <div className="bk-field is-wide">
                      <label htmlFor="bk-note">Пожелание мастеру</label>
                      <textarea id="bk-note" className="bk-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: хочу как на фото, пришлю в Telegram" autoFocus />
                    </div>
                  ) : (
                    <button className="bk-add-note" onClick={() => setShowNote(true)}>
                      + Добавить пожелание
                    </button>
                  )}
                </div>
              </div>
            </div>

            <aside className="bk-sum" aria-label="Ваша запись">
              <p className="eyebrow">Ваша запись</p>
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
                  <dd className={chosenSlot ? 'tnum' : 'is-empty'}>{chosenSlot ? whenText : 'не выбрано'}</dd>
                </div>
                {service && (
                  <div>
                    <dt>Длительность</dt>
                    <dd className="tnum">{fmtDuration(service.minutes)}</dd>
                  </div>
                )}
                <div className="bk-total">
                  <dt>Стоимость</dt>
                  <dd className={service ? 'tnum' : 'is-empty'}>{service ? priceLabel(service) : '—'}</dd>
                </div>
              </dl>
              <p className="bk-form-err" role="alert">
                {errors.form ?? ''}
              </p>
              <button className="cta cta--light bk-submit" onClick={submit} disabled={!service || busy} aria-busy={busy}>
                {busy ? 'Записываем…' : !service ? 'Выберите услугу' : !ready ? 'Выберите время' : 'Записаться'}
              </button>
              <p className="bk-confirm">{data.studio.confirmNote}</p>
              <p className="bk-fine">
                Время указано по&nbsp;часам студии{data.studio.city ? ` (${data.studio.city})` : ''}. Нажимая «Записаться», вы соглашаетесь на&nbsp;обработку имени и&nbsp;контакта для связи по&nbsp;этой записи.
              </p>
            </aside>
          </div>
        )}
      </div>
      {!done && <BookBar service={service?.title} when={whenText || undefined} price={service ? priceLabel(service) : undefined} ready={ready} busy={busy} error={errors.form} onSubmit={submit} />}
    </section>
  )
}

/* ---------- Лента дат ---------- */

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

  // Выбранный день — в зоне видимости ленты (без прокрутки страницы)
  useLayoutEffect(() => {
    const el = ref.current
    const btn = el?.querySelector<HTMLElement>('[aria-checked="true"]')
    if (!el || !btn) return
    const left = btn.offsetLeft
    if (left < el.scrollLeft || left + btn.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollTo({ left: left - 16 })
  }, [value])
  useEffect(onScroll, [])

  return (
    <div className={`bk-dates ${edge.start ? '' : 'has-before'} ${edge.end ? '' : 'has-after'}`}>
      <div className="bk-dates-head">
        <b>{month}</b>
        <div className="bk-dates-nav">
          <button onClick={() => ref.current?.scrollBy({ left: -300, behavior: 'smooth' })} disabled={edge.start} aria-label="Раньше">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button onClick={() => ref.current?.scrollBy({ left: 300, behavior: 'smooth' })} disabled={edge.end} aria-label="Позже">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="bk-days" ref={ref} onScroll={onScroll} role="radiogroup" aria-label="День">
        {days.map((d, i) => {
          const wd = weekdayOf(d.iso)
          return (
            <button
              key={d.iso}
              data-iso={d.iso}
              className={`bk-day ${wd >= 5 ? 'is-weekend' : ''}`}
              role="radio"
              aria-checked={value === d.iso}
              disabled={disabled || !d.open || d.free === 0}
              onClick={() => onChange(d.iso)}
              aria-label={`${dayFull(d.iso)}${!d.open ? ', выходной' : d.free === 0 ? ', всё занято' : ''}`}
            >
              <small>{i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : WD_SHORT[wd]}</small>
              <b className="tnum">{dateOf(d.iso).getDate()}</b>
              <i>{!d.open ? 'выходной' : d.free === 0 ? 'занято' : disabled ? '' : 'есть окна'}</i>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Нижняя панель на телефоне ---------- */

function BookBar({ service, when, price, ready, busy, error, onSubmit }: { service?: string; when?: string; price?: string; ready: boolean; busy: boolean; error?: string; onSubmit: () => void }) {
  const [inView, setInView] = useState(false)
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const el = document.getElementById('booking')
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '-30% 0px -25% 0px' })
    io.observe(el)
    // Пока открыта клавиатура, панель не закрывает поля ввода
    const fin = (e: FocusEvent) => setTyping((e.target as HTMLElement).matches?.('input, textarea'))
    const fout = () => setTyping(false)
    el.addEventListener('focusin', fin)
    el.addEventListener('focusout', fout)
    return () => (io.disconnect(), el.removeEventListener('focusin', fin), el.removeEventListener('focusout', fout))
  }, [])
  const on = inView && !typing && !!service
  useEffect(() => {
    document.body.classList.toggle('has-bookbar', on)
  }, [on])
  if (!service) return null
  return (
    <div className={`bookbar ${on ? 'is-on' : ''}`} aria-hidden={!on}>
      <div className="bookbar-text">
        <b>{service}</b>
        <span className={error ? 'is-err' : ''}>{error ?? (when ? `${when} · ${price}` : 'Выберите время')}</span>
      </div>
      <button className="cta" onClick={onSubmit} tabIndex={on ? 0 : -1} disabled={busy}>
        {ready ? 'Записаться' : 'Время'}
      </button>
    </div>
  )
}

/* ---------- Готово ---------- */

function icsFor(data: Data, b: BookingT) {
  const s = data.services.find((x) => x.id === b.serviceId)
  // Время — в UTC: календарь телефона в другом часовом поясе покажет визит правильно
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
    `SUMMARY:${s?.title ?? 'Маникюр'} — ${data.studio.name}`,
    `LOCATION:${[data.studio.city, data.studio.address].filter(Boolean).join(', ').replace(/,/g, '\\,')}`,
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
    <div className="bk-done" role="status">
      <div className="bk-done-main">
        <p className="eyebrow">{isDemo ? 'Демо: запись сохранена в этом браузере' : 'Заявка отправлена'}</p>
        <h3 className="bk-done-title">{booking.name}, вы&nbsp;записаны</h3>
        <p className="bk-done-note">{data.studio.confirmNote}</p>
        <div className="bk-done-actions">
          <button className="cta cta--light" onClick={() => icsFor(data, booking)}>
            Добавить в&nbsp;календарь
          </button>
          {data.studio.telegram && (
            <a className="cta cta--ghost bk-ghost-light" href={`https://t.me/${data.studio.telegram}`} {...ext}>
              Написать мастеру <Out />
            </a>
          )}
        </div>
        <RemindCard data={data} booking={booking} />
        <button className="bk-again" onClick={onAgain}>
          Записаться ещё на&nbsp;одну услугу
        </button>
      </div>
      <dl className="bk-done-card">
        <div>
          <dt>Услуга</dt>
          <dd>{s?.title}</dd>
        </div>
        <div>
          <dt>Когда</dt>
          <dd className="tnum">
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
            <dd className="tnum">{priceLabel(s)}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
