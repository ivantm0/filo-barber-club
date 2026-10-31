import { expect, test, type Page } from '@playwright/test';

// Reloj fijo: martes 3 de noviembre de 2026 a las 9:00 (antes de abrir)
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-03T09:00:00+01:00'));
});

const next = (page: Page) => page.getByRole('button', { name: /Continuar/ });
/** Tarjeta de opción por su título exacto (las descripciones pueden repetir palabras) */
const option = (page: Page, title: string) => page.locator('label.option', { has: page.locator('.opt-title').getByText(title, { exact: true }) });

async function pickDay(page: Page, name: string) {
  await page.getByRole('grid', { name: 'Elige un día' }).getByRole('button', { name, exact: true }).click();
}

/** Recorre la reserva completa y devuelve el código y la hora elegida */
async function book(page: Page, opts: { services: string[]; barber: string; day: string }) {
  await page.goto('/reservar');
  for (const s of opts.services) await option(page, s).click();
  await next(page).click();
  await option(page, opts.barber).click();
  await next(page).click();
  await pickDay(page, opts.day);
  const firstSlot = page.locator('.slot').first();
  const time = (await firstSlot.textContent())!.trim();
  await firstSlot.click();
  await next(page).click();
  await page.getByLabel('Nombre').fill('Iván Terol');
  await page.getByLabel('Móvil').fill('612 345 678');
  await page.getByLabel(/Acepto que se guarden/).check();
  await page.getByRole('button', { name: /Confirmar cita/ }).click();
  await expect(page.getByRole('heading', { name: '¡Cita confirmada!' })).toBeVisible();
  const code = (await page.getByTestId('booking-code').textContent())!.trim();
  return { code, time };
}

test('la landing muestra servicios, equipo y la próxima hora libre', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cortes con oficio');
  await expect(page.locator('#servicios')).toContainText('Degradado (fade)');
  await expect(page.locator('#equipo')).toContainText('Marta');
  await expect(page.locator('.ticket')).toContainText(/Hoy · \d{2}:\d{2}/);
  await expect(page.getByText('Filo es una barbería ficticia')).toBeVisible();
});

test('reserva completa: suma servicios, valida datos y confirma', async ({ page }) => {
  await page.goto('/reservar');
  await expect(next(page)).toBeDisabled();
  await option(page, 'Corte clásico').click();
  await option(page, 'Arreglo de barba').click();
  await expect(page.getByTestId('total')).toHaveText('28 €');
  await expect(page.locator('.summary')).toContainText('45 min');
  await next(page).click();

  await option(page, 'Marta').click();
  await next(page).click();

  await pickDay(page, 'miércoles 4');
  await expect(page.locator('.slots-day')).toHaveText('Miércoles, 4 de noviembre');
  await page.locator('.slot').first().click();
  await next(page).click();

  // Sin datos no se puede confirmar
  await page.getByRole('button', { name: /Confirmar cita/ }).click();
  await expect(page.getByText('Escribe tu nombre')).toBeVisible();
  await expect(page.getByLabel('Nombre')).toBeFocused();

  await page.getByLabel('Nombre').fill('Iván Terol');
  await page.getByLabel('Móvil').fill('12345');
  await page.getByLabel(/Acepto que se guarden/).check();
  await page.getByRole('button', { name: /Confirmar cita/ }).click();
  await expect(page.getByText('Introduce un móvil español de 9 cifras')).toBeVisible();

  await page.getByLabel('Móvil').fill('612 345 678');
  await page.getByRole('button', { name: /Confirmar cita/ }).click();
  await expect(page.getByRole('heading', { name: '¡Cita confirmada!' })).toBeVisible();
  await expect(page.getByTestId('booking-code')).toHaveText(/^FILO-[A-Z2-9]{4}$/);
  await expect(page.locator('.details')).toContainText('Marta');
});

test('los domingos y los días pasados no se pueden elegir', async ({ page }) => {
  await page.goto('/reservar?servicio=corte');
  await next(page).click();
  await next(page).click();
  const grid = page.getByRole('grid', { name: 'Elige un día' });
  await expect(grid.getByRole('button', { name: 'domingo 8, no disponible' })).toBeDisabled();
  await expect(grid.getByRole('button', { name: 'lunes 2, no disponible' })).toBeDisabled();
  await expect(grid.getByRole('button', { name: 'martes 3', exact: true })).toBeEnabled();
});

test('una hora reservada deja de estar disponible para ese barbero', async ({ page }) => {
  const { time } = await book(page, { services: ['Degradado (fade)'], barber: 'Álex', day: 'jueves 5' });

  await page.goto('/reservar?servicio=fade&barbero=alex');
  await next(page).click();
  await next(page).click();
  await pickDay(page, 'jueves 5');
  await expect(page.locator('.slot').first()).toBeVisible();
  await expect(page.locator('.slot', { hasText: time })).toHaveCount(0);
});

test('preselecciona servicio y barbero desde la URL', async ({ page }) => {
  await page.goto('/reservar?servicio=fade&barbero=dani');
  await expect(option(page, 'Degradado (fade)')).toHaveClass(/on/);
  await expect(page.getByTestId('total')).toHaveText('22 €');
  await next(page).click();
  await expect(option(page, 'Dani')).toHaveClass(/on/);
});

test('mis citas: buscar por código, añadir al calendario y cancelar', async ({ page }) => {
  const { code } = await book(page, { services: ['Afeitado clásico'], barber: 'Sin preferencia', day: 'viernes 6' });

  await page.goto('/mis-citas');
  const card = page.getByTestId('booking').filter({ hasText: code });
  await expect(card).toContainText('Afeitado clásico');

  await page.getByLabel('¿Tienes un código de reserva?').fill(code.toLowerCase());
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.locator('.found')).toContainText(code);

  const downloadPromise = page.waitForEvent('download');
  await card.first().getByRole('button', { name: /Añadir al calendario/ }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(`cita-filo-${code}.ics`);

  await card.first().getByRole('button', { name: 'Cancelar' }).click();
  await card.first().getByRole('button', { name: '¿Seguro? Cancelar' }).click();
  await expect(page.getByTestId('booking').filter({ hasText: code }).first()).toContainText('Cancelada');
});

test('el panel muestra la agenda y las reservas online', async ({ page }) => {
  const { code } = await book(page, { services: ['Corte clásico'], barber: 'Marta', day: 'martes 3' });

  await page.goto('/panel');
  await expect(page.locator('.day-label')).toHaveText('Martes, 3 de noviembre');
  const online = page.getByTestId('col-marta').locator('.event.online');
  await expect(online).toHaveCount(1);
  await online.click();
  await expect(page.getByRole('dialog')).toContainText(code);

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Día siguiente' }).click();
  await page.getByRole('button', { name: 'Día siguiente' }).click();
  await page.getByRole('button', { name: 'Día siguiente' }).click();
  await page.getByRole('button', { name: 'Día siguiente' }).click();
  await page.getByRole('button', { name: 'Día siguiente' }).click();
  await expect(page.locator('.day-label')).toHaveText('Domingo, 8 de noviembre');
  await expect(page.getByText('La barbería está cerrada este día.')).toBeVisible();
});
