import { BUSINESS, getBarber, getService } from './data';
import type { Booking } from './availability';

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha y hora local en formato iCalendar (sin zona: el calendario usa la del usuario) */
const icsDate = (iso: string, minutes: number) =>
  `${iso.replaceAll('-', '')}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;

const escape = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

export function bookingToIcs(b: Booking) {
  const services = b.serviceIds.map((id) => getService(id)?.name).filter(Boolean).join(', ');
  const barber = getBarber(b.barberId)?.name ?? '';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Filo Barber Club//Reservas//ES',
    'BEGIN:VEVENT',
    `UID:${b.id}@filo.example`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART:${icsDate(b.date, b.start)}`,
    `DTEND:${icsDate(b.date, b.start + b.minutes)}`,
    `SUMMARY:${escape(`${BUSINESS.fullName}: ${services}`)}`,
    `DESCRIPTION:${escape(`Con ${barber}. Código de reserva: ${b.code}`)}`,
    `LOCATION:${escape(BUSINESS.address)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(b: Booking) {
  const blob = new Blob([bookingToIcs(b)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `cita-filo-${b.code}.ics` });
  a.click();
  URL.revokeObjectURL(url);
}
