import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initMedia } from './lib/media'
import { initApp } from './lib/push'
import './styles.css'
import './site.css'
import './booking.css'
import './lab/lab.css'

// Показать страницу, когда загрузятся шрифты (кириллица и латиница); страховка на 2,5 с — в index.html
const sample = 'Аа Яя Aa 0'
Promise.all(
  ["500 1em 'Lora Variable'", "500 1em 'Jost Variable'", "600 1em 'Comfortaa Variable'", "400 1em 'Onest Variable'"].map((f) =>
    document.fonts?.load(f, sample).catch(() => null),
  ),
).finally(() => document.documentElement.classList.remove('fonts-wait'))

initMedia()
initApp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
