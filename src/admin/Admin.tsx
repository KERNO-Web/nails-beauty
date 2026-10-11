// Кабинет мастера: записи, график, услуги, работы, отзывы, данные студии.
// Демо-версия хранит всё в браузере; в боевой — те же формы пишут на сервер (см. lib/store.ts).
import { useMemo, useState } from 'react'
import type { Booking, Data, DayHours, Master, NailShape, Review, Service, ServiceCategory, Theme, Work, WorkTag } from '../data/types'
import { formatPhone, phoneDigits } from '../lib/contact'
import { addDays, busyOf, canDo, dateOf, dayFull, dayHuman, daySlots, fmtDuration, fmtTime, todayIso, toMin, WD_SHORT, weekdayOf } from '../lib/slots'
import { cancelBooking, createBooking, resetDemo, uid, update, useData } from '../lib/store'
import { Avatar, photoUrl } from '../lib/ui'
import { saveImage } from '../lib/media'
import './admin.css'

type Tab = 'bookings' | 'schedule' | 'services' | 'works' | 'reviews' | 'studio'
const TABS: { id: Tab; label: string }[] = [
  { id: 'bookings', label: 'Записи' },
  { id: 'schedule', label: 'График' },
  { id: 'services', label: 'Услуги' },
  { id: 'works', label: 'Работы' },
  { id: 'reviews', label: 'Отзывы' },
  { id: 'studio', label: 'Студия' },
]

export default function Admin() {
  const data = useData()
  const [tab, setTab] = useState<Tab>('bookings')
  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-wrap adm-top-row">
          <div className="adm-brand">
            <span className="brand-name">{data.studio.name}</span>
            <span className="adm-label">кабинет</span>
          </div>
          <a className="btn btn-sm btn-soft" href="#">
            Открыть сайт
          </a>
        </div>
        <nav className="adm-wrap adm-tabs" aria-label="Разделы кабинета">
          {TABS.map((t) => (
            <button key={t.id} className="chip" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="adm-wrap adm-main">
        {tab === 'bookings' && <Bookings data={data} />}
        {tab === 'schedule' && <Schedule data={data} />}
        {tab === 'services' && <Services data={data} />}
        {tab === 'works' && <Works data={data} />}
        {tab === 'reviews' && <Reviews data={data} />}
        {tab === 'studio' && <StudioTab data={data} />}
      </main>
    </div>
  )
}

/* ---------- Общие поля ---------- */

/** group — для набора кнопок: <label> вокруг нескольких кнопок путает их названия и клики */
function Field({ label, children, wide, group }: { label: string; children: React.ReactNode; wide?: boolean; group?: boolean }) {
  if (group)
    return (
      <div className={`adm-field ${wide ? 'wide' : ''}`} role="group" aria-label={label}>
        <span>{label}</span>
        {children}
      </div>
    )
  return (
    <label className={`adm-field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

/** Фото: загрузка с устройства (телефон — камера или галерея) или ссылка. С превью */
function PhotoField({ label, value, onChange, wide, optional }: { label: string; value: string; onChange: (v: string | undefined) => void; wide?: boolean; optional?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setErr('')
    try {
      onChange(await saveImage(file))
    } catch {
      setErr('Не получилось прочитать фото. Попробуйте JPG или PNG.')
    } finally {
      setBusy(false)
    }
  }
  const src = value ? photoUrl(value, 240) : ''
  return (
    <div className={`adm-field adm-photo ${wide ? 'wide' : ''}`} role="group" aria-label={label}>
      <span>{label}</span>
      <div className="adm-photo-row">
        <span className="adm-photo-prev">{src ? <img src={src} alt="" /> : null}</span>
        <div className="adm-photo-ctl">
          <label className={`btn btn-sm btn-primary adm-upload ${busy ? 'is-busy' : ''}`}>
            {busy ? 'Загружаю…' : value ? 'Заменить фото' : 'Загрузить с устройства'}
            <input type="file" accept="image/*" hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ''))} />
          </label>
          {optional && value && (
            <button className="adm-x" onClick={() => onChange(undefined)}>
              Убрать
            </button>
          )}
          <details className="adm-photo-url">
            <summary>или ссылка</summary>
            <input className="input" value={value.startsWith('idb:') ? '' : value} placeholder="https://… или id Unsplash (photo-…)" onChange={(e) => onChange(e.target.value.trim() || undefined)} />
          </details>
          {err && <span className="adm-err">{err}</span>}
        </div>
      </div>
    </div>
  )
}

const setService = (id: string, patch: Partial<Service>) => update((d) => ({ ...d, services: d.services.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
const setMaster = (id: string, patch: Partial<Master>) => update((d) => ({ ...d, masters: d.masters.map((m) => (m.id === id ? { ...m, ...patch } : m)) }))
const setWork = (id: string, patch: Partial<Work>) => update((d) => ({ ...d, works: d.works.map((w) => (w.id === id ? { ...w, ...patch } : w)) }))
const setReview = (id: string, patch: Partial<Review>) => update((d) => ({ ...d, reviews: d.reviews.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
const move = <T,>(arr: T[], i: number, d: number) => {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const out = [...arr]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

/* ---------- Записи ---------- */

function Bookings({ data }: { data: Data }) {
  const [date, setDate] = useState(todayIso())
  const [adding, setAdding] = useState(false)
  const days = Array.from({ length: 14 }, (_, i) => addDays(todayIso(), i))
  const countOn = (iso: string) => data.bookings.filter((b) => b.date === iso && b.status === 'active').length
  const upcoming = data.bookings.filter((b) => b.status === 'active' && b.date >= todayIso()).length

  return (
    <div className="adm-stack">
      <div className="adm-head">
        <div>
          <h1 className="adm-h1">Записи</h1>
          <p className="muted">
            Впереди: {upcoming} {upcoming === 1 ? 'запись' : upcoming > 1 && upcoming < 5 ? 'записи' : 'записей'} с сайта и ручных
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Скрыть форму' : '+ Записать вручную'}
        </button>
      </div>

      {adding && <ManualBooking data={data} date={date} onDone={() => setAdding(false)} />}

      <div className="adm-days">
        {days.map((iso, i) => (
          <button key={iso} className="date" role="radio" aria-checked={iso === date} onClick={() => setDate(iso)}>
            <small>{i === 0 ? 'Сег' : WD_SHORT[weekdayOf(iso)]}</small>
            <b>{dateOf(iso).getDate()}</b>
            <i>{countOn(iso) ? `${countOn(iso)} зап.` : ''}</i>
          </button>
        ))}
      </div>

      <h2 className="adm-h2">{dayFull(date)}</h2>
      <div className="adm-cols">
        {data.masters.map((m) => (
          <MasterDay key={m.id} data={data} master={m} date={date} />
        ))}
      </div>
    </div>
  )
}

function MasterDay({ data, master, date }: { data: Data; master: Master; date: string }) {
  const h = master.schedule[weekdayOf(date)]
  const off = !h || master.daysOff.includes(date)
  const items = busyOf(data, master, date).sort((a, b) => a.start - b.start)
  const cancelled = data.bookings.filter((b) => b.masterId === master.id && b.date === date && b.status === 'cancelled')
  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <Avatar name={master.name} photo={master.photo} size={36} />
        <div>
          <b>{master.name}</b>
          <small>{off ? 'выходной' : `${h!.open}–${h!.close}`}</small>
        </div>
      </div>
      {off ? (
        <p className="muted adm-empty">Не работает в этот день</p>
      ) : !items.length ? (
        <p className="muted adm-empty">Записей нет — весь день свободен</p>
      ) : (
        <ul className="adm-list">
          {items.map((it, i) =>
            it.booking ? (
              <BookingRow key={it.booking.id} data={data} b={it.booking} />
            ) : (
              <li key={i} className="adm-row demo">
                <span className="adm-time num">
                  {fmtTime(it.start)}–{fmtTime(it.end)}
                </span>
                <span className="muted">Занято (демо-заполнение)</span>
              </li>
            ),
          )}
        </ul>
      )}
      {cancelled.length > 0 && (
        <p className="adm-small muted">
          Отменено: {cancelled.map((b) => `${fmtTime(b.start)} ${b.name}`).join(', ')}
        </p>
      )}
    </section>
  )
}

function BookingRow({ data, b }: { data: Data; b: Booking }) {
  const s = data.services.find((x) => x.id === b.serviceId)
  const isTg = b.contact.startsWith('@')
  const href = isTg ? `https://t.me/${b.contact.slice(1)}` : `tel:${b.contact.replace(/[^\d+]/g, '')}`
  return (
    <li className="adm-row">
      <span className="adm-time num">
        {fmtTime(b.start)}–{fmtTime(b.start + b.minutes)}
      </span>
      <span className="adm-row-main">
        <b>
          {b.name} <span className={`adm-tag ${b.source}`}>{b.source === 'online' ? 'с сайта' : 'вручную'}</span>
        </b>
        <small>
          {s?.title ?? 'Услуга удалена'} ·{' '}
          <a href={href} target="_blank" rel="noreferrer">
            {b.contact}
          </a>
        </small>
        {b.note && <small className="adm-note">«{b.note}»</small>}
      </span>
      <button
        className="adm-x"
        onClick={() => {
          if (confirm(`Отменить запись ${b.name} на ${fmtTime(b.start)}? Время снова станет свободным на сайте.`)) cancelBooking(b.id)
        }}
      >
        Отменить
      </button>
    </li>
  )
}

function ManualBooking({ data, date: initialDate, onDone }: { data: Data; date: string; onDone: () => void }) {
  const [serviceId, setServiceId] = useState(data.services[0]?.id ?? '')
  // По умолчанию — мастер, который в этот день работает
  const [masterId, setMasterId] = useState(data.masters.find((m) => m.schedule[weekdayOf(initialDate)] && !m.daysOff.includes(initialDate))?.id ?? data.masters[0]?.id ?? '')
  const [custom, setCustom] = useState('')
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [msg, setMsg] = useState('')
  const free = useMemo(() => daySlots(data, serviceId, masterId, date).filter((s) => s.free), [data, serviceId, masterId, date])
  const capable = data.masters.filter((m) => canDo(m, serviceId))

  function save() {
    const t = custom ? toMin(custom) : time ? Number(time) : free[0]?.time
    if (t === undefined) return setMsg('Свободных окон в этот день нет — выберите другой день или впишите время вручную.')
    if (!name.trim()) return setMsg('Укажите имя клиента')
    const d = phoneDigits(contact)
    const res = createBooking({ serviceId, masterId, date, start: t, name, contact: d ? formatPhone(d) : contact, source: 'manual' })
    if (!res.ok) return setMsg(res.error)
    onDone()
  }

  return (
    <section className="adm-card adm-form">
      <h2 className="adm-h2">Ручная запись</h2>
      <p className="muted adm-small">Для клиентов, которые написали или позвонили. Время сразу пропадёт из свободных на сайте.</p>
      <div className="adm-grid">
        <Field label="Услуга">
          <select
            className="input"
            value={serviceId}
            onChange={(e) => {
              const id = e.target.value
              setServiceId(id)
              const cur = data.masters.find((m) => m.id === masterId)
              if (cur && !canDo(cur, id)) setMasterId(data.masters.find((m) => canDo(m, id))?.id ?? masterId)
            }}
          >
            {data.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {fmtDuration(s.minutes)}
              </option>
            ))}
          </select>
        </Field>
        {data.masters.length > 1 && (
          <Field label="Мастер">
            <select className="input" value={masterId} onChange={(e) => setMasterId(e.target.value)}>
              {capable.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Дата">
          <input className="input" type="date" value={date} min={todayIso()} onChange={(e) => (setDate(e.target.value), setTime(''))} />
        </Field>
        <Field label={`Время (${free.length} свободно)`}>
          <select className="input" value={time} onChange={(e) => setTime(e.target.value)}>
            {free.length ? null : <option value="">нет свободного времени</option>}
            {free.map((s) => (
              <option key={s.time} value={s.time}>
                {fmtTime(s.time)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="…или своё время (можно поверх занятого)">
          <input className="input" type="time" step={300} value={custom} onChange={(e) => setCustom(e.target.value)} />
        </Field>
        <Field label="Имя клиента">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Телефон или Telegram">
          <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+7… или @ник" />
        </Field>
      </div>
      {msg && <p className="form-error">{msg}</p>}
      <div className="adm-actions">
        <button className="btn btn-primary btn-sm" onClick={save}>
          Записать на {dayHuman(date)}
          {custom ? `, ${fmtTime(toMin(custom))}` : free.length ? `, ${fmtTime(time ? Number(time) : free[0].time)}` : ''}
        </button>
      </div>
    </section>
  )
}

/* ---------- График ---------- */

function Schedule({ data }: { data: Data }) {
  return (
    <div className="adm-stack">
      <div className="adm-head">
        <div>
          <h1 className="adm-h1">График</h1>
          <p className="muted">Часы работы по дням недели и отдельные выходные. Сайт показывает окна только в рабочее время.</p>
        </div>
      </div>
      <div className="adm-cols">
        {data.masters.map((m) => (
          <MasterSchedule key={m.id} master={m} />
        ))}
      </div>
    </div>
  )
}

function MasterSchedule({ master: m }: { master: Master }) {
  const [off, setOff] = useState('')
  const setDay = (i: number, h: DayHours) => {
    const schedule = [...m.schedule] as Master['schedule']
    schedule[i] = h
    setMaster(m.id, { schedule })
  }
  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <Avatar name={m.name} photo={m.photo} size={36} />
        <div>
          <b>{m.name}</b>
          <small>{m.role}</small>
        </div>
      </div>
      <div className="adm-week">
        {m.schedule.map((h, i) => (
          <div key={i} className={`adm-day ${h ? '' : 'off'}`}>
            <label className="adm-check">
              <input type="checkbox" checked={!!h} onChange={(e) => setDay(i, e.target.checked ? { open: '10:00', close: '20:00' } : null)} />
              <span>{WD_SHORT[i]}</span>
            </label>
            {h ? (
              <span className="adm-hours">
                <input className="input" type="time" step={1800} value={h.open} onChange={(e) => setDay(i, { ...h, open: e.target.value })} aria-label={`${WD_SHORT[i]}: начало`} />
                <span>—</span>
                <input className="input" type="time" step={1800} value={h.close} onChange={(e) => setDay(i, { ...h, close: e.target.value })} aria-label={`${WD_SHORT[i]}: конец`} />
              </span>
            ) : (
              <span className="muted">выходной</span>
            )}
          </div>
        ))}
      </div>
      <h3 className="adm-h3">Выходные и отпуск</h3>
      <div className="adm-inline">
        <input className="input" type="date" value={off} min={todayIso()} onChange={(e) => setOff(e.target.value)} />
        <button
          className="btn btn-sm btn-soft"
          disabled={!off}
          onClick={() => {
            if (off && !m.daysOff.includes(off)) setMaster(m.id, { daysOff: [...m.daysOff, off].sort() })
            setOff('')
          }}
        >
          Добавить
        </button>
      </div>
      <div className="adm-chips">
        {m.daysOff.filter((d) => d >= todayIso()).map((d) => (
          <button key={d} className="chip" onClick={() => setMaster(m.id, { daysOff: m.daysOff.filter((x) => x !== d) })} title="Убрать">
            {dayHuman(d)} ✕
          </button>
        ))}
        {!m.daysOff.some((d) => d >= todayIso()) && <span className="muted adm-small">Пока нет — работает по графику</span>}
      </div>
    </section>
  )
}

/* ---------- Услуги ---------- */

const CATS: { id: ServiceCategory; label: string }[] = [
  { id: 'hands', label: 'Руки' },
  { id: 'feet', label: 'Ноги' },
  { id: 'extra', label: 'Дополнительно' },
]

function Services({ data }: { data: Data }) {
  return (
    <div className="adm-stack">
      <div className="adm-head">
        <div>
          <h1 className="adm-h1">Услуги и цены</h1>
          <p className="muted">Изменения сразу видны на сайте. Длительность определяет, какие окна подходят под услугу.</p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() =>
            update((d) => ({
              ...d,
              services: [...d.services, { id: uid(), title: 'Новая услуга', note: '', minutes: 60, price: 1000, category: 'hands', photo: d.services[0]?.photo ?? '' }],
            }))
          }
        >
          + Добавить услугу
        </button>
      </div>
      {data.services.map((s, i) => (
        <section key={s.id} className="adm-card adm-svc">
          <img className="adm-thumb" src={photoUrl(s.photo, 160)} alt="" />
          <div className="adm-grid">
            <Field label="Название">
              <input className="input" value={s.title} onChange={(e) => setService(s.id, { title: e.target.value })} />
            </Field>
            <Field label="Раздел">
              <select className="input" value={s.category} onChange={(e) => setService(s.id, { category: e.target.value as ServiceCategory })}>
                {CATS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Описание" wide>
              <textarea className="input" rows={2} value={s.note} onChange={(e) => setService(s.id, { note: e.target.value })} />
            </Field>
            <Field label="Цена, ₽">
              <input className="input" type="number" min={0} step={50} value={s.price} onChange={(e) => setService(s.id, { price: Number(e.target.value) })} />
            </Field>
            <Field label="Длительность, мин">
              <input className="input" type="number" min={15} step={15} value={s.minutes} onChange={(e) => setService(s.id, { minutes: Math.max(15, Number(e.target.value)) })} />
            </Field>
            <PhotoField label="Фото" wide value={s.photo} onChange={(v) => setService(s.id, { photo: v ?? '' })} />
          </div>
          <div className="adm-svc-side">
            <label className="adm-check">
              <input type="checkbox" checked={!!s.priceFrom} onChange={(e) => setService(s.id, { priceFrom: e.target.checked })} />
              <span>Цена «от»</span>
            </label>
            <label className="adm-check">
              <input type="checkbox" checked={!!s.popular} onChange={(e) => setService(s.id, { popular: e.target.checked })} />
              <span>Популярная</span>
            </label>
            <div className="adm-inline">
              <button className="adm-icon" onClick={() => update((d) => ({ ...d, services: move(d.services, i, -1) }))} aria-label="Выше">
                ↑
              </button>
              <button className="adm-icon" onClick={() => update((d) => ({ ...d, services: move(d.services, i, 1) }))} aria-label="Ниже">
                ↓
              </button>
              <button
                className="adm-x"
                onClick={() => {
                  if (confirm(`Удалить услугу «${s.title}»?`)) update((d) => ({ ...d, services: d.services.filter((x) => x.id !== s.id) }))
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}

/* ---------- Работы ---------- */

const TAGS: { id: WorkTag; label: string }[] = [
  { id: 'nude', label: 'Нюд' },
  { id: 'minimal', label: 'Минимализм' },
  { id: 'french', label: 'Френч' },
  { id: 'bright', label: 'Яркие' },
  { id: 'design', label: 'Дизайн' },
]

function Works({ data }: { data: Data }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setErr('')
    const added: string[] = []
    for (const f of Array.from(files)) {
      try {
        added.push(await saveImage(f))
      } catch {
        setErr('Часть фото не получилось прочитать — попробуйте JPG или PNG.')
      }
    }
    if (added.length)
      update((d) => ({ ...d, works: [...added.map((photo) => ({ id: uid(), photo, tag: 'nude' as WorkTag, title: 'Новая работа', serviceId: d.services[0]?.id })), ...d.works] }))
    setBusy(false)
  }
  return (
    <div className="adm-stack">
      <div className="adm-head">
        <div>
          <h1 className="adm-h1">Работы</h1>
          <p className="muted">Главная работа открывает галерею крупно. Стиль — для фильтров на сайте.</p>
        </div>
      </div>
      <section className="adm-card">
        <div className="adm-inline adm-add-works">
          <label className={`btn btn-primary adm-upload ${busy ? 'is-busy' : ''}`}>
            {busy ? 'Загружаю…' : '+ Фото работ с устройства'}
            <input type="file" accept="image/*" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ''))} />
          </label>
          <span className="muted adm-small">можно выбрать сразу несколько</span>
        </div>
        {err && <p className="adm-err">{err}</p>}
        <div className="adm-inline" style={{ marginTop: 12 }}>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="или ссылка на фото / id Unsplash (photo-…)" />
          <button
            className="btn btn-primary btn-sm"
            disabled={!url.trim()}
            onClick={() => {
              update((d) => ({ ...d, works: [{ id: uid(), photo: url.trim(), tag: 'nude', title: 'Новая работа', serviceId: d.services[0]?.id }, ...d.works] }))
              setUrl('')
            }}
          >
            Добавить
          </button>
        </div>
      </section>
      <div className="adm-works">
        {data.works.map((w, i) => (
          <section key={w.id} className="adm-card adm-work">
            <img src={photoUrl(w.photo, 400)} alt="" />
            <Field label="Подпись">
              <input className="input" value={w.title} onChange={(e) => setWork(w.id, { title: e.target.value })} />
            </Field>
            <div className="adm-grid">
              <Field label="Стиль">
                <select className="input" value={w.tag} onChange={(e) => setWork(w.id, { tag: e.target.value as WorkTag })}>
                  {TAGS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Услуга">
                <select className="input" value={w.serviceId ?? ''} onChange={(e) => setWork(w.id, { serviceId: e.target.value || undefined })}>
                  <option value="">—</option>
                  {data.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </Field>
              {data.masters.length > 1 && (
                <Field label="Мастер">
                  <select className="input" value={w.masterId ?? ''} onChange={(e) => setWork(w.id, { masterId: e.target.value || undefined })}>
                    <option value="">—</option>
                    {data.masters.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            <div className="adm-inline">
              <label className="adm-check">
                <input type="radio" name="featured" checked={!!w.featured} onChange={() => update((d) => ({ ...d, works: d.works.map((x) => ({ ...x, featured: x.id === w.id })) }))} />
                <span>Главная</span>
              </label>
              <span style={{ flex: 1 }} />
              <button className="adm-icon" onClick={() => update((d) => ({ ...d, works: move(d.works, i, -1) }))} aria-label="Раньше">
                ←
              </button>
              <button className="adm-icon" onClick={() => update((d) => ({ ...d, works: move(d.works, i, 1) }))} aria-label="Позже">
                →
              </button>
              <button className="adm-x" onClick={() => confirm('Убрать работу из галереи?') && update((d) => ({ ...d, works: d.works.filter((x) => x.id !== w.id) }))}>
                Убрать
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

/* ---------- Отзывы ---------- */

function Reviews({ data }: { data: Data }) {
  return (
    <div className="adm-stack">
      <div className="adm-head">
        <div>
          <h1 className="adm-h1">Отзывы</h1>
          <p className="muted">Публикуйте настоящие отзывы клиенток — из переписки или с карт, с их согласия.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => update((d) => ({ ...d, reviews: [{ id: uid(), name: '', service: d.services[0]?.title ?? '', date: todayIso(), text: '' }, ...d.reviews] }))}>
          + Добавить отзыв
        </button>
      </div>
      {data.reviews.map((r) => (
        <section key={r.id} className="adm-card">
          <div className="adm-grid">
            <Field label="Имя">
              <input className="input" value={r.name} onChange={(e) => setReview(r.id, { name: e.target.value })} />
            </Field>
            <Field label="Услуга">
              <input className="input" value={r.service} onChange={(e) => setReview(r.id, { service: e.target.value })} list="adm-services" />
            </Field>
            <Field label="Дата">
              <input className="input" type="date" value={r.date} onChange={(e) => setReview(r.id, { date: e.target.value })} />
            </Field>
            <Field label="Оценка (если клиент её ставил)">
              <select className="input" value={r.rating ?? ''} onChange={(e) => setReview(r.id, { rating: Number(e.target.value) || undefined })}>
                <option value="">— нет —</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Где оставлен (2ГИС, Яндекс…)">
              <input className="input" value={r.source ?? ''} onChange={(e) => setReview(r.id, { source: e.target.value || undefined })} />
            </Field>
            <Field label="Ссылка на отзыв (необязательно)" wide>
              <input className="input" value={r.url ?? ''} onChange={(e) => setReview(r.id, { url: e.target.value.trim() || undefined })} />
            </Field>
            <Field label="Текст" wide>
              <textarea className="input" rows={3} value={r.text} onChange={(e) => setReview(r.id, { text: e.target.value })} />
            </Field>
          </div>
          <div className="adm-actions">
            <button className="adm-x" onClick={() => confirm('Удалить отзыв?') && update((d) => ({ ...d, reviews: d.reviews.filter((x) => x.id !== r.id) }))}>
              Удалить
            </button>
          </div>
        </section>
      ))}
      <datalist id="adm-services">
        {data.services.map((s) => (
          <option key={s.id} value={s.title} />
        ))}
      </datalist>
    </div>
  )
}

/* ---------- Студия ---------- */

const ACCENTS = ['#2433D6', '#B3122E', '#1F5F4A', '#E0592A', '#6B3FA0', '#C9A27E']
const SHAPES: { id: NailShape; label: string }[] = [
  { id: 'almond', label: 'Миндаль' },
  { id: 'oval', label: 'Овал' },
  { id: 'square', label: 'Квадрат' },
  { id: 'coffin', label: 'Балерина' },
]

function StudioTab({ data }: { data: Data }) {
  const s = data.studio
  const set = (patch: Partial<Data['studio']>) => update((d) => ({ ...d, studio: { ...d.studio, ...patch } }))
  const setSource = (patch: Partial<NonNullable<Data['studio']['reviewsSource']>>) => {
    const next = { name: '', url: '', ...s.reviewsSource, ...patch }
    set({ reviewsSource: next.name || next.url || next.rating || next.count ? next : undefined })
  }
  const t = data.theme
  const setTheme = (patch: Partial<Theme>) => update((d) => ({ ...d, theme: { ...d.theme, ...patch } }))
  return (
    <div className="adm-stack">
      <div className="adm-head">
        <div>
          <h1 className="adm-h1">Студия</h1>
          <p className="muted">Название, контакты, цвет и мастера — всё, что меняется под нового клиента.</p>
        </div>
      </div>

      <section className="adm-card">
        <h2 className="adm-h2">Оформление</h2>
        <div className="adm-grid">
          <Field label="Название">
            <input className="input" value={s.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Подпись к названию">
            <input className="input" value={s.kind} onChange={(e) => set({ kind: e.target.value })} />
          </Field>
          <Field label="Логотип (ссылка, необязательно)" wide>
            <input className="input" value={s.logo ?? ''} onChange={(e) => set({ logo: e.target.value || undefined })} />
          </Field>
          <Field label="Цвет акцента и первого экрана" wide group>
            <span className="adm-inline">
              {ACCENTS.map((c) => (
                <button key={c} className={`adm-swatch ${t.accent.toLowerCase() === c.toLowerCase() ? 'on' : ''}`} style={{ background: c }} onClick={() => setTheme({ accent: c })} aria-label={c} />
              ))}
              <input type="color" value={t.accent} onChange={(e) => setTheme({ accent: e.target.value })} aria-label="Свой цвет" />
            </span>
          </Field>
          <Field label="Фон страницы">
            <input type="color" value={t.paper} onChange={(e) => setTheme({ paper: e.target.value })} aria-label="Фон страницы" />
          </Field>
          <Field label="Текст и тёмные блоки">
            <input type="color" value={t.ink} onChange={(e) => setTheme({ ink: e.target.value })} aria-label="Цвет текста" />
          </Field>
          <Field label="Форма ногтя в окнах с фото" wide group>
            <span className="adm-inline">
              {SHAPES.map((x) => (
                <button key={x.id} className={`btn btn-sm ${t.nailShape === x.id ? 'btn-primary' : 'btn-line'}`} onClick={() => setTheme({ nailShape: x.id })}>
                  {x.label}
                </button>
              ))}
            </span>
          </Field>
          <Field label="Заголовок первого экрана" wide>
            <input className="input" value={s.heroTitle} placeholder="Маникюр и педикюр" onChange={(e) => set({ heroTitle: e.target.value })} />
          </Field>
          <Field label="Подзаголовок (необязательно)" wide>
            <input className="input" value={s.heroLead} onChange={(e) => set({ heroLead: e.target.value })} />
          </Field>
          <PhotoField label="Главное фото (в капле на первом экране)" wide value={s.heroPhoto} onChange={(v) => set({ heroPhoto: v ?? '' })} />
          <Field label="Пометка для демо (в подвале, необязательно)" wide>
            <input className="input" value={s.demoNote ?? ''} onChange={(e) => set({ demoNote: e.target.value || undefined })} />
          </Field>
        </div>
      </section>

      <section className="adm-card">
        <h2 className="adm-h2">Адрес и контакты</h2>
        <div className="adm-grid">
          <Field label="Город">
            <input className="input" value={s.city} onChange={(e) => set({ city: e.target.value })} />
          </Field>
          <Field label="Адрес">
            <input className="input" value={s.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <Field label="Как найти" wide>
            <input className="input" value={s.addressNote} onChange={(e) => set({ addressNote: e.target.value })} />
          </Field>
          <Field label="Карта: долгота, широта">
            <input
              className="input"
              defaultValue={s.map.join(', ')}
              onBlur={(e) => {
                const [lon, lat] = e.target.value.split(',').map((x) => Number(x.trim()))
                if (lon && lat) set({ map: [lon, lat] })
              }}
            />
          </Field>
          <Field label="Телефон">
            <input className="input" value={s.phone} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="Telegram (ник без @)">
            <input className="input" value={s.telegram} onChange={(e) => set({ telegram: e.target.value.replace(/^@/, '') })} />
          </Field>
          <Field label="WhatsApp (номер цифрами)">
            <input className="input" value={s.whatsapp} onChange={(e) => set({ whatsapp: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label="ВКонтакте (адрес страницы)">
            <input className="input" value={s.vk} onChange={(e) => set({ vk: e.target.value })} />
          </Field>
          <Field label="Своя ссылка «Маршрут» (необязательно; по умолчанию — по координатам)" wide>
            <input className="input" value={s.routeUrl ?? ''} placeholder="https://2gis.ru/…" onChange={(e) => set({ routeUrl: e.target.value.trim() || undefined })} />
          </Field>
        </div>
      </section>

      <section className="adm-card">
        <h2 className="adm-h2">Отзывы на картах</h2>
        <p className="muted adm-small" style={{ marginBottom: 12 }}>
          Только настоящие цифры с публичной страницы. Без ссылки блок не показывается; без оценки и количества — показывается просто ссылка.
        </p>
        <div className="adm-grid">
          <Field label="Сервис">
            <input className="input" value={s.reviewsSource?.name ?? ''} placeholder="2ГИС" onChange={(e) => setSource({ name: e.target.value })} />
          </Field>
          <Field label="Ссылка на страницу с отзывами">
            <input className="input" value={s.reviewsSource?.url ?? ''} placeholder="https://2gis.ru/…" onChange={(e) => setSource({ url: e.target.value.trim() })} />
          </Field>
          <Field label="Средняя оценка">
            <input className="input" inputMode="decimal" value={s.reviewsSource?.rating ?? ''} placeholder="4.9" onChange={(e) => setSource({ rating: Number(e.target.value.replace(',', '.')) || undefined })} />
          </Field>
          <Field label="Количество отзывов">
            <input className="input" inputMode="numeric" value={s.reviewsSource?.count ?? ''} onChange={(e) => setSource({ count: Number(e.target.value.replace(/\D/g, '')) || undefined })} />
          </Field>
        </div>
      </section>

      <section className="adm-card">
        <h2 className="adm-h2">Запись</h2>
        <div className="adm-grid">
          <Field label="Шаг времени">
            <select className="input" value={s.stepMin} onChange={(e) => set({ stepMin: Number(e.target.value) })}>
              {[15, 30, 60].map((n) => (
                <option key={n} value={n}>
                  каждые {n} мин
                </option>
              ))}
            </select>
          </Field>
          <Field label="Перерыв между клиентами, мин">
            <input className="input" type="number" min={0} step={5} value={s.bufferMin} onChange={(e) => set({ bufferMin: Number(e.target.value) })} />
          </Field>
          <Field label="Запись открыта на, дней">
            <input className="input" type="number" min={7} max={60} value={s.horizonDays} onChange={(e) => set({ horizonDays: Math.min(60, Math.max(7, Number(e.target.value))) })} />
          </Field>
          <Field label="Текст о подтверждении" wide>
            <textarea className="input" rows={2} value={s.confirmNote} onChange={(e) => set({ confirmNote: e.target.value })} />
          </Field>
          <label className="adm-check wide">
            <input type="checkbox" checked={s.demoBusy} onChange={(e) => set({ demoBusy: e.target.checked })} />
            <span>Демо: заполнять расписание выдуманными записями (выключить для настоящей студии)</span>
          </label>
        </div>
      </section>

      <section className="adm-card">
        <div className="adm-head">
          <h2 className="adm-h2">Мастера</h2>
          <button
            className="btn btn-sm btn-soft"
            onClick={() =>
              update((d) => ({
                ...d,
                masters: [...d.masters, { id: uid(), name: 'Новый мастер', role: 'Маникюр', about: '', schedule: [{ open: '10:00', close: '20:00' }, { open: '10:00', close: '20:00' }, { open: '10:00', close: '20:00' }, { open: '10:00', close: '20:00' }, { open: '10:00', close: '20:00' }, null, null], daysOff: [], serviceIds: [] }],
              }))
            }
          >
            + Мастер
          </button>
        </div>
        <p className="muted adm-small">Один мастер — на сайте не будет выбора мастера и блока «Мастера». Два и больше — появятся сами.</p>
        {data.masters.map((m) => (
          <div key={m.id} className="adm-master">
            <div className="adm-grid">
              <Field label="Имя">
                <input className="input" value={m.name} onChange={(e) => setMaster(m.id, { name: e.target.value })} />
              </Field>
              <Field label="Кому (для кнопки «Записаться к …»)">
                <input className="input" value={m.nameDat ?? ''} onChange={(e) => setMaster(m.id, { nameDat: e.target.value })} placeholder="Анне" />
              </Field>
              <Field label="Специализация">
                <input className="input" value={m.role} onChange={(e) => setMaster(m.id, { role: e.target.value })} />
              </Field>
              <PhotoField label="Фото мастера — настоящее, если есть (без фото на сайте показываются его работы)" wide optional value={m.photo ?? ''} onChange={(v) => setMaster(m.id, { photo: v })} />
              <Field label="Стаж, лет (только если это правда)">
                <input className="input" inputMode="numeric" value={m.years ?? ''} onChange={(e) => setMaster(m.id, { years: Number(e.target.value.replace(/\D/g, '')) || undefined })} />
              </Field>
              <Field label="Ссылка на портфолио мастера (необязательно)">
                <input className="input" value={m.portfolio ?? ''} onChange={(e) => setMaster(m.id, { portfolio: e.target.value.trim() || undefined })} placeholder="https://t.me/…" />
              </Field>
              <Field label="О мастере" wide>
                <textarea className="input" rows={2} value={m.about} onChange={(e) => setMaster(m.id, { about: e.target.value })} />
              </Field>
            </div>
            <p className="adm-small muted" style={{ marginTop: 12 }}>
              Делает услуги (ничего не отмечено — все):
            </p>
            <div className="adm-chips">
              {data.services.map((sv) => {
                const on = m.serviceIds.includes(sv.id)
                return (
                  <button key={sv.id} className={`chip ${on ? 'is-on' : ''}`} onClick={() => setMaster(m.id, { serviceIds: on ? m.serviceIds.filter((x) => x !== sv.id) : [...m.serviceIds, sv.id] })}>
                    {sv.title}
                  </button>
                )
              })}
            </div>
            {data.masters.length > 1 && (
              <div className="adm-actions">
                <button className="adm-x" onClick={() => confirm(`Удалить мастера ${m.name}? Его будущие записи останутся в списке.`) && update((d) => ({ ...d, masters: d.masters.filter((x) => x.id !== m.id) }))}>
                  Удалить мастера
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="adm-card">
        <h2 className="adm-h2">Демо-данные</h2>
        <p className="muted adm-small">Вернуть шаблон к исходному виду: студия LUMI, два мастера, без ваших записей.</p>
        <div className="adm-actions">
          <button className="adm-x" onClick={() => confirm('Сбросить все изменения и записи?') && resetDemo()}>
            Сбросить к демо
          </button>
        </div>
      </section>
    </div>
  )
}
