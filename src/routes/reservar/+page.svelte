<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { BARBERS, SERVICES, getBarber, getService } from '$lib/data';
  import { availableSlots, isBookableDate, type Booking } from '$lib/availability';
  import { bookings, newCode } from '$lib/bookings.svelte';
  import { downloadIcs } from '$lib/ics';
  import { fmtDuration, fmtLongDate, fmtPrice, fmtTime } from '$lib/time';
  import Calendar from '$lib/components/Calendar.svelte';
  import Icon from '$lib/components/Icon.svelte';

  const STEPS = ['Servicios', 'Barbero', 'Fecha y hora', 'Tus datos'];

  let step = $state(0);
  let serviceIds = $state<string[]>([]);
  let barberId = $state<string | 'any'>('any');
  let date = $state<string | null>(null);
  let slot = $state<{ start: number; barberId: string } | null>(null);
  let form = $state({ name: '', phone: '', email: '', notes: '', accept: false });
  let touched = $state(false);
  let confirmed = $state<Booking | null>(null);
  let slotTaken = $state(false);
  let heading = $state<HTMLElement>();
  // El calendario depende de la fecha actual: se pinta solo en el navegador, no en el pre-renderizado
  let mounted = $state(false);

  const selected = $derived(serviceIds.map((id) => getService(id)!).filter(Boolean));
  const minutes = $derived(selected.reduce((acc, s) => acc + s.minutes, 0));
  const price = $derived(selected.reduce((acc, s) => acc + s.price, 0));
  const slots = $derived(date ? availableSlots(date, minutes, barberId, bookings.list) : []);
  const morning = $derived(slots.filter((s) => s.start < 15 * 60));
  const afternoon = $derived(slots.filter((s) => s.start >= 15 * 60));
  const assignedBarber = $derived(slot ? getBarber(slot.barberId) : barberId === 'any' ? null : getBarber(barberId));

  // Preselección desde la landing: /reservar?servicio=fade&barbero=alex
  onMount(() => {
    bookings.init();
    mounted = true;
    const params = new URL(location.href).searchParams;
    const s = params.get('servicio');
    const b = params.get('barbero');
    if (s && getService(s)) serviceIds = [s];
    if (b && getBarber(b)) barberId = b;
  });

  function dayAvailable(iso: string) {
    if (!isBookableDate(iso)) return false;
    return availableSlots(iso, minutes || 15, barberId, bookings.list).length > 0;
  }

  function toggleService(id: string) {
    serviceIds = serviceIds.includes(id) ? serviceIds.filter((x) => x !== id) : [...serviceIds, id];
    slot = null;
  }

  async function go(to: number) {
    step = to;
    slotTaken = false;
    await tick();
    heading?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Validación de datos personales ---
  const errors = $derived({
    name: form.name.trim().length < 2 ? 'Escribe tu nombre' : '',
    phone: !/^[6-9]\d{8}$/.test(form.phone.replace(/\s/g, '')) ? 'Introduce un móvil español de 9 cifras' : '',
    email: form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email) ? 'Ese email no parece válido' : '',
    accept: !form.accept ? 'Necesitamos tu consentimiento para guardar la cita' : '',
  });
  const show = (field: keyof typeof errors) => (touched ? errors[field] : '');

  const canNext = $derived(
    step === 0 ? serviceIds.length > 0 : step === 1 ? true : step === 2 ? !!(date && slot) : !Object.values(errors).some(Boolean),
  );

  async function confirm() {
    touched = true;
    if (Object.values(errors).some(Boolean) || !date || !slot) {
      await tick();
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    // Comprueba que el hueco sigue libre justo antes de guardar
    const stillFree = availableSlots(date, minutes, slot.barberId, bookings.list).some((s) => s.start === slot!.start);
    if (!stillFree) {
      slotTaken = true;
      slot = null;
      await go(2);
      slotTaken = true;
      return;
    }
    const booking: Booking = {
      id: crypto.randomUUID(),
      code: newCode(),
      date,
      start: slot.start,
      minutes,
      barberId: slot.barberId,
      serviceIds: [...serviceIds],
      price,
      name: form.name.trim(),
      phone: form.phone.replace(/\s/g, ''),
      email: form.email.trim(),
      notes: form.notes.trim(),
      status: 'confirmed',
      createdAt: Date.now(),
    };
    bookings.add(booking);
    confirmed = booking;
    await tick();
    heading?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function restart() {
    confirmed = null;
    serviceIds = [];
    barberId = 'any';
    date = null;
    slot = null;
    form = { name: '', phone: '', email: '', notes: '', accept: false };
    touched = false;
    step = 0;
  }
</script>

<svelte:head>
  <title>Reservar cita · Filo Barber Club</title>
</svelte:head>

<div class="container page">
  {#if !mounted}
    <p class="muted loading">Cargando la agenda…</p>
  {:else if confirmed}
    <section class="success card" in:fly={{ y: 20, duration: 350 }}>
      <span class="check"><Icon name="check" size={34} /></span>
      <h1 tabindex="-1" bind:this={heading}>¡Cita confirmada!</h1>
      <p class="muted">Te esperamos, {confirmed.name.split(' ')[0]}. Guarda tu código para consultarla o cancelarla.</p>
      <p class="code" data-testid="booking-code">{confirmed.code}</p>
      <dl class="details">
        <div><dt>Cuándo</dt><dd>{fmtLongDate(confirmed.date)} · {fmtTime(confirmed.start)}</dd></div>
        <div><dt>Con</dt><dd>{getBarber(confirmed.barberId)?.name}</dd></div>
        <div><dt>Servicios</dt><dd>{confirmed.serviceIds.map((id) => getService(id)?.name).join(', ')}</dd></div>
        <div><dt>Duración y precio</dt><dd>{fmtDuration(confirmed.minutes)} · {fmtPrice(confirmed.price)}</dd></div>
      </dl>
      <div class="done-actions">
        <button type="button" class="btn btn-primary" onclick={() => downloadIcs(confirmed!)}><Icon name="download" size={18} /> Añadir al calendario</button>
        <a class="btn btn-ghost" href="/mis-citas">Ver mis citas</a>
        <button type="button" class="btn btn-ghost" onclick={restart}>Reservar otra</button>
      </div>
    </section>
  {:else}
    <ol class="stepper" aria-label="Pasos de la reserva">
      {#each STEPS as s, i (s)}
        <li class:active={i === step} class:done={i < step} aria-current={i === step ? 'step' : undefined}>
          <button type="button" disabled={i > step} onclick={() => go(i)}>
            <span class="n">{#if i < step}<Icon name="check" size={14} />{:else}{i + 1}{/if}</span>
            <span class="t">{s}</span>
          </button>
        </li>
      {/each}
    </ol>

    <div class="layout">
      <section class="panel card">
        {#key step}
          <div in:fly={{ x: 24, duration: 280 }}>
            {#if step === 0}
              <h1 tabindex="-1" bind:this={heading}>¿Qué te hacemos?</h1>
              <p class="muted sub">Puedes elegir varios servicios: sumamos la duración y el precio.</p>
              <div class="options">
                {#each SERVICES as s (s.id)}
                  <label class="option" class:on={serviceIds.includes(s.id)}>
                    <input type="checkbox" checked={serviceIds.includes(s.id)} onchange={() => toggleService(s.id)} />
                    <span class="box" aria-hidden="true"><Icon name="check" size={14} /></span>
                    <span class="opt-body">
                      <span class="opt-title">{s.name}</span>
                      <span class="muted small">{s.description}</span>
                    </span>
                    <span class="opt-side">
                      <b>{fmtPrice(s.price)}</b>
                      <span class="muted small">{fmtDuration(s.minutes)}</span>
                    </span>
                  </label>
                {/each}
              </div>
            {:else if step === 1}
              <h1 tabindex="-1" bind:this={heading}>¿Con quién?</h1>
              <p class="muted sub">Si no tienes preferencia, te asignamos el primero que esté libre.</p>
              <div class="options barbers">
                <label class="option" class:on={barberId === 'any'}>
                  <input type="radio" name="barber" value="any" bind:group={barberId} onchange={() => (slot = null)} />
                  <span class="avatar any" aria-hidden="true"><Icon name="sparkle" /></span>
                  <span class="opt-body">
                    <span class="opt-title">Sin preferencia</span>
                    <span class="muted small">Más horas disponibles</span>
                  </span>
                </label>
                {#each BARBERS as b (b.id)}
                  <label class="option" class:on={barberId === b.id}>
                    <input type="radio" name="barber" value={b.id} bind:group={barberId} onchange={() => (slot = null)} />
                    <span class="avatar" style="--c: {b.color}" aria-hidden="true">{b.name[0]}</span>
                    <span class="opt-body">
                      <span class="opt-title">{b.name}</span>
                      <span class="muted small">{b.specialty}</span>
                    </span>
                  </label>
                {/each}
              </div>
            {:else if step === 2}
              <h1 tabindex="-1" bind:this={heading}>¿Cuándo te viene bien?</h1>
              <p class="muted sub">Solo mostramos las horas en las que caben tus {fmtDuration(minutes)}.</p>
              {#if slotTaken}
                <p class="alert" role="alert"><Icon name="x" size={16} /> Esa hora se acaba de ocupar. Elige otra, por favor.</p>
              {/if}
              <div class="when">
                <Calendar value={date} isAvailable={dayAvailable} onselect={(iso) => { date = iso; slot = null; }} />
                <div class="slots" aria-live="polite">
                  {#if !date}
                    <p class="muted empty"><Icon name="calendar" /> Elige un día para ver las horas libres.</p>
                  {:else if !slots.length}
                    <p class="muted empty">No quedan huecos ese día. Prueba con otro.</p>
                  {:else}
                    <p class="slots-day">{fmtLongDate(date)}</p>
                    {#each [{ label: 'Mañana', list: morning }, { label: 'Tarde', list: afternoon }] as group (group.label)}
                      {#if group.list.length}
                        <p class="group-label">{group.label}</p>
                        <div class="slot-grid">
                          {#each group.list as s (s.start)}
                            <button type="button" class="slot" class:on={slot?.start === s.start} aria-pressed={slot?.start === s.start} onclick={() => (slot = s)}>
                              {fmtTime(s.start)}
                            </button>
                          {/each}
                        </div>
                      {/if}
                    {/each}
                  {/if}
                </div>
              </div>
            {:else}
              <h1 tabindex="-1" bind:this={heading}>Ya casi está</h1>
              <p class="muted sub">Solo usamos estos datos para gestionar tu cita.</p>
              <form class="form" novalidate onsubmit={(e) => { e.preventDefault(); confirm(); }}>
                <div>
                  <label class="label" for="f-name">Nombre</label>
                  <input id="f-name" class="input" autocomplete="name" bind:value={form.name} aria-invalid={!!show('name')} aria-describedby="e-name" />
                  <p id="e-name" class="error">{show('name')}</p>
                </div>
                <div>
                  <label class="label" for="f-phone">Móvil</label>
                  <input id="f-phone" class="input" type="tel" inputmode="tel" autocomplete="tel" placeholder="600 123 456" bind:value={form.phone} aria-invalid={!!show('phone')} aria-describedby="e-phone" />
                  <p id="e-phone" class="error">{show('phone')}</p>
                </div>
                <div class="full">
                  <label class="label" for="f-email">Email <span class="muted">(opcional)</span></label>
                  <input id="f-email" class="input" type="email" autocomplete="email" bind:value={form.email} aria-invalid={!!show('email')} aria-describedby="e-email" />
                  <p id="e-email" class="error">{show('email')}</p>
                </div>
                <div class="full">
                  <label class="label" for="f-notes">Notas para el barbero <span class="muted">(opcional)</span></label>
                  <textarea id="f-notes" class="input" maxlength="300" placeholder="Ej.: degradado bajo y dejar volumen arriba" bind:value={form.notes}></textarea>
                </div>
                <div class="full">
                  <label class="consent">
                    <input type="checkbox" bind:checked={form.accept} aria-invalid={!!show('accept')} aria-describedby="e-accept" />
                    Acepto que se guarden mis datos para gestionar la cita.
                  </label>
                  <p id="e-accept" class="error">{show('accept')}</p>
                </div>
              </form>
            {/if}
          </div>
        {/key}

        <div class="nav-row">
          {#if step > 0}
            <button type="button" class="btn btn-ghost" onclick={() => go(step - 1)}><Icon name="arrow-left" size={18} /> Atrás</button>
          {/if}
          {#if step < 3}
            <button type="button" class="btn btn-primary next" disabled={!canNext} onclick={() => go(step + 1)}>Continuar <Icon name="arrow-right" size={18} /></button>
          {:else}
            <button type="button" class="btn btn-primary next" onclick={confirm}>Confirmar cita <Icon name="check" size={18} /></button>
          {/if}
        </div>
      </section>

      <aside class="summary card" aria-label="Resumen de la reserva">
        <h2>Tu cita</h2>
        {#if selected.length}
          <ul class="sum-services">
            {#each selected as s (s.id)}
              <li><span>{s.name}</span><span>{fmtPrice(s.price)}</span></li>
            {/each}
          </ul>
        {:else}
          <p class="muted small">Aún no has elegido servicios.</p>
        {/if}
        <dl class="sum-meta">
          <div><dt><Icon name="user" size={16} /> Barbero</dt><dd>{assignedBarber?.name ?? 'Sin preferencia'}</dd></div>
          <div><dt><Icon name="calendar" size={16} /> Día</dt><dd>{date ? fmtLongDate(date) : '—'}</dd></div>
          <div><dt><Icon name="clock" size={16} /> Hora</dt><dd>{slot ? `${fmtTime(slot.start)} – ${fmtTime(slot.start + minutes)}` : '—'}</dd></div>
        </dl>
        <div class="total">
          <span>Total <span class="muted small">· {minutes ? fmtDuration(minutes) : '0 min'}</span></span>
          <b data-testid="total">{fmtPrice(price)}</b>
        </div>
        <p class="muted small">Pagas en la barbería. Cancelación gratuita.</p>
      </aside>
    </div>
  {/if}
</div>

<style>
  .page { padding-top: 32px; }
  .loading { padding: 80px 0; text-align: center; }

  .stepper { list-style: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0 0 24px; padding: 0; }
  .stepper button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 0; border: 0; border-top: 3px solid var(--border); background: none; color: var(--muted); font: 600 14px var(--sans); text-align: left; cursor: pointer; }
  .stepper button:disabled { cursor: default; }
  .stepper .n { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--border); font-size: 13px; }
  .stepper li.active button { border-color: var(--brass); color: var(--text); }
  .stepper li.active .n { background: var(--brass); border-color: var(--brass); color: var(--brass-ink); }
  .stepper li.done button { border-color: rgb(212 162 76 / 0.5); color: var(--text); }
  .stepper li.done .n { border-color: var(--brass); color: var(--brass); }

  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 24px; align-items: start; }
  .panel { padding: clamp(20px, 4vw, 36px); }
  h1 { font-size: clamp(32px, 4.5vw, 46px); outline: none; }
  .sub { margin: 10px 0 24px; }
  .small { font-size: 14px; }

  .options { display: grid; gap: 10px; }
  .barbers { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .option { position: relative; display: flex; align-items: center; gap: 14px; padding: 16px 18px; border: 1px solid var(--border); border-radius: 16px; background: var(--bg); cursor: pointer; transition: border-color 0.15s, background 0.15s; }
  .option:hover { border-color: rgb(212 162 76 / 0.5); }
  .option.on { border-color: var(--brass); background: rgb(212 162 76 / 0.08); }
  .option input { position: absolute; opacity: 0; pointer-events: none; }
  .option:has(input:focus-visible) { outline: 2px solid var(--brass); outline-offset: 2px; }
  .box { display: grid; place-items: center; width: 22px; height: 22px; flex-shrink: 0; border: 1.5px solid var(--border); border-radius: 7px; color: transparent; }
  .option.on .box { background: var(--brass); border-color: var(--brass); color: var(--brass-ink); }
  .opt-body { display: flex; flex-direction: column; flex: 1; min-width: 0; }
  .opt-title { font-weight: 600; }
  .opt-side { display: flex; flex-direction: column; align-items: flex-end; }
  .opt-side b { font-family: var(--serif); font-size: 20px; font-weight: 500; color: var(--brass); }
  .avatar { display: grid; place-items: center; width: 48px; height: 48px; flex-shrink: 0; border-radius: 50%; background: var(--c); color: var(--bg); font-family: var(--serif); font-size: 22px; font-weight: 700; }
  .avatar.any { background: var(--surface-2); color: var(--brass); }

  .when { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 28px; }
  .empty { display: flex; align-items: center; gap: 10px; height: 100%; min-height: 200px; justify-content: center; text-align: center; border: 1px dashed var(--border); border-radius: 16px; padding: 20px; margin: 0; }
  .slots-day { margin: 0 0 8px; font-family: var(--serif); font-size: 20px; }
  .group-label { margin: 14px 0 8px; font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .slot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; }
  .slot { min-height: 44px; border: 1px solid var(--border); border-radius: 12px; background: var(--bg); color: var(--text); font: 600 15px var(--sans); font-variant-numeric: tabular-nums; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
  .slot:hover { border-color: var(--brass); }
  .slot.on { background: var(--brass); border-color: var(--brass); color: var(--brass-ink); }
  .alert { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; padding: 10px 14px; border-radius: 12px; background: rgb(248 113 113 / 0.12); color: var(--bad); font-weight: 600; }

  .form { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
  .full { grid-column: 1 / -1; }
  .consent { display: flex; align-items: flex-start; gap: 10px; font-size: 15px; cursor: pointer; }
  .consent input { width: 20px; height: 20px; margin-top: 2px; accent-color: var(--brass); }

  .nav-row { display: flex; gap: 12px; margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--border); }
  .next { margin-left: auto; }

  .summary { position: sticky; top: 96px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
  .summary h2 { font-size: 26px; }
  .sum-services { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .sum-services li { display: flex; justify-content: space-between; gap: 12px; }
  .sum-meta { margin: 0; display: grid; gap: 10px; padding: 14px 0; border-block: 1px solid var(--border); }
  .sum-meta div { display: flex; justify-content: space-between; gap: 12px; font-size: 15px; }
  .sum-meta dt { display: flex; align-items: center; gap: 8px; color: var(--muted); }
  .sum-meta dd { margin: 0; text-align: right; font-weight: 600; }
  .total { display: flex; justify-content: space-between; align-items: baseline; }
  .total b { font-family: var(--serif); font-size: 32px; font-weight: 500; color: var(--brass); }
  .summary > p { margin: 0; }

  .success { max-width: 640px; margin: 24px auto 0; padding: clamp(28px, 5vw, 48px); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .check { display: grid; place-items: center; width: 72px; height: 72px; border-radius: 50%; background: var(--brass); color: var(--brass-ink); margin-bottom: 8px; }
  .success .muted { margin: 0; }
  .code { margin: 12px 0; padding: 10px 22px; border: 1px dashed var(--brass); border-radius: 12px; font: 700 26px var(--sans); letter-spacing: 0.12em; color: var(--brass); }
  .details { width: 100%; margin: 8px 0 16px; display: grid; gap: 1px; overflow: hidden; border: 1px solid var(--border); border-radius: 14px; background: var(--border); text-align: left; }
  .details div { display: flex; justify-content: space-between; gap: 16px; padding: 12px 16px; background: var(--bg); }
  .details dt { color: var(--muted); }
  .details dd { margin: 0; font-weight: 600; text-align: right; }
  .done-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }

  @media (max-width: 960px) {
    .layout { grid-template-columns: 1fr; }
    .summary { position: static; order: -1; }
    .when { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .stepper .t { display: none; }
    .barbers, .form { grid-template-columns: 1fr; }
  }
</style>
