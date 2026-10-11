import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Шрифты первого экрана и заголовков — грузятся вместе со страницей (rel=preload), а не после CSS.
 * Иначе браузер сначала рисует системный шрифт и текст «перескакивает», когда приходит нужный */
const PRELOAD_FONTS = /^((jost|lora|comfortaa|onest)-(cyrillic|latin)|(jost|onest)-latin-ext)-wght-normal-.*\.woff2$/

function preloadFonts(): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return
        return Object.keys(ctx.bundle)
          .filter((f) => PRELOAD_FONTS.test(f.split('/').pop() ?? ''))
          .map((f) => ({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `./${f}`, crossorigin: '' },
            injectTo: 'head-prepend' as const,
          }))
      },
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), preloadFonts()],
  server: { port: 5190, host: true },
})
