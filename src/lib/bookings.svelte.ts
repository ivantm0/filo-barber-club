import type { Booking } from './availability';

const KEY = 'filo:bookings';

function load(): Booking[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/** Citas reservadas en este navegador */
class BookingStore {
  list = $state<Booking[]>([]);
  ready = $state(false);

  init() {
    if (this.ready) return;
    this.list = load();
    this.ready = true;
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.list));
    } catch {}
  }

  add(booking: Booking) {
    this.list = [...this.list, booking];
    this.save();
  }

  cancel(id: string) {
    this.list = this.list.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b));
    this.save();
  }

  byCode(code: string) {
    return this.list.find((b) => b.code === code.trim().toUpperCase());
  }
}

export const bookings = new BookingStore();

/** Código legible sin caracteres ambiguos (0/O, 1/I) */
export function newCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FILO-';
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  for (const b of bytes) code += chars[b % chars.length];
  return code;
}
