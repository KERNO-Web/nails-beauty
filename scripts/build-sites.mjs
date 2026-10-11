// Сборка сайтов салонов для zapisvonline.ru: одна сборка приложения в out/n/ и по папке на салон
// (out/<slug>/index.html с вшитыми данными и превью для мессенджеров + его фото из salons/<slug>/).
// Запуск: npm run sites. Выкладка — deploy/deploy.sh.
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { demo } from '../src/data/demo.ts'

const SITE = 'https://zapisvonline.ru'
const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/

rmSync('out', { recursive: true, force: true })
execSync('npx tsc -b && npx vite build --base=/n/ --outDir out/n --emptyOutDir', { stdio: 'inherit' })
const shell = readFileSync('out/n/index.html', 'utf8')
rmSync('out/n/index.html')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const imageUrl = (p) => (p.startsWith('photo-') ? `https://images.unsplash.com/${p}?w=1200&q=72&auto=format&fit=crop` : p.startsWith('/') ? SITE + p : p)

const PWA = ['sw.js', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']

const files = readdirSync('salons').filter((f) => f.endsWith('.json'))
for (const file of files) {
  const config = JSON.parse(readFileSync(`salons/${file}`, 'utf8'))
  const slug = config.slug
  if (!SLUG.test(slug) || file !== `${slug}.json`) throw new Error(`${file}: slug «${slug}» — латиница, цифры, дефис, 3–40, совпадает с именем файла`)
  const studio = { ...demo.studio, ...config.studio }
  const title = `${studio.name} — маникюр, онлайн-запись`
  const description = `${studio.address ? studio.address + '. ' : ''}Услуги, цены и свободное время мастеров — запись без звонков.`
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="robots" content="noindex" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(studio.name)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${SITE}/${slug}" />`,
    `<meta property="og:image" content="${esc(imageUrl(studio.heroPhoto))}" />`,
    `<meta property="og:locale" content="ru_RU" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    // </script> внутри текстов не должен закрыть тег
    `<script>window.__STUDIO__=${JSON.stringify(config).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ')
  const html = shell
    .replace(/<title>[^<]*<\/title>/, head)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(description)}`)
    .replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*/, `$1${esc(studio.name)}`)
    // Приложение на телефоне — своё у каждого салона: манифест и сервис-воркер лежат в его папке
    .replace('href="/n/manifest.webmanifest"', 'href="manifest.webmanifest"')
  mkdirSync(`out/${slug}`, { recursive: true })
  writeFileSync(`out/${slug}/index.html`, html)
  for (const f of PWA) cpSync(`out/n/${f}`, `out/${slug}/${f}`)
  for (const f of ['manifest.webmanifest', 'admin.webmanifest'])
    writeFileSync(`out/${slug}/${f}`, readFileSync(`out/n/${f}`, 'utf8').replaceAll('LUMI', studio.name))
  if (existsSync(`salons/${slug}`)) cpSync(`salons/${slug}`, `out/${slug}`, { recursive: true })
  console.log(`${SITE}/${slug}`)
}
