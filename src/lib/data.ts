// Datos del negocio (ficticio). Las duraciones son múltiplos de 15 minutos.

export interface Service {
  id: string;
  name: string;
  description: string;
  minutes: number;
  price: number;
  category: 'Cabello' | 'Barba' | 'Combos';
}

export interface Barber {
  id: string;
  name: string;
  role: string;
  specialty: string;
  /** Días que trabaja: 1 = lunes … 6 = sábado */
  days: number[];
  color: string;
}

export const BUSINESS = {
  name: 'Filo',
  fullName: 'Filo · Barber Club',
  address: 'Calle del Ejemplo, 12 · 28000 Madrid',
  phone: '600 000 000',
  email: 'hola@filo.example',
};

export const SERVICES: Service[] = [
  { id: 'corte', name: 'Corte clásico', description: 'Tijera y máquina, lavado y peinado.', minutes: 30, price: 18, category: 'Cabello' },
  { id: 'fade', name: 'Degradado (fade)', description: 'Skin, low o mid fade con acabado a navaja.', minutes: 45, price: 22, category: 'Cabello' },
  { id: 'nino', name: 'Corte infantil', description: 'Para menores de 12 años.', minutes: 30, price: 14, category: 'Cabello' },
  { id: 'barba', name: 'Arreglo de barba', description: 'Perfilado, rebaje y aceite hidratante.', minutes: 15, price: 10, category: 'Barba' },
  { id: 'afeitado', name: 'Afeitado clásico', description: 'Toalla caliente, navaja y bálsamo.', minutes: 30, price: 16, category: 'Barba' },
  { id: 'combo', name: 'Corte + barba', description: 'El combo completo para salir impecable.', minutes: 45, price: 26, category: 'Combos' },
  { id: 'premium', name: 'Ritual Filo', description: 'Corte, afeitado clásico y mascarilla facial.', minutes: 75, price: 42, category: 'Combos' },
];

export const BARBERS: Barber[] = [
  { id: 'alex', name: 'Álex', role: 'Fundador', specialty: 'Degradados y cortes modernos', days: [1, 2, 3, 4, 5, 6], color: '#d4a24c' },
  { id: 'marta', name: 'Marta', role: 'Barbera senior', specialty: 'Cortes clásicos y barbas', days: [1, 2, 3, 4, 5, 6], color: '#c2410c' },
  { id: 'dani', name: 'Dani', role: 'Barbero', specialty: 'Diseños y afeitado a navaja', days: [2, 3, 4, 5, 6], color: '#3b82f6' },
];

/** Tramos de apertura por día de la semana (0 = domingo), en minutos desde medianoche */
export const OPENING: Record<number, [number, number][]> = {
  0: [],
  1: [[600, 840], [960, 1260]],
  2: [[600, 840], [960, 1260]],
  3: [[600, 840], [960, 1260]],
  4: [[600, 840], [960, 1260]],
  5: [[600, 840], [960, 1260]],
  6: [[600, 840], [960, 1260]],
};

export const SLOT_STEP = 15;
/** Antelación mínima para reservar hoy */
export const LEAD_MINUTES = 30;
/** Días que se pueden reservar por adelantado */
export const BOOKING_WINDOW_DAYS = 30;

export const getService = (id: string) => SERVICES.find((s) => s.id === id);
export const getBarber = (id: string) => BARBERS.find((b) => b.id === id);
