import { BARBERS, BOOKING_WINDOW_DAYS, LEAD_MINUTES, OPENING, SERVICES, SLOT_STEP, type Barber } from './data';
import { addDays, nowMinutes, parseIso, todayIso } from './time';

export interface Booking {
  id: string;
  /** Código corto que ve el cliente */
  code: string;
  date: string;
  start: number;
  minutes: number;
  barberId: string;
  serviceIds: string[];
  price: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  status: 'confirmed' | 'cancelled';
  createdAt: number;
  /** Citas de ejemplo generadas para que la agenda no esté vacía */
  demo?: boolean;
}

const dayOfWeek = (iso: string) => parseIso(iso).getDay();

export const isOpenDay = (iso: string) => OPENING[dayOfWeek(iso)].length > 0;

export const barbersOn = (iso: string): Barber[] => BARBERS.filter((b) => b.days.includes(dayOfWeek(iso)));

export function isBookableDate(iso: string, today = todayIso()) {
  return iso >= today && iso <= addDays(today, BOOKING_WINDOW_DAYS) && isOpenDay(iso) && barbersOn(iso).length > 0;
}

// --- Citas de ejemplo deterministas: siempre las mismas para cada día y barbero ---

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

const FIRST_NAMES = ['Carlos', 'Javier', 'Lucas', 'Hugo', 'Mario', 'Pablo', 'Sergio', 'Daniel', 'Adrián', 'Raúl', 'Iker', 'Leo'];

export function demoBookings(iso: string, barber: Barber): Booking[] {
  if (!barber.days.includes(dayOfWeek(iso))) return [];
  let seed = hash(`${iso}|${barber.id}`);
  const rnd = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0;
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909) >>> 0;
    return ((seed ^ (seed >>> 16)) >>> 0) / 4294967296;
  };
  const out: Booking[] = [];
  for (const [open, close] of OPENING[dayOfWeek(iso)]) {
    let t = open;
    while (t < close) {
      const service = SERVICES[Math.floor(rnd() * SERVICES.length)];
      if (rnd() < 0.42 && t + service.minutes <= close) {
        const name = FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)];
        out.push({
          id: `demo-${iso}-${barber.id}-${t}`,
          code: 'DEMO',
          date: iso,
          start: t,
          minutes: service.minutes,
          barberId: barber.id,
          serviceIds: [service.id],
          price: service.price,
          name,
          phone: '',
          email: '',
          notes: '',
          status: 'confirmed',
          createdAt: 0,
          demo: true,
        });
        t += service.minutes;
      } else {
        t += SLOT_STEP * (1 + Math.floor(rnd() * 3));
      }
    }
  }
  return out;
}

/** Todas las citas activas de un barbero en un día (ejemplo + reales) */
export function agendaFor(iso: string, barber: Barber, bookings: Booking[]) {
  return [
    ...demoBookings(iso, barber),
    ...bookings.filter((b) => b.date === iso && b.barberId === barber.id && b.status === 'confirmed'),
  ].sort((a, b) => a.start - b.start);
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

function isFree(iso: string, barber: Barber, start: number, minutes: number, bookings: Booking[]) {
  return !agendaFor(iso, barber, bookings).some((b) => overlaps(start, start + minutes, b.start, b.start + b.minutes));
}

export interface Slot {
  start: number;
  /** Barbero asignado si se eligió «el primero libre» */
  barberId: string;
}

/**
 * Horas de inicio disponibles para una duración dada.
 * Una hora vale si el servicio entero cabe en un tramo de apertura y el barbero está libre.
 */
export function availableSlots(
  iso: string,
  minutes: number,
  barberId: string | 'any',
  bookings: Booking[],
  now = { date: todayIso(), minutes: nowMinutes() },
): Slot[] {
  if (!minutes || !isBookableDate(iso, now.date)) return [];
  const candidates = barberId === 'any' ? barbersOn(iso) : barbersOn(iso).filter((b) => b.id === barberId);
  const earliest = iso === now.date ? now.minutes + LEAD_MINUTES : 0;
  const slots: Slot[] = [];

  for (const [open, close] of OPENING[dayOfWeek(iso)]) {
    for (let t = open; t + minutes <= close; t += SLOT_STEP) {
      if (t < earliest) continue;
      const free = candidates.find((b) => isFree(iso, b, t, minutes, bookings));
      if (free) slots.push({ start: t, barberId: free.id });
    }
  }
  return slots;
}

/** Estado de apertura en este momento, para la cabecera */
export function openStatus(date = new Date()) {
  const iso = todayIso();
  const minutes = date.getHours() * 60 + date.getMinutes();
  const ranges = OPENING[date.getDay()];
  const current = ranges.find(([o, c]) => minutes >= o && minutes < c);
  if (current) return { open: true, until: current[1] };
  const next = ranges.find(([o]) => o > minutes);
  return { open: false, nextToday: next?.[0] ?? null, iso };
}
