// Прототип первого экрана «На пять» — на одобрение. Остальной сайт строится после.
// Идея: пять окон в форме ногтей поднимаются снизу экрана разной высоты, как пальцы руки.
// В каждом окне — настоящая работа. Окна прячут неудачный кадр, поэтому приём выдерживает любые фото салона.

const photo = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`

/** Пальцы веером от общего основания под краем экрана: высота — доля экрана, r — наклон */
const NAILS = [
  // Ладонью к нам: большой палец слева, отведён в сторону
  { id: '1754799670312-8e7da8e40ad7', alt: 'Синий с золотом', h: 0.46, r: -34, pos: '50% 45%' },
  { id: '1641814250010-9887d86eedfd', alt: 'Пудровый с кольцом', h: 0.7, r: -11, pos: '45% 50%' },
  { id: '1736434518489-0eb84070017f', alt: 'Бежевый миндаль', h: 0.8, r: -2, pos: '55% 30%' },
  { id: '1769687209448-025548dfca8b', alt: 'Нюд с декором', h: 0.73, r: 7, pos: '50% 35%' },
  { id: '1604654894610-df63bc536371', alt: 'Чёрный и черепаховый дизайн', h: 0.58, r: 16, pos: '50% 40%' },
]

export function App() {
  return (
    <div className="site">
      <header className="hd">
        <a className="logo" href="#">
          на&nbsp;пять
        </a>
        <nav className="nav" aria-label="Разделы">
          <a href="#">Цены</a>
          <a href="#">Работы</a>
          <a href="#">Мастера</a>
          <a href="#">Контакты</a>
        </nav>
        <a className="btn is-light" href="#">
          Записаться
        </a>
      </header>

      <section className="hero" aria-labelledby="hero-h">
        <div className="hero-copy">
          <h1 id="hero-h" className="hero-h">
            Маникюр
            <br />
            на&nbsp;пять
          </h1>
          <p className="hero-lead">Студия в&nbsp;центре Красноярска. Свободное время видно сразу, запись за&nbsp;минуту.</p>
          <div className="hero-cta">
            <a className="btn is-light is-big" href="#">
              Выбрать время
            </a>
            <a className="link" href="#">
              Цены от&nbsp;1&nbsp;200&nbsp;₽
            </a>
          </div>
        </div>

        <ul className="hand" aria-label="Работы мастеров">
          {NAILS.map((n, i) => (
            <li key={n.id} className="nail" style={{ ['--h' as string]: n.h, ['--r' as string]: `${n.r}deg`, ['--i' as string]: i }}>
              <img src={photo(n.id, 600)} srcSet={`${photo(n.id, 400)} 400w, ${photo(n.id, 800)} 800w`} sizes="(min-width: 900px) 12vw, 20vw" alt={n.alt} style={{ objectPosition: n.pos }} />
            </li>
          ))}
        </ul>

        <p className="hero-info">
          <span>пр. Мира, 30</span>
          <span>Сегодня до&nbsp;21:00</span>
        </p>
      </section>
    </div>
  )
}
