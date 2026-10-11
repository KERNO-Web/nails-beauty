// Концепция 1 — «Живой материал». Одна капля жидкого глянца: внутри неё, как через линзу, видно настоящее фото
// маникюра; по краю — перламутровый отлив, блик идёт за курсором, от капли отделяются и сливаются обратно
// две маленькие. При прокрутке капля растекается на весь экран и фото открывается целиком.
// Шейдер на чистом WebGL (без библиотек). Нет WebGL или фото не отдаёт CORS — статичная версия на CSS.
import { useEffect, useRef, useState } from 'react'
import type { Data } from '../data/types'
import { photoUrl, typo } from '../lib/ui'
import type { Concept } from './concepts'
import { HeroCta, HeroFacts } from './HeroParts'

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uGrow;
uniform sampler2D uTex;
uniform float uTexAspect;

float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0); return mix(b, a, h) - k*h*(1.0 - h); }

float scene(vec2 p){
  vec2 d = p - uCenter;
  float a = atan(d.y, d.x);
  float t = uTime;
  float wob = 0.035*sin(3.0*a + t*0.9) + 0.025*sin(5.0*a - t*1.25) + 0.018*sin(2.0*a + t*0.55 + 1.7);
  vec2 md = uMouse - uCenter;
  float pull = 0.07*smoothstep(1.7*uRadius, 0.2*uRadius, length(md))*pow(max(cos(a - atan(md.y, md.x)), 0.0), 4.0);
  float r = uRadius*(1.0 + (wob + pull)*(1.0 - uGrow));
  float s = length(d) - r;
  // Две капли-спутника: отрываются и сливаются с основной
  float k = uRadius*0.22*(1.0 - uGrow);
  vec2 o1 = uCenter + uRadius*vec2(cos(t*0.42)*1.18, sin(t*0.42)*0.92 - 0.1);
  vec2 o2 = uCenter + uRadius*vec2(cos(-t*0.31 + 2.4)*1.08, sin(-t*0.31 + 2.4)*1.12);
  float s1 = length(p - o1) - uRadius*0.15*(1.0 - uGrow);
  float s2 = length(p - o2) - uRadius*0.09*(1.0 - uGrow);
  s = smin(s, s1, k);
  s = smin(s, s2, k*0.8);
  return s;
}

vec2 coverUv(vec2 p, vec2 c, vec2 box){
  // Фото вписывается «cover» в прямоугольник box с центром c
  vec2 uv = (p - c)/box;
  float a = box.x/box.y;
  if (a > uTexAspect) uv.y *= uTexAspect/a; else uv.x *= a/uTexAspect;
  return vec2(0.5 + uv.x, 0.5 - uv.y);
}

void main(){
  vec2 p = gl_FragCoord.xy;
  float sd = scene(p);
  float e = 1.0;
  vec2 g = vec2(scene(p + vec2(e, 0.0)) - scene(p - vec2(e, 0.0)), scene(p + vec2(0.0, e)) - scene(p - vec2(0.0, e)))/(2.0*e);
  float inside = 1.0 - smoothstep(-1.2, 1.2, sd);

  float depth = clamp(-sd/(uRadius*0.62), 0.0, 1.0);
  float h = sqrt(1.0 - (1.0 - depth)*(1.0 - depth));
  vec3 N = normalize(vec3(g*(1.0 - h)*1.35, h + 0.001));

  // Фото: внутри капли — как через линзу; когда капля растеклась — во весь экран
  vec2 c = mix(uCenter, uRes*0.5, uGrow);
  vec2 box = mix(vec2(uRadius*2.15), uRes, uGrow);
  float refr = uRadius*0.32*(1.0 - uGrow);
  vec2 off = -N.xy*(1.0 - h)*refr;
  vec3 col;
  col.r = texture2D(uTex, coverUv(p + off*1.06, c, box)).r;
  col.g = texture2D(uTex, coverUv(p + off, c, box)).g;
  col.b = texture2D(uTex, coverUv(p + off*0.94, c, box)).b;

  float edge = (1.0 - h)*(1.0 - uGrow);
  // Перламутр по краю
  float fres = pow(1.0 - h, 2.2);
  vec3 irid = 0.5 + 0.5*cos(6.2831*(fres*1.1 + vec3(0.0, 0.33, 0.67) + uTime*0.025 + N.x*0.15));
  vec3 pearl = mix(vec3(0.93, 0.91, 0.95), irid, 0.38);
  col = mix(col, pearl, fres*0.5*(1.0 - uGrow));
  // Лёгкая глубина к краю линзы, чтобы светлое фото не выгорало
  col *= mix(0.8, 1.0, mix(h, 1.0, uGrow));
  // Объём: тень к низу, мягкий свет сверху
  col *= 1.0 - 0.28*edge*smoothstep(0.1, -0.9, N.y);
  // Блик за курсором
  vec3 L = normalize(vec3((uMouse - uCenter)/max(uRadius, 1.0)*0.55, 1.0));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(N, H), 0.0), 90.0)*0.85 + pow(max(dot(N, H), 0.0), 12.0)*0.08;
  col += spec*(1.0 - uGrow);
  // Тонкий светлый ободок
  col += vec3(0.9, 0.88, 0.95)*smoothstep(3.5, 0.0, abs(sd + 1.5))*0.22*(1.0 - uGrow);

  // Ореол вокруг капли
  float halo = exp(-max(sd, 0.0)/(uRadius*0.18))*0.07*(1.0 - inside)*(1.0 - uGrow);
  vec3 outCol = vec3(0.86, 0.82, 0.88)*halo;
  gl_FragColor = vec4(col*inside + outCol, inside + halo);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader')
  return sh
}

export function HeroMaterial({ data, concept }: { data: Data; concept: Concept }) {
  const s = data.studio
  const photo = s.heroPhoto || data.works.find((w) => w.featured)?.photo || data.works[0]?.photo || ''
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [gl, setGl] = useState<'pending' | 'on' | 'off'>('pending')

  useEffect(() => {
    const cv = canvas.current
    const sec = section.current
    if (!cv || !sec || !photo) return setGl('off')
    const ctx = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
    if (!ctx) return setGl('off')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let prog: WebGLProgram
    try {
      prog = ctx.createProgram()!
      ctx.attachShader(prog, compile(ctx, ctx.VERTEX_SHADER, VERT))
      ctx.attachShader(prog, compile(ctx, ctx.FRAGMENT_SHADER, FRAG))
      ctx.linkProgram(prog)
      if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) throw new Error('link')
    } catch (err) {
      console.warn('[hero] WebGL недоступен, показываю статичную версию:', err)
      return setGl('off')
    }
    ctx.useProgram(prog)
    const buf = ctx.createBuffer()
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buf)
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW)
    const loc = ctx.getAttribLocation(prog, 'p')
    ctx.enableVertexAttribArray(loc)
    ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0)
    const U = (n: string) => ctx.getUniformLocation(prog, n)
    const u = { res: U('uRes'), time: U('uTime'), mouse: U('uMouse'), center: U('uCenter'), radius: U('uRadius'), grow: U('uGrow'), tex: U('uTex'), aspect: U('uTexAspect') }

    let alive = true
    let raf = 0
    let visible = true
    let ready = false
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.5 : 1.6)
    const state = { w: 0, h: 0, mx: 0, my: 0, tx: 0, ty: 0, grow: 0, t0: performance.now() }

    const layout = () => {
      const r = cv.getBoundingClientRect()
      state.w = Math.round(r.width * dpr)
      state.h = Math.round(r.height * dpr)
      cv.width = state.w
      cv.height = state.h
      ctx.viewport(0, 0, state.w, state.h)
    }
    const geometry = () => {
      const wide = state.w / dpr >= 900
      // На телефоне капля ниже текста и меньше — заголовок и кнопка не уходят под неё
      const cx = wide ? state.w * 0.68 : state.w * 0.56
      const cy = wide ? state.h * 0.52 : state.h * 0.72
      const base = wide ? Math.min(state.w * 0.2, state.h * 0.33) : Math.min(state.w * 0.3, state.h * 0.16)
      const far = Math.hypot(state.w, state.h) * 0.62
      const g = state.grow
      const ease = g * g * (3 - 2 * g)
      return { cx, cy, radius: base + (far - base) * ease }
    }

    const draw = (now: number) => {
      if (!alive) return
      raf = 0
      const t = reduce ? 4 : (now - state.t0) / 1000
      // Курсор догоняет мягко — капля тянется за ним, а не дёргается
      state.mx += (state.tx - state.mx) * 0.08
      state.my += (state.ty - state.my) * 0.08
      const { cx, cy, radius } = geometry()
      ctx.uniform2f(u.res, state.w, state.h)
      ctx.uniform1f(u.time, t)
      ctx.uniform2f(u.mouse, state.mx, state.h - state.my)
      ctx.uniform2f(u.center, cx, state.h - cy)
      ctx.uniform1f(u.radius, radius)
      ctx.uniform1f(u.grow, state.grow)
      ctx.clearColor(0, 0, 0, 0)
      ctx.clear(ctx.COLOR_BUFFER_BIT)
      ctx.drawArrays(ctx.TRIANGLES, 0, 3)
      if (!reduce && visible) raf = requestAnimationFrame(draw)
    }
    const kick = () => {
      if (ready && !raf) raf = requestAnimationFrame(draw)
    }

    const onScroll = () => {
      const r = sec.getBoundingClientRect()
      const span = Math.max(1, sec.offsetHeight - window.innerHeight)
      state.grow = Math.min(1, Math.max(0, -r.top / span))
      sec.style.setProperty('--grow', state.grow.toFixed(3))
      kick()
    }
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      state.tx = (e.clientX - r.left) * dpr
      state.ty = (e.clientY - r.top) * dpr
      kick()
    }
    const onResize = () => (layout(), kick())

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      if (!alive) return
      const tex = ctx.createTexture()
      ctx.bindTexture(ctx.TEXTURE_2D, tex)
      ctx.pixelStorei(ctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      try {
        ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, img)
      } catch (err) {
        console.warn('[hero] фото без CORS, показываю статичную версию:', err)
        return setGl('off')
      }
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE)
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE)
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR)
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR)
      ctx.uniform1i(u.tex, 0)
      ctx.uniform1f(u.aspect, img.naturalWidth / img.naturalHeight)
      ready = true
      setGl('on')
      layout()
      const g = geometry()
      state.tx = state.mx = g.cx + g.radius * 0.5
      state.ty = state.my = g.cy - g.radius * 0.6
      onScroll()
      kick()
    }
    img.onerror = () => alive && setGl('off')
    img.src = photoUrl(photo, 1600)

    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting
      kick()
    })
    io.observe(sec)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    sec.addEventListener('pointermove', onMove)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      sec.removeEventListener('pointermove', onMove)
      // Контекст не теряем принудительно: в StrictMode эффект запускается дважды на том же canvas
    }
  }, [photo])

  return (
    <section className={`hero-m gl-${gl}`} id="top" data-hero="dark" ref={section}>
      <div className="m-stage">
        <canvas ref={canvas} className="m-canvas" aria-hidden />
        {/* Запасной вариант без WebGL: то же фото в капле с бликом на CSS */}
        {gl === 'off' && photo && (
          <div className="m-fallback" aria-hidden>
            <img src={photoUrl(photo, 1000)} alt="" />
          </div>
        )}
        <div className="wrap-wide m-copy">
          <p className="h-kicker">
            {s.name} · {s.kind} · {s.city}
          </p>
          <h1>{typo(concept.title)}</h1>
          <p className="h-lead">{typo(concept.lead)}</p>
          <HeroCta />
        </div>
        <div className="wrap-wide m-foot">
          <HeroFacts data={data} />
          <span className="m-hint" aria-hidden />
        </div>
      </div>
    </section>
  )
}
