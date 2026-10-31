<script lang="ts">
  import { addDays, fmtMonth, parseIso, toIsoDate, todayIso } from '$lib/time';
  import { BOOKING_WINDOW_DAYS } from '$lib/data';
  import Icon from './Icon.svelte';

  let {
    value,
    isAvailable,
    onselect,
  }: { value: string | null; isAvailable: (iso: string) => boolean; onselect: (iso: string) => void } = $props();

  const today = todayIso();
  const last = addDays(today, BOOKING_WINDOW_DAYS);
  const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

  let month = $state(today.slice(0, 7));

  const firstOfMonth = (m: string) => `${m}-01`;
  const shiftMonth = (m: string, delta: number) => {
    const d = parseIso(firstOfMonth(m));
    d.setMonth(d.getMonth() + delta);
    return toIsoDate(d).slice(0, 7);
  };

  // Celdas del mes empezando en lunes; null = hueco antes del día 1
  const cells = $derived.by(() => {
    const first = parseIso(firstOfMonth(month));
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
    ];
  });

  const canPrev = $derived(month > today.slice(0, 7));
  const canNext = $derived(month < last.slice(0, 7));

  function label(iso: string) {
    const d = parseIso(iso);
    return `${WEEKDAY_NAMES[(d.getDay() + 6) % 7]} ${d.getDate()}`;
  }
</script>

<div class="calendar">
  <div class="head">
    <button type="button" class="nav" onclick={() => (month = shiftMonth(month, -1))} disabled={!canPrev} aria-label="Mes anterior">
      <Icon name="chevron-left" />
    </button>
    <span class="month" aria-live="polite">{fmtMonth(firstOfMonth(month))}</span>
    <button type="button" class="nav" onclick={() => (month = shiftMonth(month, 1))} disabled={!canNext} aria-label="Mes siguiente">
      <Icon name="chevron-right" />
    </button>
  </div>

  <div class="grid" role="grid" aria-label="Elige un día">
    {#each WEEKDAYS as w (w)}
      <span class="weekday" aria-hidden="true">{w}</span>
    {/each}
    {#each cells as iso, i (iso ?? `empty-${i}`)}
      {#if iso}
        {@const ok = isAvailable(iso)}
        <button
          type="button"
          class="day"
          class:selected={value === iso}
          class:today={iso === today}
          disabled={!ok}
          aria-pressed={value === iso}
          aria-label="{label(iso)}{ok ? '' : ', no disponible'}"
          onclick={() => onselect(iso)}
        >
          {Number(iso.slice(8))}
        </button>
      {:else}
        <span></span>
      {/if}
    {/each}
  </div>
</div>

<style>
  .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .month { font-family: var(--serif); font-size: 22px; }
  .nav { display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid var(--border); border-radius: 50%; background: none; color: var(--text); cursor: pointer; }
  .nav:disabled { opacity: 0.3; cursor: default; }
  .grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
  .weekday { padding-bottom: 6px; text-align: center; font-size: 12px; font-weight: 600; color: var(--muted); }
  .day {
    aspect-ratio: 1;
    min-height: 40px;
    border: 1px solid transparent;
    border-radius: 12px;
    background: var(--surface-2);
    color: var(--text);
    font: 600 15px var(--sans);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .day:hover:not(:disabled) { border-color: var(--brass); }
  .day.today { border-color: var(--border); }
  .day.selected { background: var(--brass); color: var(--brass-ink); }
  .day:disabled { background: transparent; color: var(--muted); opacity: 0.35; cursor: default; text-decoration: line-through; }
</style>
