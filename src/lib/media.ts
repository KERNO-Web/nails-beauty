// Фото, загруженные с устройства в кабинете. Хранятся в браузере (IndexedDB) — как и все данные демо-версии;
// в данных студии вместо ссылки стоит «idb:<id>». Для боевой версии этот модуль заменяется загрузкой на сервер.
import { useSyncExternalStore } from 'react'

const DB = 'nail-studio-media'
const STORE = 'images'
/** Длинная сторона после сжатия: хватает для галереи и первого экрана, файл ~150–300 КБ */
const MAX_SIDE = 1600

const urls = new Map<string, string>()
let version = 0
const listeners = new Set<() => void>()
const emit = () => {
  version++
  for (const l of listeners) l()
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

/** Ссылка на загруженное фото; пока база не прочитана — пустая строка */
export const mediaUrl = (id: string) => urls.get(id) ?? ''

/** Перерисовать страницу, когда фото из базы прочитаны */
export function useMediaVersion() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => version,
  )
}

/** Прочитать все загруженные фото при старте */
export async function initMedia() {
  if (typeof indexedDB === 'undefined') return
  try {
    const db = await open()
    await new Promise<void>((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).openCursor()
      req.onsuccess = () => {
        const c = req.result
        if (!c) return resolve()
        if (!urls.has(String(c.key))) urls.set(String(c.key), URL.createObjectURL(c.value as Blob))
        c.continue()
      }
      req.onerror = () => resolve()
    })
    if (urls.size) emit()
  } catch {
    /* приватный режим без IndexedDB — загруженных фото просто нет */
  }
}

/** Сжать фото с телефона: длинная сторона до MAX_SIDE, JPEG ~0.85. HEIC браузер не всегда умеет — тогда ошибка */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * k)
  const h = Math.round(bmp.height * k)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compress'))), 'image/jpeg', 0.85))
}

/** Сохранить фото с устройства; возвращает значение для поля photo («idb:…») */
export async function saveImage(file: File): Promise<string> {
  const blob = await compress(file)
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
  await tx('readwrite', (s) => s.put(blob, id))
  urls.set(id, URL.createObjectURL(blob))
  emit()
  return `idb:${id}`
}
