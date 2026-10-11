import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'
import { mediaUrl } from './media'

/** Фото: id Unsplash (photo-…) → ссылка нужного размера; иначе путь как есть */
export function photoUrl(photo: string, w: number) {
  if (photo.startsWith('photo-')) return `https://images.unsplash.com/${photo}?w=${w}&q=72&auto=format&fit=crop`
  // Загружено с устройства в кабинете — хранится в браузере
  if (photo.startsWith('idb:')) return mediaUrl(photo.slice(4))
  return photo
}

type PhotoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { photo: string; w: number; sizes?: string }

export function Photo({ photo, w, sizes, className, alt = '', ...rest }: PhotoProps) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  // Картинка уже в кэше и загрузилась раньше, чем React повесил onLoad
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth) setLoaded(true)
  }, [photo])
  const srcSet = photo.startsWith('photo-') ? [0.5, 1, 1.5, 2].map((k) => `${photoUrl(photo, Math.round(w * k))} ${Math.round(w * k)}w`).join(', ') : undefined
  return (
    <img
      {...rest}
      ref={ref}
      alt={alt}
      src={photoUrl(photo, w)}
      srcSet={srcSet}
      sizes={sizes ?? `${w}px`}
      className={`photo ${loaded ? 'is-loaded' : ''} ${className ?? ''}`}
      onLoad={() => setLoaded(true)}
      decoding="async"
    />
  )
}

/** Мягкое появление при прокрутке */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal:not(.in)')
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  })
}

/** Виден ли элемент на экране */
export function useInView<T extends HTMLElement>(margin = '0px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [margin])
  return [ref, inView] as const
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}

export function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase()
}

export function Avatar({ name, photo, size = 40 }: { name: string; photo?: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {photo ? <img src={photoUrl(photo, size * 2)} alt="" /> : initialOf(name)}
    </span>
  )
}

export function useMedia(query: string) {
  const [on, setOn] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const fn = () => setOn(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [query])
  return on
}

/** Типографика для текстов из данных: короткие предлоги и союзы («в», «и», «на», «без») не висят в конце строки */
const SHORT = /(?<=^|[\s(«—-])(а|и|в|во|к|ко|с|со|у|о|об|от|до|по|на|за|из|не|ни|но|же|для|без|под|над|при|про|или|что|как) +/giu
export function typo(text: string) {
  return text.replace(SHORT, '$1\u00a0')
}
