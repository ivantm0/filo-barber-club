<script lang="ts">
  import { onMount } from 'svelte';
  import { bookings } from '$lib/bookings.svelte';
  import { getBarber, getService } from '$lib/data';
  import { downloadIcs } from '$lib/ics';
  import type { Booking } from '$lib/availability';
  import { fmtDuration, fmtLongDate, fmtPrice, fmtTime, nowMinutes, todayIso } from '$lib/time';
  import Icon from '$lib/components/Icon.svelte';

  let mounted = $state(false);
  let confirming = $state<string | null>(null);
  let code = $state('');
  // Se guarda el código buscado, no una copia de la cita, para que refleje cambios (p. ej. una cancelación)
  let searched = $state<string | null>(null);
  const lookup = $derived(searched === null ? undefined : (bookings.byCode(searched) ?? null));

  onMount(() => {
    bookings.init();
    mounted = true;
  });

  const isPast = (b: Booking) => b.date < todayIso() || (b.date === todayIso() && b.start + b.minutes <= nowMinutes());
  const sorted = $derived([...bookings.list].sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start));
  const upcoming = $derived(sorted.filter((b) => b.status === 'confirmed' && !isPast(b)));
  const history = $derived(sorted.filter((b) => b.status === 'cancelled' || isPast(b)).reverse());

  function cancel(id: string) {
    if (confirming !== id) {
      confirming = id;
      return;
    }
    bookings.cancel(id);
    confirming = null;
  }
</script>

<svelte:head>
  <title>Mis citas · Filo Barber Club</title>
</svelte:head>

{#snippet bookingCard(b: Booking, past: boolean)}
  <article class="card booking" class:cancelled={b.status === 'cancelled'} data-testid="booking">
    <div class="date">
      <span class="day">{Number(b.date.slice(8))}</span>
      <span class="month">{fmtLongDate(b.date).split(' ').at(-1)}</span>
    </div>
    <div class="info">
      <h2>{b.serviceIds.map((id) => getService(id)?.name).join(' + ')}</h2>
      <p class="muted">
        {fmtLongDate(b.date)} · {fmtTime(b.start)} – {fmtTime(b.start + b.minutes)} · con {getBarber(b.barberId)?.name}
      </p>
      <p class="meta">
        <span class="code">{b.code}</span>
        <span>{fmtDuration(b.minutes)} · {fmtPrice(b.price)}</span>
        {#if b.status === 'cancelled'}<span class="tag bad">Cancelada</span>{:else if past}<span class="tag">Realizada</span>{/if}
      </p>
    </div>
    {#if !past && b.status === 'confirmed'}
      <div class="actions">
        <button type="button" class="btn btn-ghost sm" onclick={() => downloadIcs(b)} aria-label="Añadir al calendario la cita {b.code}">
          <Icon name="download" size={16} />
        </button>
        <button
          type="button"
          class="btn sm"
          class:btn-ghost={confirming !== b.id}
          class:danger={confirming === b.id}
          onclick={() => cancel(b.id)}
          onblur={() => confirming === b.id && (confirming = null)}
        >
          {confirming === b.id ? '¿Seguro? Cancelar' : 'Cancelar'}
        </button>
      </div>
    {/if}
  </article>
{/snippet}

<div class="container page">
  <p class="eyebrow">Mis citas</p>
  <h1>Tus reservas</h1>
  <p class="muted lead">Aquí aparecen las citas que has reservado desde este navegador.</p>

  <form class="lookup card" onsubmit={(e) => { e.preventDefault(); searched = code; }}>
    <label for="code" class="label">¿Tienes un código de reserva?</label>
    <div class="row">
      <input id="code" class="input" placeholder="FILO-XXXX" bind:value={code} autocomplete="off" />
      <button class="btn btn-primary" type="submit">Buscar</button>
    </div>
    {#if lookup === null}
      <p class="error" role="alert">No hay ninguna cita con ese código en este navegador.</p>
    {:else if lookup}
      <div class="found">{@render bookingCard(lookup, isPast(lookup))}</div>
    {/if}
  </form>

  {#if mounted}
    <section>
      <h2 class="section-title">Próximas</h2>
      {#each upcoming as b (b.id)}
        {@render bookingCard(b, false)}
      {:else}
        <div class="empty card">
          <Icon name="calendar" size={32} />
          <p>No tienes citas pendientes.</p>
          <a class="btn btn-primary" href="/reservar">Reservar cita</a>
        </div>
      {/each}
    </section>

    {#if history.length}
      <section>
        <h2 class="section-title">Historial</h2>
        {#each history as b (b.id)}
          {@render bookingCard(b, true)}
        {/each}
      </section>
    {/if}
  {/if}
</div>

<style>
  .page { padding-top: 40px; max-width: 860px; }
  h1 { font-size: clamp(38px, 6vw, 56px); }
  .lead { margin: 10px 0 28px; }
  .lookup { padding: 20px; margin-bottom: 36px; }
  .row { display: flex; gap: 10px; }
  .row .input { text-transform: uppercase; }
  .found { margin-top: 16px; }
  .section-title { margin: 28px 0 14px; font-size: 26px; }

  .booking { display: flex; align-items: center; gap: 20px; padding: 18px 20px; margin-bottom: 12px; }
  .booking.cancelled { opacity: 0.55; }
  .date { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 64px; height: 64px; flex-shrink: 0; border-radius: 16px; background: var(--surface-2); }
  .day { font-family: var(--serif); font-size: 26px; line-height: 1; }
  .month { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--brass); }
  .info { flex: 1; min-width: 0; }
  .info h2 { font-family: var(--sans); font-size: 17px; font-weight: 600; letter-spacing: 0; }
  .info p { margin: 2px 0 0; font-size: 14px; }
  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin-top: 6px !important; color: var(--muted); }
  .code { font-weight: 700; letter-spacing: 0.08em; color: var(--brass); }
  .tag { padding: 2px 8px; border-radius: 999px; background: var(--surface-2); font-size: 12px; font-weight: 600; }
  .tag.bad { color: var(--bad); }
  .actions { display: flex; gap: 8px; }
  .sm { min-height: 40px; padding: 0 14px; font-size: 14px; }
  .danger { background: var(--bad); color: #1a0606; }
  .empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; text-align: center; color: var(--muted); }
  .empty p { margin: 0; }

  @media (max-width: 600px) {
    .booking { flex-wrap: wrap; }
    .actions { width: 100%; }
    .actions .btn:last-child { flex: 1; }
  }
</style>
