# Filo · Barber Club — Web de barbería con reserva de citas

Web de una **barbería ficticia** con reserva online, hecha con **SvelteKit y Svelte 5**. Es un proyecto de portfolio: las reservas se guardan solo en el navegador.

## Funcionalidades

- **Landing:** servicios con precio y duración, equipo, cómo funciona, opiniones, horario con el día actual resaltado y un indicador en vivo de «abierto / cerrado» y de la **próxima hora libre**.
- **Reserva en 4 pasos:**
  1. Uno o varios servicios, con duración y precio sumados.
  2. Barbero, o «sin preferencia» para asignar el primero libre.
  3. Calendario (domingos y días pasados deshabilitados) y **horas calculadas según la duración del servicio y las citas ya ocupadas**.
  4. Datos con validación accesible (móvil español, email opcional, consentimiento).
- **Confirmación** con código de reserva y botón para **añadir la cita al calendario (.ics)**.
- **Mis citas:** próximas e historial, búsqueda por código y cancelación en dos pasos.
- **Panel del negocio:** agenda del día por barbero en línea temporal, franjas cerradas, línea de «ahora», ocupación, ingresos previstos y detalle de cada cita.
- Antes de guardar, comprueba que el hueco sigue libre. La reserva también se puede iniciar desde la landing con el servicio o el barbero preseleccionados (`/reservar?servicio=fade&barbero=alex`).

## Decisiones técnicas

- Svelte 5 con runes y un store reactivo persistido en `localStorage` (`src/lib/bookings.svelte.ts`).
- La lógica de disponibilidad (`src/lib/availability.ts`) es pura y está separada de la interfaz: tramos de apertura, días de cada barbero, antelación mínima y solapes.
- **Citas de ejemplo deterministas**, generadas con una semilla por día y barbero, para que la agenda tenga un aspecto realista sin backend.
- Landing pre-renderizada; lo que depende de la fecha actual se calcula al montar en el navegador.
- Tests end-to-end con **Playwright** contra el build de producción, en escritorio y móvil, con el **reloj del navegador fijado** para que los resultados no dependan del día.

## Scripts

```bash
npm install
npm run dev        # http://localhost:5220
npm run build
npm run test:e2e
```
