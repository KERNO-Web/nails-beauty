// Напоминания клиентке о визите: карточка на экране «вы записаны» и приглашение в приложении с рабочего стола.
// Расписание (за 24, 12, 3 и 1 час) ведёт сервер студии — server/; без него работают напоминания календаря (.ics).
import { useState } from 'react'
import type { Booking, Data } from '../data/types'
import { enableReminders, remindersOn, remindLabel, usePushState } from '../lib/push'
import { Bell, Guide } from './Guide'

/** На экране «вы записаны» */
export function RemindCard({ data, booking }: { data: Data; booking: Booking }) {
  const st = usePushState()
  const [open, setOpen] = useState(false)
  const [fail, setFail] = useState(false)
  const on = st.permission === 'granted' && remindersOn(booking)

  // Где можно — включаем сразу, без гайда; iPhone в Safari и отказ — через гайд
  const start = async () => {
    if (st.platform === 'ios' && !st.standalone) return setOpen(true)
    const r = await enableReminders(data, { booking })
    setFail(r === 'failed')
    if (r !== 'granted' && r !== 'failed') setOpen(true)
  }

  return (
    <>
      {on ? (
        <button className="nt-pill rm-pill" onClick={() => setOpen(true)}>
          <span className="nt-dot" /> Напомним {remindLabel(data.studio)} до визита
        </button>
      ) : (
        <section className="nt-banner rm-card">
          <span className="nt-bell">
            <Bell size={24} />
          </span>
          <div>
            <b>Напомнить о&nbsp;визите?</b>
            <span>Уведомление на&nbsp;телефон {remindLabel(data.studio)} до&nbsp;записи</span>
          </div>
          <button className="btn nt-cta" onClick={start}>
            <Bell size={18} /> Включить напоминания
          </button>
        </section>
      )}
      {fail && !on && <p className="nt-msg is-warn rm-fail">Не получилось связаться с сервером уведомлений. Проверьте интернет и нажмите ещё раз.</p>}
      {open && <Guide data={data} client booking={booking} onClose={() => setOpen(false)} />}
    </>
  )
}

const HIDE_KEY = 'nail-reminders-hide'

/** Сайт открыт с рабочего стола, а напоминания ещё не включены — предложить (на iPhone это и есть шаг 5 гайда) */
export function RemindPrompt({ data }: { data: Data }) {
  const st = usePushState()
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(() => {
    try {
      return !!sessionStorage.getItem(HIDE_KEY)
    } catch {
      return false
    }
  })
  const done = st.permission === 'granted' && remindersOn()
  if (!open && (!st.standalone || !st.supported || done || hidden)) return null
  const hide = () => {
    setHidden(true)
    try {
      sessionStorage.setItem(HIDE_KEY, '1')
    } catch {
      /* ничего */
    }
  }
  return (
    <>
      {!hidden && !done && (
        <div className="rm-float" role="region" aria-label="Напоминания о записи">
          <button className="rm-float-main" onClick={() => setOpen(true)}>
            <span className="nt-bell">
              <Bell size={20} />
            </span>
            <span>
              <b>Включить напоминания</b>
              <small>о&nbsp;записи {remindLabel(data.studio)} до&nbsp;визита</small>
            </span>
          </button>
          <button className="rm-float-x" onClick={hide} aria-label="Не сейчас">
            ×
          </button>
        </div>
      )}
      {open && <Guide data={data} client onClose={() => setOpen(false)} onEnabled={hide} />}
    </>
  )
}
