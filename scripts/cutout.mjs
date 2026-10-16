// Два слоя первого экрана из одного фото салона:
//   public/hero/photo.webp — само фото, резкое, целиком;
//   public/hero/hand.webp  — то же фото того же размера, но прозрачное везде, кроме руки.
// На сайте слои лежат друг на друге пиксель в пиксель, заголовок между ними. Поэтому неточность
// маски видна только там, где пальцы проходят над буквами, — везде остальное под рукой та же рука.
//
// Запуск: node scripts/cutout.mjs raw/hand.jpg
// Модель BiRefNet (onnx-community/BiRefNet-ONNX) скачивается при первом запуске.
// Облегчённая BiRefNet_lite на этом фото вырезала только ногти — не использовать.
import { pipeline, RawImage } from '@huggingface/transformers'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const src = process.argv[2] ?? 'raw/hand.jpg'
const OUT_W = Number(process.env.OUT_W || 2400)
mkdirSync('public/hero', { recursive: true })

// Рабочий размер — как на сайте, чтобы оба слоя совпадали один в один
const base = await sharp(src).resize({ width: OUT_W }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height } = base.info

// 1. Фото целиком
await sharp(base.data, { raw: { width, height, channels: 3 } }).webp({ quality: 84 }).toFile('public/hero/photo.webp')

// 2. Маска руки нейросетью (на копии 1600px — модели этого хватает)
const work = await sharp(base.data, { raw: { width, height, channels: 3 } }).resize({ width: 1600 }).jpeg({ quality: 95 }).toBuffer()
const seg = await pipeline('background-removal', process.env.M || 'onnx-community/BiRefNet-ONNX', { dtype: 'fp32' })
const r0 = await seg(await RawImage.fromBlob(new Blob([work])))
const res = Array.isArray(r0) ? r0[0] : r0
// Край: лёгкое сглаживание и сужение на ~1px, чтобы над буквами не было каймы фона
const alpha = await sharp(Buffer.from(res.data), { raw: { width: res.width, height: res.height, channels: res.channels } })
  .extractChannel(3)
  .resize(width, height, { kernel: 'cubic' })
  .blur(Number(process.env.EDGE_BLUR || 1.2))
  .linear(1.6, -110)
  .raw()
  .toBuffer()
const rgba = Buffer.alloc(width * height * 4)
for (let i = 0, j = 0, k = 0; i < width * height; i++, j += 3, k += 4) {
  rgba[k] = base.data[j]
  rgba[k + 1] = base.data[j + 1]
  rgba[k + 2] = base.data[j + 2]
  rgba[k + 3] = alpha[i]
}
await sharp(rgba, { raw: { width, height, channels: 4 } }).webp({ quality: 86, alphaQuality: 90 }).toFile('public/hero/hand.webp')

// Проверка: рука на ярком фоне, чтобы видеть, что вырезано
await sharp(rgba, { raw: { width, height, channels: 4 } }).flatten({ background: '#ff00ff' }).resize({ height: 900 }).jpeg({ quality: 85 }).toFile('raw/hand-check.jpg')
console.log(`photo + hand ${width}x${height} → public/hero/; проверка → raw/hand-check.jpg`)
