import { lazy, Suspense, useEffect, useState } from 'react'
import { Booking } from './sections/Booking'
import { Closing, Reviews, StickyCta } from './sections/Bottom'
import { Masters, Services, Works } from './sections/Showcase'
import { Header } from './sections/Top'
import { useConcept } from './lab/concepts'
import { HeroColor } from './lab/HeroColor'
import { LabSwitch } from './lab/HeroParts'
import { HeroMaterial } from './lab/HeroMaterial'
import { HeroType } from './lab/HeroType'
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

  const concept = useConcept()
  // Тема — на <html>, чтобы её видели все слои (и окна поверх страницы). На сайте сейчас тема концепции из лаборатории
  useEffect(() => {
    const site = route === 'site'
    applyTheme(site ? concept.theme : data.theme)
    const root = document.documentElement
    if (site) {
      root.dataset.concept = concept.id
      root.style.setProperty('--font-display', concept.display)
    } else {
      delete root.dataset.concept
      root.style.removeProperty('--font-display')
    }
  }, [data.theme, concept, route])
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
  const concept = useConcept()
  useReveal()
  const Hero = concept.id === 'material' ? HeroMaterial : concept.id === 'type' ? HeroType : HeroColor
  return (
    <>
      <Header data={data} />
      <main>
        <Hero key={concept.id} data={data} concept={concept} />
        <Services data={data} />
        <Works data={data} />
        <Masters data={data} />
        <Booking data={data} />
        <Reviews data={data} />
      </main>
      <Closing data={data} />
      <StickyCta data={data} />
      <LabSwitch />
    </>
  )
}
