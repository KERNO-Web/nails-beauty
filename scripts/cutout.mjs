// Слои для первого экрана из одного фото: рука без фона + широкий размытый фон из того же кадра.
// Запуск: node scripts/cutout.mjs raw/hand.jpg
// Результат: public/hero/hand.webp (рука, прозрачный фон, обрезана по краям) и public/hero/bg.webp (фон 16:9).
// Модель BiRefNet (onnx-community/BiRefNet-ONNX; облегчённая lite режет только ногти) скачивается при первом запуске.
import { pipeline, RawImage } from '@huggingface/transformers'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const src = process.argv[2] ?? 'raw/hand.jpg'
mkdirSync('public/hero', { recursive: true })
const { width, height } = await sharp(src).metadata()

// 1. Маска руки нейросетью. На вход — уменьшенная копия: модели хватает, а края потом масштабируем
const work = await sharp(src).resize({ width: 1600 }).jpeg({ quality: 95 }).toBuffer()
const seg = await pipeline('background-removal', process.env.M || 'onnx-community/BiRefNet-ONNX', { dtype: 'fp32' })
const r0 = await seg(await RawImage.fromBlob(new Blob([work])))
const res = Array.isArray(r0) ? r0[0] : r0
// Альфа-канал маски, растянутый до исходного размера. Край делаем мягким, как глубина резкости камеры:
// на фото края пальцев не в фокусе, и резкий срез маски выглядит вырезанным ножницами.
// EDGE_BLUR — ширина мягкого края; линейная коррекция слегка сужает маску и убирает тёмную кайму фона
const alpha = await sharp(Buffer.from(res.data), { raw: { width: res.width, height: res.height, channels: res.channels } })
  .extractChannel(3)
  .resize(width, height, { kernel: 'cubic' })
  .blur(Number(process.env.EDGE_BLUR || 7))
  .linear(1.45, -80)
  .toBuffer()
const rgb = await sharp(src).removeAlpha().raw().toBuffer()
const rgba = Buffer.alloc(width * height * 4)
for (let i = 0, j = 0, k = 0; i < width * height; i++, j += 3, k += 4) {
  rgba[k] = rgb[j]
  rgba[k + 1] = rgb[j + 1]
  rgba[k + 2] = rgb[j + 2]
  rgba[k + 3] = alpha[i]
}
const hand = sharp(rgba, { raw: { width, height, channels: 4 } })
const trimmed = await hand.png().toBuffer().then((b) => sharp(b).trim({ threshold: 4 }).toBuffer({ resolveWithObject: true }))
await sharp(trimmed.data).resize({ height: Math.min(2200, trimmed.info.height) }).webp({ quality: 88, alphaQuality: 95 }).toFile('public/hero/hand.webp')
// Проверочный кадр края на 100%: рука на ярком фоне, чтобы видеть ореолы и рваные места
await sharp(trimmed.data)
  .flatten({ background: '#ff00ff' })
  .extract({ left: Math.round(trimmed.info.width * 0.35), top: 0, width: Math.round(trimmed.info.width * 0.6), height: Math.round(trimmed.info.height * 0.4) })
  .jpeg({ quality: 90 })
  .toFile('raw/edge-check.jpg')

// 2. Широкий фон 16:9 из участка кадра без руки (левый верхний угол — только цветы), сильно размытый
const bgArea = { left: 0, top: 0, width: Math.round(width * Number(process.env.BG_W || 0.42)), height: Math.round(height * Number(process.env.BG_H || 0.36)) }
await sharp(src)
  .extract(bgArea)
  .resize(2400, 1350, { fit: 'cover' })
  .blur(28)
  .modulate({ brightness: 0.82, saturation: 1.15 })
  .webp({ quality: 80 })
  .toFile('public/hero/bg.webp')

console.log('mask', res.width, 'x', res.height, res.channels, '| hand', trimmed.info.width, 'x', trimmed.info.height, '→ public/hero/hand.webp; bg → public/hero/bg.webp; край → raw/edge-check.jpg')
