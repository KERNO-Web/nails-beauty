// «Подключить уведомления» в кабинете: заметная кнопка + гайд (src/notify/Guide.tsx), как поставить кабинет
// приложением на рабочий стол и включить уведомления о новых записях.
import { useEffect, useRef, useState } from 'react'
import type { Booking, Data } from '../data/types'
import { notify, usePushState } from '../lib/push'
import { dayHuman, fmtTime } from '../lib/slots'
import { Bell, Guide } from '../notify/Guide'

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
