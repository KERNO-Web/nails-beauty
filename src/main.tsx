import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initMedia } from './lib/media'
import { initApp } from './lib/push'
import './styles.css'
import './design/tokens.css'
import './design/base.css'
import './site/top.css'
import './site/showcase.css'
import './site/booking.css'
import './site/bottom.css'
import './notify/notify.css'

// Страница показывается сразу; шрифты подставляются по мере загрузки (font-display: swap),
// запасные шрифты без засечек и близки по ширине — текст не превращается в Times
initMedia()
initApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
