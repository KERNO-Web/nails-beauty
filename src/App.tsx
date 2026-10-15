import { lazy, Suspense, useEffect, useState } from 'react'
import { Booking } from './site/Booking'
import { Contact, Reviews, StickyCta } from './site/Bottom'
import { Masters, Services, Works } from './site/Showcase'
import { Header, Hero } from './site/Top'
import { RemindPrompt } from './notify/Remind'
import { useData } from './lib/store'
import { useMediaVersion } from './lib/media'
import { useAdminManifest } from './lib/push'
import { applyTheme } from './lib/theme'

const Admin = lazy(() => import('./admin/Admin'))

function useRoute() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash.startsWith('#/admin') ? 'admin' : 'site'
}

export default function App() {
  const data = useData()
  // Фото, загруженные с устройства, читаются из базы после старта — перерисовываем страницу, когда готовы
  useMediaVersion()
  const route = useRoute()
  // Ставим на рабочий стол сайт или кабинет — у каждого свой манифест (имя, иконка, стартовая страница)
  useAdminManifest(route === 'admin')

  // Тема — на <html>, чтобы её видели все слои (и окна поверх страницы); кабинет — в тех же цветах
  useEffect(() => applyTheme(data.theme), [data.theme])
  useEffect(() => {
    document.title = route === 'admin' ? `Кабинет — ${data.studio.name}` : `${data.studio.name} — маникюр и педикюр, онлайн-запись`
  }, [data.studio.name, route])

  useEffect(() => {
    if (route === 'site') window.scrollTo(0, 0)
  }, [route])

  if (route === 'admin')
    return (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    )
  return <Site />
}

function Site() {
  const data = useData()
  return (
    <div className="site">
      <Header data={data} />
      <main>
        <Hero data={data} />
        <Services data={data} />
        <Works data={data} />
        <Masters data={data} />
        <Booking data={data} />
        <Reviews data={data} />
      </main>
      <Contact data={data} />
      <StickyCta data={data} />
      <RemindPrompt data={data} />
    </div>
  )
}
