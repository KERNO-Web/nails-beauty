// Только функциональные иконки (стрелки, закрыть, мессенджеры). Декоративных нет намеренно.
type P = { size?: number; className?: string }
const base = (size = 20) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true })

export const Arrow = ({ size = 18, className = 'arrow' }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
export const ChevronLeft = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)
export const ChevronRight = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
)
export const Close = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const Check = ({ size = 26 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)
export const People = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
    <path d="M15.5 5.2a3 3 0 010 5.6M17.5 14.4c1.6.7 2.7 2.3 3 4.6" />
  </svg>
)
export const Telegram = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M21 4.5L3.5 11.3c-.8.3-.8 1.4 0 1.7l4.3 1.5 1.7 5.1c.2.7 1.1.9 1.6.4l2.5-2.4 4.4 3.2c.6.4 1.4.1 1.6-.6L22.3 5.7c.2-.8-.6-1.5-1.3-1.2z" />
    <path d="M7.8 14.5l9.2-6.2-6.9 7.4" />
  </svg>
)
export const WhatsApp = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M4 20l1.2-4.2A8.2 8.2 0 1112 20.2a8.2 8.2 0 01-3.9-1z" />
    <path d="M9.2 8.6c.3-.6.6-.6.9-.6h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.7l-.5.6c-.1.2-.2.4 0 .6.6 1 1.4 1.8 2.4 2.4.2.1.4.1.6-.1l.6-.6c.2-.2.4-.2.7-.1l1.5.7c.3.1.4.3.4.6 0 .9-.6 1.9-1.6 2-1 .1-2.6-.2-4.4-1.8-2-1.8-2.6-3.6-2.5-4.6z" />
  </svg>
)
export const VK = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="3" width="18" height="18" rx="6" />
    <path d="M7 9c.3 3.6 2.2 6 5.4 6v-2.2c1.2.1 2.1 1 2.5 2.2H17c-.5-1.8-1.8-2.9-2.6-3.3.8-.5 1.9-1.6 2.2-2.7h-1.8c-.4 1.2-1.4 2.2-2.4 2.3V9h-1.8v4.3C9.5 13 8.8 11.4 8.7 9z" />
  </svg>
)
export const Phone = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M5 4h3.2l1.6 4-2 1.3a10.5 10.5 0 006.9 6.9l1.3-2 4 1.6V19a2 2 0 01-2.2 2C10.4 20.4 3.6 13.6 3 6.2A2 2 0 015 4z" />
  </svg>
)
export const Calendar = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
)
