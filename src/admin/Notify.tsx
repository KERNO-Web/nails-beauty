// «Подключить уведомления» в кабинете: заметная кнопка + гайд, как поставить кабинет приложением на рабочий стол
// (на iPhone без этого уведомления от сайта не работают) и включить уведомления о новых записях.
import { useEffect, useRef, useState } from 'react'
import type { Booking, Data } from '../data/types'
import { Close } from '../lib/icons'
import { enableNotifications, isIosNotSafari, notify, promptInstall, usePushState, type Platform } from '../lib/push'
import { dayHuman, fmtTime } from '../lib/slots'

/* ---------- Иконки, как их видит человек на телефоне ---------- */
const Bell = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
    <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
  </svg>
)
const ShareIos = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
)
const AddSquare = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 8.5v7M8.5 12h7" />
  </svg>
)
const Dots = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </svg>
)
const InstallIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
    <path d="M12 8v6M9.5 11.5 12 14l2.5-2.5" />
  </svg>
)

/* ---------- Мини-экраны к шагам ---------- */
function Shot({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <div className={`nt-shot ${dark ? 'is-dark' : ''}`}>{children}</div>
}

const AppIcon = ({ label }: { label: string }) => (
  <span className="nt-app">
    <img src="./apple-touch-icon.png" alt="" />
    <small>{label}</small>
  </span>
)

type Step = { title: React.ReactNode; text?: React.ReactNode; shot?: React.ReactNode }

function stepsFor(p: Exclude<Platform, 'desktop'>, appName: string): Step[] {
  if (p === 'ios')
    return [
      {
        title: 'Откройте кабинет в Safari',
        text: isIosNotSafari() ? 'Сейчас он открыт в другом браузере — скопируйте адрес и вставьте его в Safari.' : 'Нужен iPhone с iOS 16.4 или новее.',
      },
      {
        title: (
          <>
            Нажмите «Поделиться» <ShareIos />
          </>
        ),
        text: 'Кнопка внизу экрана (на iPad — вверху справа).',
        shot: (
          <Shot>
            <span className="nt-bar">
              <i>‹</i>
              <i>›</i>
              <b className="nt-hit">
                <ShareIos />
              </b>
              <i>▢</i>
              <i>⧉</i>
            </span>
          </Shot>
        ),
      },
      {
        title: 'Выберите «На экран „Домой“»',
        text: 'Если пункта не видно — пролистайте список вниз.',
        shot: (
          <Shot>
            <span className="nt-menu">
              <span>Скопировать</span>
              <span>Добавить в избранное</span>
              <span className="nt-hit-row">
                На экран «Домой» <AddSquare />
              </span>
            </span>
          </Shot>
        ),
      },
      {
        title: 'Нажмите «Добавить»',
        shot: (
          <Shot>
            <span className="nt-add">
              <span>Отменить</span>
              <b>На экран «Домой»</b>
              <span className="nt-hit-text">Добавить</span>
            </span>
          </Shot>
        ),
      },
      {
        title: `Откройте «${appName}» с рабочего стола`,
        text: 'И нажмите «Подключить уведомления» уже там — в приложении появится вопрос «Разрешить уведомления?».',
        shot: (
          <Shot dark>
            <AppIcon label={appName} />
          </Shot>
        ),
      },
    ]
  return [
    { title: 'Откройте кабинет в Chrome', text: 'В Яндекс Браузере и Samsung Internet пункт меню называется похоже.' },
    {
      title: (
        <>
          Нажмите меню <Dots />
        </>
      ),
      text: 'Три точки справа вверху.',
      shot: (
        <Shot>
          <span className="nt-bar is-top">
            <span className="nt-url">nails-beauty…</span>
            <b className="nt-hit">
              <Dots />
            </b>
          </span>
        </Shot>
      ),
    },
    {
      title: 'Выберите «Установить приложение»',
      text: 'Или «Добавить на главный экран» — затем «Установить».',
      shot: (
        <Shot>
          <span className="nt-menu">
            <span>Новая вкладка</span>
            <span>Добавить в закладки</span>
            <span className="nt-hit-row">
              Установить приложение <InstallIcon />
            </span>
          </span>
        </Shot>
      ),
    },
    {
      title: `Откройте «${appName}» с рабочего стола`,
      text: 'И нажмите «Подключить уведомления» — затем «Разрешить».',
      shot: (
        <Shot dark>
          <AppIcon label={appName} />
        </Shot>
      ),
    },
  ]
}

/* ---------- Окно с гайдом ---------- */
function Guide({ data, onClose }: { data: Data; onClose: () => void }) {
  const st = usePushState()
  const [tab, setTab] = useState<'ios' | 'android'>(st.platform === 'android' ? 'android' : 'ios')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null)
  const appName = `${data.studio.name} кабинет`
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    box.current?.focus()
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const enable = async () => {
    const r = await enableNotifications(data.studio)
    if (r === 'granted') setMsg({ kind: 'ok', text: 'Готово — пришло пробное уведомление. Новые записи будут приходить сюда.' })
    if (r === 'denied') setMsg({ kind: 'warn', text: 'Уведомления запрещены. Разрешите их в настройках телефона — как, написано ниже.' })
    if (r === 'unsupported') setMsg({ kind: 'warn', text: 'Этот браузер не умеет уведомления. Откройте кабинет в Chrome или Safari.' })
    if (r === 'needs-install') setMsg({ kind: 'warn', text: 'На iPhone сначала добавьте кабинет на экран «Домой» — шаги ниже.' })
  }
  const install = async () => {
    const ok = await promptInstall()
    setMsg(ok ? { kind: 'ok', text: `Установлено. Откройте «${appName}» с рабочего стола и подключите уведомления там.` } : null)
  }

  // Можно включить прямо сейчас: приложение уже открыто с рабочего стола, либо Android/компьютер (там можно и из браузера)
  const readyHere = st.supported && (st.standalone || st.platform !== 'ios')
  const granted = st.permission === 'granted'
  const steps = stepsFor(tab, appName)

  return (
    <div className="nt-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="nt-sheet" role="dialog" aria-modal="true" aria-labelledby="nt-title" tabIndex={-1} ref={box}>
        <button className="icon-btn nt-close" onClick={onClose} aria-label="Закрыть">
          <Close />
        </button>
        <header className="nt-head">
          <span className="nt-bell">
            <Bell size={26} />
          </span>
          <h2 id="nt-title">Уведомления о&nbsp;новых записях</h2>
          <p>Клиентка записалась на&nbsp;сайте&nbsp;— телефон сразу покажет имя, услугу и&nbsp;время. Для этого кабинет ставится на&nbsp;рабочий стол как приложение.</p>
        </header>

        {granted ? (
          <div className="nt-now is-on">
            <b>Уведомления включены на этом устройстве</b>
            <button className="btn btn-line" onClick={() => notify('Проверка уведомлений', `Так будут выглядеть новые записи в ${data.studio.name}.`)}>
              Прислать пробное
            </button>
          </div>
        ) : readyHere || st.canPromptInstall ? (
          <div className="nt-now">
            {st.canPromptInstall && !st.standalone && (
              <button className="btn nt-cta" onClick={install}>
                <InstallIcon /> Установить приложение
              </button>
            )}
            {readyHere && (
              <button className={`btn ${st.canPromptInstall && !st.standalone ? 'btn-line' : 'nt-cta'}`} onClick={enable}>
                <Bell /> {st.standalone ? 'Разрешить уведомления' : 'Включить в этом браузере'}
              </button>
            )}
          </div>
        ) : null}
        {msg && <p className={`nt-msg is-${msg.kind}`}>{msg.text}</p>}

        {!st.standalone && (
          <>
            <div className="nt-tabs" role="tablist" aria-label="Телефон">
              {(['ios', 'android'] as const).map((p) => (
                <button key={p} role="tab" aria-selected={tab === p} onClick={() => setTab(p)}>
                  {p === 'ios' ? 'iPhone' : 'Android'}
                  {st.platform === p && <small>ваш</small>}
                </button>
              ))}
            </div>
            <ol className="nt-steps">
              {steps.map((s, i) => (
                <li key={i}>
                  <span className="nt-n">{i + 1}</span>
                  <div className="nt-step">
                    <b>{s.title}</b>
                    {s.text && <p>{s.text}</p>}
                    {s.shot}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}

        <details className="nt-help">
          <summary>Случайно нажали «Запретить»?</summary>
          <p>
            <b>iPhone:</b> Настройки → Уведомления → «{appName}» → Допуск уведомлений.
            <br />
            <b>Android:</b> долгое нажатие на&nbsp;иконку «{appName}» → О&nbsp;приложении → Уведомления → включить.
          </p>
        </details>
        {!data.studio.push && <p className="nt-note">Сейчас уведомления приходят, пока кабинет открыт на этом устройстве. Чтобы они приходили всегда, даже когда приложение закрыто, нужен сервер отправки (настраивается один раз).</p>}
      </div>
    </div>
  )
}

/* ---------- Заметная кнопка в кабинете + уведомления о новых записях ---------- */
export function NotifyBanner({ data }: { data: Data }) {
  const st = usePushState()
  const [open, setOpen] = useState(false)
  const granted = st.permission === 'granted'

  // Новая запись с сайта (пришла из другой вкладки или приложения на этом устройстве) — показать уведомление
  const known = useRef<Set<string> | null>(null)
  useEffect(() => {
    const ids = new Set(data.bookings.map((b) => b.id))
    if (known.current && granted) {
      const fresh = data.bookings.filter((b: Booking) => !known.current!.has(b.id) && b.source === 'online' && b.status === 'active')
      for (const b of fresh) {
        const s = data.services.find((x) => x.id === b.serviceId)
        const m = data.masters.length > 1 ? data.masters.find((x) => x.id === b.masterId) : undefined
        notify(`Новая запись: ${b.name}`, [s?.title, `${dayHuman(b.date)}, ${fmtTime(b.start)}`, m && `к ${m.nameDat ?? m.name}`].filter(Boolean).join(' · '))
      }
    }
    known.current = ids
  }, [data.bookings, granted])

  return (
    <>
      {granted ? (
        <button className="nt-pill" onClick={() => setOpen(true)}>
          <span className="nt-dot" /> Уведомления включены
        </button>
      ) : (
        <section className="nt-banner">
          <span className="nt-bell">
            <Bell size={24} />
          </span>
          <div>
            <b>Узнавайте о&nbsp;новых записях сразу</b>
            <span>Уведомление на&nbsp;телефон, как от&nbsp;мессенджера</span>
          </div>
          <button className="btn nt-cta" onClick={() => setOpen(true)}>
            <Bell size={18} /> Подключить уведомления
          </button>
        </section>
      )}
      {open && <Guide data={data} onClose={() => setOpen(false)} />}
    </>
  )
}
