// Гайд «поставить на рабочий стол и включить уведомления» — для мастера (кабинет: новые записи)
// и для клиентки (сайт: напоминания о визите). На iPhone без установки уведомления от сайта не работают.
import { useEffect, useRef, useState } from 'react'
import type { Booking, Data } from '../data/types'
import { maskTyping, phoneDigits } from '../lib/contact'
import { Close } from '../lib/icons'
import { enableNotifications, enableReminders, isIosNotSafari, notify, promptInstall, remindLabel, remindState, usePushState, type EnableResult, type Platform } from '../lib/push'

/* ---------- Иконки, как их видит человек на телефоне ---------- */
export const Bell = ({ size = 22 }: { size?: number }) => (
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

function stepsFor(p: Exclude<Platform, 'desktop'>, appName: string, client: boolean): Step[] {
  const what = client ? 'сайт' : 'кабинет'
  const last = client ? 'И нажмите «Включить напоминания» уже там — укажите телефон, с которым записывались, и разрешите уведомления.' : 'И нажмите «Подключить уведомления» уже там — в приложении появится вопрос «Разрешить уведомления?».'
  if (p === 'ios')
    return [
      {
        title: `Откройте ${what} в Safari`,
        text: isIosNotSafari() ? `Сейчас ${what} открыт в другом браузере — скопируйте адрес и вставьте его в Safari.` : 'Нужен iPhone с iOS 16.4 или новее.',
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
        text: last,
        shot: (
          <Shot dark>
            <AppIcon label={appName} />
          </Shot>
        ),
      },
    ]
  return [
    { title: `Откройте ${what} в Chrome`, text: 'В Яндекс Браузере и Samsung Internet пункт меню называется похоже.' },
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
      text: client ? 'И нажмите «Включить напоминания» — затем «Разрешить».' : 'И нажмите «Подключить уведомления» — затем «Разрешить».',
      shot: (
        <Shot dark>
          <AppIcon label={appName} />
        </Shot>
      ),
    },
  ]
}

/* ---------- Окно с гайдом ---------- */
type GuideProps = {
  data: Data
  onClose: () => void
  /** client — напоминания клиентке на сайте; иначе — уведомления мастеру в кабинете */
  client?: boolean
  /** Запись, к которой привязать напоминания (экран «вы записаны») */
  booking?: Booking
  onEnabled?: () => void
}

export function Guide({ data, onClose, client, booking, onEnabled }: GuideProps) {
  const st = usePushState()
  const [tab, setTab] = useState<'ios' | 'android'>(st.platform === 'android' ? 'android' : 'ios')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null)
  const [phone, setPhone] = useState(() => (booking ? '' : maskTyping(remindState().phone ?? '')))
  const appName = client ? data.studio.name : `${data.studio.name} кабинет`
  const when = remindLabel(data.studio)
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

  // Без записи (приложение на iPhone знает о ней только по телефону) — нужен номер
  const askPhone = client && !booking
  const phoneOk = !askPhone || !!phoneDigits(phone)

  const enable = async () => {
    if (!phoneOk) return setMsg({ kind: 'warn', text: 'Укажите телефон, с которым записывались, — по нему найдём вашу запись.' })
    const r: EnableResult = client ? await enableReminders(data, { booking, phone }) : await enableNotifications(data.studio)
    if (r === 'granted') {
      setMsg({
        kind: 'ok',
        text: client
          ? data.studio.push
            ? `Готово — напомним о визите ${when}.`
            : 'Уведомления разрешены — пришло пробное. В демо-версии напоминания по расписанию не рассылаются: это делает сервер студии. Пока надёжнее «В календарь».'
          : 'Готово — пришло пробное уведомление. Новые записи будут приходить сюда.',
      })
      onEnabled?.()
    }
    if (r === 'denied') setMsg({ kind: 'warn', text: 'Уведомления запрещены. Разрешите их в настройках телефона — как, написано ниже.' })
    if (r === 'unsupported') setMsg({ kind: 'warn', text: `Этот браузер не умеет уведомления. Откройте ${client ? 'сайт' : 'кабинет'} в Chrome или Safari.` })
    if (r === 'failed') setMsg({ kind: 'warn', text: 'Не получилось связаться с сервером уведомлений. Проверьте интернет и нажмите ещё раз.' })
    if (r === 'needs-install') setMsg({ kind: 'warn', text: `На iPhone сначала добавьте ${client ? 'сайт' : 'кабинет'} на экран «Домой» — шаги ниже.` })
  }
  const install = async () => {
    const ok = await promptInstall()
    setMsg(ok ? { kind: 'ok', text: `Установлено. Откройте «${appName}» с рабочего стола и ${client ? 'включите напоминания' : 'подключите уведомления'} там.` } : null)
  }

  // Можно включить прямо сейчас: приложение уже открыто с рабочего стола, либо Android/компьютер (там можно и из браузера)
  const readyHere = st.supported && (st.standalone || st.platform !== 'ios')
  const granted = st.permission === 'granted' && (!client || (booking ? remindState().bookings.includes(booking.id) : !!remindState().phone))
  const steps = stepsFor(tab, appName, !!client)
  const enableLabel = client ? 'Включить напоминания' : st.standalone ? 'Разрешить уведомления' : 'Включить в этом браузере'

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
          {client ? (
            <>
              <h2 id="nt-title">Напоминания о&nbsp;визите</h2>
              <p>
                Пришлём уведомление {when.replace(/ (\d+ час)/, ' $1')} до&nbsp;записи.
                {st.platform === 'ios' && !st.standalone && ' На iPhone для этого сайт ставится на экран «Домой» — как приложение, это минута.'}
              </p>
            </>
          ) : (
            <>
              <h2 id="nt-title">Уведомления о&nbsp;новых записях</h2>
              <p>Клиентка записалась на&nbsp;сайте&nbsp;— телефон сразу покажет имя, услугу и&nbsp;время. Для этого кабинет ставится на&nbsp;рабочий стол как приложение.</p>
            </>
          )}
        </header>

        {granted ? (
          <div className="nt-now is-on">
            <b>{client ? 'Напоминания включены на этом устройстве' : 'Уведомления включены на этом устройстве'}</b>
            {!client && (
              <button className="btn btn-line" onClick={() => notify('Проверка уведомлений', `Так будут выглядеть новые записи в ${data.studio.name}.`)}>
                Прислать пробное
              </button>
            )}
          </div>
        ) : readyHere || st.canPromptInstall ? (
          <div className="nt-now">
            {askPhone && readyHere && (
              <label className="nt-phone">
                <span>Телефон, с которым записывались</span>
                <input inputMode="tel" autoComplete="tel" placeholder="+7 (900) 000-00-00" value={phone} onChange={(e) => setPhone(maskTyping(e.target.value))} />
              </label>
            )}
            {st.canPromptInstall && !st.standalone && (
              <button className="btn nt-cta" onClick={install}>
                <InstallIcon /> Установить приложение
              </button>
            )}
            {readyHere && (
              <button className={`btn ${st.canPromptInstall && !st.standalone ? 'btn-line' : 'nt-cta'}`} onClick={enable}>
                <Bell /> {enableLabel}
              </button>
            )}
          </div>
        ) : null}
        {msg && <p className={`nt-msg is-${msg.kind}`}>{msg.text}</p>}

        {!st.standalone && !granted && (
          <>
            <div className="nt-tabs" role="tablist" aria-label="Телефон">
              {(['ios', 'android'] as const).map((p) => (
                <button key={p} role="tab" aria-selected={tab === p} onClick={() => setTab(p)}>
                  {p === 'ios' ? 'iPhone' : 'Android'}
                  {st.platform === p && <small>ваш</small>}
                </button>
              ))}
            </div>
            {client && tab === 'android' && <p className="nt-note nt-note-top">На Android можно и без установки: нажмите «Включить напоминания» выше и&nbsp;разрешите уведомления. Приложение просто удобнее.</p>}
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
            <b>Android:</b> долгое нажатие на&nbsp;иконку «{appName}» → О&nbsp;приложении → Уведомления → включить. В&nbsp;браузере&nbsp;— значок слева от&nbsp;адреса → Уведомления.
          </p>
        </details>
        {!data.studio.push && !client && <p className="nt-note">Сейчас уведомления приходят, пока кабинет открыт на этом устройстве. Чтобы они приходили всегда, даже когда приложение закрыто, нужен сервер отправки (настраивается один раз).</p>}
      </div>
    </div>
  )
}
