<script lang="ts">
  import { onMount } from 'svelte';
  import { bookings } from '$lib/bookings.svelte';
  import { BARBERS, OPENING, getService } from '$lib/data';
  import { agendaFor, barbersOn, type Booking } from '$lib/availability';
  import { addDays, fmtLongDate, fmtPrice, fmtTime, nowMinutes, parseIso, todayIso } from '$lib/time';
  import Icon from '$lib/components/Icon.svelte';

  const DAY_START = 10 * 60;
  const DAY_END = 21 * 60;
  const PX_PER_MIN = 1.6;

  let mounted = $state(false);
  let date = $state('');
  let selected = $state<Booking | null>(null);
  let now = $state(0);

  onMount(() => {
    bookings.init();
    date = todayIso();
    now = nowMinutes();
    mounted = true;
    const id = setInterval(() => (now = nowMinutes()), 60_000);
    return () => clearInterval(id);
  });

  const working = $derived(date ? barbersOn(date) : []);
  const columns = $derived(working.map((b) => ({ barber: b, items: agendaFor(date, b, bookings.list) })));
  const all = $derived(columns.flatMap((c) => c.items));
  const openMinutes = $derived(date ? OPENING[parseIso(date).getDay()].reduce((acc, [o, c]) => acc + (c - o), 0) : 0);

  const stats = $derived({
    count: all.length,
    online: all.filter((b) => !b.demo).length,
    revenue: all.reduce((acc, b) => acc + b.price, 0),
    occupancy: openMinutes && working.length ? Math.round((all.reduce((acc, b) => acc + b.minutes, 0) / (openMinutes * working.length)) * 100) : 0,
  });

  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);
  const closedBands = $derived(
    date
      ? (() => {
          const ranges = OPENING[parseIso(date).getDay()];
          const bands: [number, number][] = [];
          let cursor = DAY_START;
          for (const [o, c] of ranges) {
            if (o > cursor) bands.push([cursor, o]);
            cursor = c;
          }
          if (cursor < DAY_END) bands.push([cursor, DAY_END]);
          return bands;
        })()
      : [],
  );

  const top = (m: number) => (m - DAY_START) * PX_PER_MIN;
  const services = (b: Booking) => b.serviceIds.map((id) => getService(id)?.name).join(' + ');
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (selected = null)} />

<svelte:head>
  <title>Panel · Filo Barber Club</title>
</svelte:head>

<div class="container page">
  <div class="head">
    <div>
      <p class="eyebrow">Panel del negocio · demo</p>
      <h1>Agenda</h1>
    </div>
    {#if mounted}
      <div class="day-nav">
        <button type="button" class="round" onclick={() => { date = addDays(date, -1); selected = null; }} aria-label="Día anterior"><Icon name="chevron-left" /></button>
        <span class="day-label" aria-live="polite">{fmtLongDate(date)}</span>
        <button type="button" class="round" onclick={() => { date = addDays(date, 1); selected = null; }} aria-label="Día siguiente"><Icon name="chevron-right" /></button>
        {#if date !== todayIso()}
          <button type="button" class="btn btn-ghost sm" onclick={() => (date = todayIso())}>Hoy</button>
        {/if}
      </div>
    {/if}
  </div>

  <p class="muted note">
    Vista de demostración: muestra citas de ejemplo y las que reserves desde este navegador (<span class="legend-online"></span> reservas online).
  </p>

  {#if mounted}
    <dl class="stats">
      <div class="card"><dt>Citas</dt><dd data-testid="stat-count">{stats.count}</dd></div>
      <div class="card"><dt>Reservas online</dt><dd>{stats.online}</dd></div>
      <div class="card"><dt>Ocupación</dt><dd>{stats.occupancy}%</dd></div>
      <div class="card"><dt>Ingresos previstos</dt><dd>{fmtPrice(stats.revenue)}</dd></div>
    </dl>

    {#if !working.length}
      <div class="card closed-day"><Icon name="calendar" size={32} /><p>La barbería está cerrada este día.</p></div>
    {:else}
      <div class="agenda card">
        <div class="grid" style="--cols: {working.length}">
          <div class="corner"></div>
          {#each columns as c (c.barber.id)}
            <div class="col-head"><span class="dot" style="background: {c.barber.color}"></span>{c.barber.name}</div>
          {/each}

          <div class="times" style="height: {top(DAY_END)}px">
            {#each hours as h (h)}
              <span style="top: {top(h)}px">{fmtTime(h)}</span>
            {/each}
          </div>

          {#each columns as c (c.barber.id)}
            <div class="col" style="height: {top(DAY_END)}px" data-testid="col-{c.barber.id}">
              {#each hours as h (h)}<span class="line" style="top: {top(h)}px"></span>{/each}
              {#each closedBands as [from, to] (from)}
                <span class="closed" style="top: {top(from)}px; height: {(to - from) * PX_PER_MIN}px"></span>
              {/each}
              {#each c.items as b (b.id)}
                <button
                  type="button"
                  class="event"
                  class:online={!b.demo}
                  style="top: {top(b.start)}px; height: {b.minutes * PX_PER_MIN - 3}px; --c: {c.barber.color}"
                  onclick={() => (selected = b)}
                  aria-label="{fmtTime(b.start)}, {b.name}, {services(b)}"
                >
                  <span class="ev-time">{fmtTime(b.start)}</span>
                  <span class="ev-name">{b.name}</span>
                  {#if b.minutes >= 45}<span class="ev-service">{services(b)}</span>{/if}
                </button>
              {/each}
              {#if date === todayIso() && now >= DAY_START && now <= DAY_END}
                <span class="now" style="top: {top(now)}px"></span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

{#if selected}
  <div class="scrim" role="presentation" onclick={() => (selected = null)}></div>
  <div class="detail card" role="dialog" aria-modal="true" aria-labelledby="detail-title">
    <button type="button" class="round close" onclick={() => (selected = null)} aria-label="Cerrar"><Icon name="x" /></button>
    <p class="eyebrow">{selected.demo ? 'Cita de ejemplo' : `Reserva online · ${selected.code}`}</p>
    <h2 id="detail-title">{selected.name}</h2>
    <dl>
      <div><dt>Hora</dt><dd>{fmtTime(selected.start)} – {fmtTime(selected.start + selected.minutes)}</dd></div>
      <div><dt>Barbero</dt><dd>{BARBERS.find((b) => b.id === selected!.barberId)?.name}</dd></div>
      <div><dt>Servicios</dt><dd>{services(selected)}</dd></div>
      <div><dt>Importe</dt><dd>{fmtPrice(selected.price)}</dd></div>
      {#if selected.phone}<div><dt>Móvil</dt><dd>{selected.phone}</dd></div>{/if}
      {#if selected.notes}<div><dt>Notas</dt><dd>{selected.notes}</dd></div>{/if}
    </dl>
    {#if !selected.demo}
      <button type="button" class="btn btn-ghost" onclick={() => { bookings.cancel(selected!.id); selected = null; }}>
        <Icon name="trash" size={16} /> Cancelar cita
      </button>
    {/if}
  </div>
{/if}

<style>
  .page { padding-top: 40px; }
  .head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; }
  h1 { font-size: clamp(38px, 6vw, 56px); }
  .day-nav { display: flex; align-items: center; gap: 8px; }
  .day-label { min-width: 210px; text-align: center; font-weight: 600; }
  .round { display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid var(--border); border-radius: 50%; background: none; color: var(--text); cursor: pointer; }
  .sm { min-height: 42px; padding: 0 16px; font-size: 14px; }
  .note { margin: 12px 0 24px; font-size: 14px; }
  .legend-online { display: inline-block; width: 10px; height: 10px; border-radius: 3px; background: var(--brass); vertical-align: middle; }

  .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 0 0 20px; }
  .stats div { padding: 16px 18px; }
  .stats dt { font-size: 13px; color: var(--muted); }
  .stats dd { margin: 2px 0 0; font-family: var(--serif); font-size: 30px; }

  .agenda { overflow-x: auto; padding: 16px 16px 20px 0; }
  .grid { display: grid; grid-template-columns: 56px repeat(var(--cols), minmax(150px, 1fr)); min-width: calc(56px + var(--cols) * 150px); }
  .col-head { display: flex; align-items: center; gap: 8px; padding: 0 10px 12px; font-weight: 600; }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .times { position: relative; }
  .times span { position: absolute; right: 10px; transform: translateY(-50%); font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
  .col { position: relative; margin: 0 4px; border-left: 1px solid var(--border); }
  .line { position: absolute; left: 0; right: 0; border-top: 1px dashed var(--border); }
  .closed { position: absolute; left: 0; right: 0; background: repeating-linear-gradient(-45deg, transparent 0 6px, rgb(255 255 255 / 0.03) 6px 12px); }
  .event {
    position: absolute;
    left: 4px;
    right: 4px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    padding: 4px 8px;
    overflow: hidden;
    border: 0;
    border-left: 3px solid var(--c);
    border-radius: 8px;
    background: color-mix(in srgb, var(--c) 16%, var(--surface-2));
    color: var(--text);
    font: 12px/1.3 var(--sans);
    text-align: left;
    cursor: pointer;
  }
  .event:hover { filter: brightness(1.15); }
  .event.online { background: var(--brass); color: var(--brass-ink); border-left-color: #fff; }
  .ev-time { font-weight: 700; font-variant-numeric: tabular-nums; }
  .ev-name { font-weight: 600; }
  .ev-service { opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .now { position: absolute; left: -4px; right: 0; border-top: 2px solid var(--bad); }
  .now::before { content: ''; position: absolute; left: -4px; top: -5px; width: 8px; height: 8px; border-radius: 50%; background: var(--bad); }

  .closed-day { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px; color: var(--muted); }
  .closed-day p { margin: 0; }

  .scrim { position: fixed; inset: 0; z-index: 60; background: rgb(0 0 0 / 0.5); }
  .detail { position: fixed; top: 0; right: 0; bottom: 0; z-index: 61; width: min(400px, 100vw); padding: 28px; border-radius: 0; overflow-y: auto; animation: slide 0.25s ease-out; }
  @keyframes slide { from { transform: translateX(30px); opacity: 0; } }
  .close { position: absolute; top: 18px; right: 18px; }
  .detail h2 { font-size: 34px; margin-bottom: 18px; }
  .detail dl { display: grid; gap: 1px; margin: 0 0 20px; overflow: hidden; border: 1px solid var(--border); border-radius: 14px; background: var(--border); }
  .detail dl div { display: flex; justify-content: space-between; gap: 16px; padding: 12px 14px; background: var(--bg); }
  .detail dt { color: var(--muted); }
  .detail dd { margin: 0; font-weight: 600; text-align: right; }

  @media (max-width: 760px) {
    .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .day-label { min-width: 0; }
  }
</style>
