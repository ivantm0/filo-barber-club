const pad = (n: number) => String(n).padStart(2, '0');

export const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayIso = () => toIsoDate(new Date());

export const parseIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso: string, n: number) => {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
};

/** Minutos desde medianoche → "10:30" */
export const fmtTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

export const nowMinutes = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const longDate = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const monthYear = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

export const fmtLongDate = (iso: string) => capitalize(longDate.format(parseIso(iso)));
export const fmtMonth = (iso: string) => capitalize(monthYear.format(parseIso(iso)));

export const fmtDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
};

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const fmtPrice = (n: number) => eur.format(n);
