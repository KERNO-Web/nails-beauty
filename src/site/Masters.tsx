// Мастера: имя крупно, чем занимается, дни работы и три его работы
import type { Data } from '../data/types'
import { Photo, typo } from '../lib/ui'
import { book, useEnter } from './common'

const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function Masters({ data }: { data: Data }) {
  const ref = useEnter<HTMLDivElement>()
  if (!data.masters.length) return null
  const one = data.masters.length === 1
  return (
    <section className="sec masters" id="masters" aria-labelledby="m-h">
      <div className="wrap" ref={ref}>
        <h2 className="h2 rise" id="m-h">
          {one ? 'Мастер' : 'Мастера'}
        </h2>
        <ul className="m-list">
          {data.masters.map((m) => {
            const works = data.works.filter((w) => w.masterId === m.id)
            const pics = [...(m.photo ? [{ id: 'p', photo: m.photo, title: m.name }] : []), ...(works.length ? works : one ? data.works : [])].slice(0, 3)
            return (
              <li key={m.id} className="m-row rise">
                <div className="m-text">
                  <p className="m-name">{m.name}</p>
                  <p className="m-role">
                    {m.role}
                    {m.years ? <span className="num">, опыт {m.years} {m.years % 10 === 1 && m.years % 100 !== 11 ? 'год' : m.years % 10 >= 2 && m.years % 10 <= 4 && (m.years % 100 < 12 || m.years % 100 > 14) ? 'года' : 'лет'}</span> : null}
                  </p>
                  {m.about && <p className="m-about">{typo(m.about)}</p>}
                  <p className="m-week" aria-label={`Работает: ${WD.filter((_, i) => m.schedule[i]).join(', ')}`}>
                    {WD.map((d, i) => (
                      <span key={d} className={m.schedule[i] ? 'is-on' : ''} aria-hidden>
                        {d}
                      </span>
                    ))}
                  </p>
                  <div className="m-actions">
                    <button className="btn is-ink" onClick={() => book(data, { masterId: one ? undefined : m.id })}>
                      {one ? 'Записаться' : `Записаться к ${m.nameDat ?? m.name}`}
                    </button>
                    {m.portfolio && (
                      <a className="btn is-line" href={m.portfolio} target="_blank" rel="noreferrer">
                        Портфолио
                      </a>
                    )}
                  </div>
                </div>
                {pics.length > 0 && (
                  <div className={`m-pics n${pics.length}`}>
                    {pics.map((p) => (
                      <Photo key={p.id} photo={p.photo} w={480} sizes="(min-width: 1024px) 18vw, 33vw" alt={p.title} loading="lazy" />
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
