import { lazy, Suspense, useEffect, useState } from 'react'
import { Booking } from './sections/Booking'
import { Closing, Reviews, StickyCta } from './sections/Bottom'
import { Masters, Services, Works } from './sections/Showcase'
import { Header, Hero } from './sections/Top'
import { useData } from './lib/store'
import { applyTheme } from './lib/theme'
import { useReveal } from './lib/ui'

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
  const route = useRoute()

  // Тема студии — на <html>, чтобы её видели все слои (и окна поверх страницы)
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
  useReveal()
  return (
    <>
      <Header data={data} />
      <main>
        <Hero data={data} />
        <Services data={data} />
        <Works data={data} />
        <Masters data={data} />
        <Booking data={data} />
        <Reviews data={data} />
      </main>
      <Closing data={data} />
      <StickyCta data={data} />
    </>
  )
}
