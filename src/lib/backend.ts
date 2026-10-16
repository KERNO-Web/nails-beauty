// Куда уходит запись. Интерфейс записи на сайте знает только этот контракт — сервер подключается здесь,
// без правок в вёрстке. Сейчас есть только демо-вариант: запись хранится в браузере (lib/store.ts).
//
// Для боевого запуска нужен ApiBackend: POST /bookings на сервере, который сам проверяет окно по графику,
// длительности и перерыву, атомарно занимает слот (две клиентки на одно время — одна получит отказ),
// хранит записи каждого салона отдельно, а кабинет пускает только со входом мастера.
import type { Booking, Studio } from '../data/types'
import { createBooking, type BookingInput } from './store'

export type BookingResult = { ok: true; booking: Booking } | { ok: false; error: string }

export interface BookingBackend {
  /** local-demo — запись остаётся в этом браузере и мастеру не уходит */
  kind: 'local-demo' | 'api'
  create(input: BookingInput): Promise<BookingResult>
}

const localDemo: BookingBackend = {
  kind: 'local-demo',
  create: async (input) => createBooking(input),
}

export function backendFor(_studio: Studio): BookingBackend {
  return localDemo
}
