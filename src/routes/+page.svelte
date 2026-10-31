<script lang="ts">
  import { onMount } from 'svelte';
  import { BARBERS, BUSINESS, OPENING, SERVICES } from '$lib/data';
  import { availableSlots, openStatus } from '$lib/availability';
  import { bookings } from '$lib/bookings.svelte';
  import { addDays, fmtDuration, fmtLongDate, fmtPrice, fmtTime, todayIso } from '$lib/time';
  import Icon, { type IconName } from '$lib/components/Icon.svelte';

  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const WEEK = [1, 2, 3, 4, 5, 6, 0];
  const CATEGORIES = ['Cabello', 'Barba', 'Combos'] as const;

  // Lo que depende de la hora actual se calcula en el navegador (la página está pre-renderizada)
  let status = $state<ReturnType<typeof openStatus> | null>(null);
  let today = $state<number | null>(null);
  let nextSlot = $state<{ date: string; start: number; barber: string } | null>(null);

  onMount(() => {
    bookings.init();
    status = openStatus();
    today = new Date().getDay();
    const base = todayIso();
    for (let i = 0; i < 14 && !nextSlot; i++) {
      const date = addDays(base, i);
      const slot = availableSlots(date, 30, 'any', bookings.list)[0];
      if (slot) nextSlot = { date, start: slot.start, barber: BARBERS.find((b) => b.id === slot.barberId)!.name };
    }
  });

  const dayLabel = (iso: string) => (iso === todayIso() ? 'Hoy' : iso === addDays(todayIso(), 1) ? 'Mañana' : fmtLongDate(iso));
  const ranges = (day: number) => OPENING[day].map(([o, c]) => `${fmtTime(o)} – ${fmtTime(c)}`).join(' · ') || 'Cerrado';

  const STEPS: { icon: IconName; title: string; text: string }[] = [
    { icon: 'scissors', title: 'Elige tu servicio', text: 'Corte, barba o el ritual completo. Puedes combinar varios.' },
    { icon: 'calendar', title: 'Escoge día y hora', text: 'Solo ves los huecos reales en los que cabe tu servicio.' },
    { icon: 'check', title: 'Confirma y listo', text: 'Recibes un código y puedes añadir la cita a tu calendario.' },
  ];

  // Opiniones de ejemplo (barbería ficticia)
  const REVIEWS = [
    { name: 'Javier R.', text: 'El mejor degradado que me han hecho en Madrid. Reservar es rapidísimo.' },
    { name: 'Lucía M.', text: 'Traje a mi hijo y salió encantado. Puntuales y muy cuidadosos.' },
    { name: 'Carlos P.', text: 'El Ritual Filo merece cada euro. Toalla caliente, navaja y cero prisas.' },
  ];
</script>

<svelte:head>
  <title>Filo · Barber Club · Barbería en Madrid con reserva online</title>
  <meta name="description" content="Filo Barber Club: cortes, degradados y afeitado clásico. Reserva tu cita online en un minuto. Proyecto de portfolio." />
</svelte:head>

<section class="hero">
  <div class="container hero-grid">
    <div>
      <p class="eyebrow">Barbería en Madrid · Desde 2016</p>
      <h1>Cortes con oficio.<br /><em>Reserva en un minuto.</em></h1>
      <p class="lead">Degradados, cortes clásicos y afeitado a navaja con toalla caliente. Elige servicio, barbero y hora sin llamar a nadie.</p>
      <div class="actions">
        <a class="btn btn-primary" href="/reservar">Reservar cita <Icon name="arrow-right" size={18} /></a>
        <a class="btn btn-ghost" href="#servicios">Ver servicios</a>
      </div>
      <ul class="facts">
        <li><Icon name="star" size={18} /> <span><b>4,9</b> de valoración</span></li>
        <li><Icon name="scissors" size={18} /> <span><b>3</b> barberos</span></li>
        <li><Icon name="clock" size={18} /> <span>Lunes a sábado</span></li>
      </ul>
    </div>

    <div class="hero-art" aria-hidden="true">
      <div class="pole-wrap">
        <span class="cap"></span>
        <span class="big-pole pole"></span>
        <span class="cap"></span>
      </div>
      <div class="ticket card">
        <span class="ticket-label">Próxima hora libre</span>
        {#if nextSlot}
          <strong>{dayLabel(nextSlot.date)} · {fmtTime(nextSlot.start)}</strong>
          <span class="muted">con {nextSlot.barber}</span>
        {:else}
          <strong>Consultando…</strong>
          <span class="muted">&nbsp;</span>
        {/if}
      </div>
      <div class="badge card">
        <span class="dot" class:closed={status && !status.open}></span>
        {#if status}
          {status.open ? `Abierto hasta las ${fmtTime(status.until!)}` : status.nextToday ? `Abre hoy a las ${fmtTime(status.nextToday)}` : 'Cerrado ahora'}
        {:else}
          &nbsp;
        {/if}
      </div>
    </div>
  </div>
</section>

<div class="ribbon" aria-hidden="true">
  <div class="ribbon-track">
    {#each [...SERVICES, ...SERVICES] as s, i (i)}
      <span>{s.name}<i>✦</i></span>
    {/each}
  </div>
</div>

<section id="servicios" class="container section">
  <div class="section-head">
    <p class="eyebrow">Servicios</p>
    <h2>Precios claros, sin sorpresas</h2>
  </div>
  <div class="menu">
    {#each CATEGORIES as cat (cat)}
      <div class="menu-col">
        <h3>{cat}</h3>
        <ul>
          {#each SERVICES.filter((s) => s.category === cat) as s (s.id)}
            <li>
              <a href="/reservar?servicio={s.id}" class="service">
                <span class="service-top">
                  <span class="service-name">{s.name}</span>
                  <span class="leader"></span>
                  <span class="price">{fmtPrice(s.price)}</span>
                </span>
                <span class="service-meta"><Icon name="clock" size={14} /> {fmtDuration(s.minutes)} · {s.description}</span>
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</section>

<section id="equipo" class="container section">
  <div class="section-head">
    <p class="eyebrow">Equipo</p>
    <h2>Manos que saben lo que hacen</h2>
  </div>
  <div class="team">
    {#each BARBERS as b (b.id)}
      <article class="card member">
        <div class="avatar" style="--c: {b.color}">
          <span>{b.name[0]}</span>
        </div>
        <h3>{b.name}</h3>
        <p class="role">{b.role}</p>
        <p class="muted">{b.specialty}</p>
        <p class="days">{b.days.length === 6 ? 'Lunes a sábado' : 'Martes a sábado'}</p>
        <a class="btn btn-ghost small" href="/reservar?barbero={b.id}">Reservar con {b.name}</a>
      </article>
    {/each}
  </div>
</section>

<section class="container section">
  <div class="steps">
    {#each STEPS as s, i (s.title)}
      <div class="step">
        <span class="step-n">0{i + 1}</span>
        <Icon name={s.icon} size={26} />
        <h3>{s.title}</h3>
        <p class="muted">{s.text}</p>
      </div>
    {/each}
  </div>
</section>

<section class="container section">
  <div class="section-head">
    <p class="eyebrow">Opiniones</p>
    <h2>Lo que dicen al salir</h2>
  </div>
  <div class="reviews">
    {#each REVIEWS as r (r.name)}
      <figure class="card review">
        <div class="stars" aria-label="5 de 5 estrellas">{#each [1, 2, 3, 4, 5] as n (n)}<Icon name="star" size={16} />{/each}</div>
        <blockquote>«{r.text}»</blockquote>
        <figcaption class="muted">{r.name}</figcaption>
      </figure>
    {/each}
  </div>
</section>

<section id="horario" class="container section where">
  <div>
    <p class="eyebrow">Horario y ubicación</p>
    <h2>Pásate cuando quieras.<br />Mejor con cita.</h2>
    <ul class="contact">
      <li><Icon name="pin" /> {BUSINESS.address}</li>
      <li><Icon name="phone" /> {BUSINESS.phone}</li>
    </ul>
  </div>
  <table class="card hours">
    <caption class="sr-only">Horario de apertura</caption>
    <tbody>
      {#each WEEK as d (d)}
        <tr class:today={today === d}>
          <th scope="row">{DAYS[d]}{#if today === d}<span class="today-tag">Hoy</span>{/if}</th>
          <td class:muted={!OPENING[d].length}>{ranges(d)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<section class="container">
  <div class="final">
    <div class="final-pole pole" aria-hidden="true"></div>
    <div class="final-body">
      <h2>¿Toca corte?</h2>
      <p class="muted">Elige hueco en un minuto. Si te surge algo, cancelas desde «Mis citas».</p>
    </div>
    <a class="btn btn-primary" href="/reservar">Reservar ahora <Icon name="arrow-right" size={18} /></a>
  </div>
</section>

<style>
  .hero { position: relative; padding: clamp(40px, 8vw, 96px) 0 64px; overflow: hidden; }
  .hero::before { content: ''; position: absolute; inset: -30% auto auto -20%; width: 720px; height: 720px; border-radius: 50%; background: radial-gradient(circle, rgb(212 162 76 / 0.16), transparent 60%); pointer-events: none; }
  .hero-grid { position: relative; display: grid; grid-template-columns: 1.15fr 1fr; gap: 48px; align-items: center; }
  h1 { font-size: clamp(46px, 7vw, 88px); }
  h1 em { color: var(--brass); font-style: italic; }
  .lead { max-width: 520px; margin: 24px 0 32px; font-size: 19px; color: var(--muted); }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .facts { list-style: none; display: flex; flex-wrap: wrap; gap: 12px 28px; margin: 36px 0 0; padding: 0; color: var(--muted); font-size: 15px; }
  .facts li { display: flex; align-items: center; gap: 8px; }
  .facts :global(svg) { color: var(--brass); }
  .facts b { color: var(--text); }

  .hero-art { position: relative; height: 460px; display: grid; place-items: center; }
  .pole-wrap { display: flex; flex-direction: column; align-items: center; }
  .cap { width: 110px; height: 26px; border-radius: 14px; background: linear-gradient(180deg, #e9c27a, #a87a2c); box-shadow: inset 0 -4px 0 rgb(0 0 0 / 0.2); }
  .big-pole { width: 84px; height: 340px; border-radius: 6px; box-shadow: inset -16px 0 24px rgb(0 0 0 / 0.35), inset 10px 0 18px rgb(255 255 255 / 0.25), var(--shadow); }
  .ticket { position: absolute; left: 0; top: 70px; display: flex; flex-direction: column; gap: 2px; padding: 16px 20px; box-shadow: var(--shadow); min-width: 210px; }
  .ticket-label { font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--brass); }
  .ticket strong { font-family: var(--serif); font-size: 22px; font-weight: 500; }
  .badge { position: absolute; right: 0; bottom: 70px; display: flex; align-items: center; gap: 10px; padding: 12px 18px; font-weight: 600; font-size: 14px; box-shadow: var(--shadow); min-width: 190px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--good); box-shadow: 0 0 0 4px rgb(74 222 128 / 0.2); }
  .dot.closed { background: var(--bad); box-shadow: 0 0 0 4px rgb(248 113 113 / 0.2); }

  .ribbon { overflow: hidden; border-block: 1px solid var(--border); background: var(--surface); }
  .ribbon-track { display: flex; width: max-content; animation: ribbon 40s linear infinite; }
  .ribbon span { display: flex; align-items: center; gap: 28px; padding: 18px 28px 18px 0; font-family: var(--serif); font-size: 22px; font-style: italic; white-space: nowrap; }
  .ribbon i { color: var(--brass); font-style: normal; font-size: 16px; }
  @keyframes ribbon { to { transform: translateX(-50%); } }

  .section { padding-top: clamp(72px, 10vw, 120px); }
  .section-head { margin-bottom: 40px; }
  h2 { font-size: clamp(34px, 5vw, 54px); }

  .menu { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; }
  .menu-col h3 { padding-bottom: 12px; margin-bottom: 8px; border-bottom: 1px solid var(--border); font-size: 26px; font-style: italic; color: var(--brass); }
  .menu ul { list-style: none; margin: 0; padding: 0; }
  .service { display: flex; flex-direction: column; gap: 4px; padding: 14px 10px; margin: 0 -10px; border-radius: 12px; text-decoration: none; transition: background 0.15s; }
  .service:hover { background: var(--surface); }
  .service-top { display: flex; align-items: baseline; gap: 10px; }
  .service-name { font-weight: 600; font-size: 17px; }
  .leader { flex: 1; border-bottom: 1px dotted var(--border); transform: translateY(-4px); }
  .price { font-family: var(--serif); font-size: 22px; color: var(--brass); }
  .service-meta { display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--muted); }

  .team { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .member { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 28px; }
  .avatar { display: grid; place-items: center; width: 84px; height: 84px; margin-bottom: 16px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--c) 70%, white), var(--c)); color: var(--bg); font-family: var(--serif); font-size: 40px; font-weight: 700; box-shadow: 0 0 0 4px var(--surface), 0 0 0 5px var(--border); }
  .member h3 { font-size: 30px; }
  .role { margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--brass); }
  .member .muted, .days { margin: 0; }
  .days { margin: 4px 0 18px; font-size: 14px; }
  .small { min-height: 42px; padding: 0 18px; font-size: 15px; }

  .steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; overflow: hidden; border: 1px solid var(--border); border-radius: var(--radius); background: var(--border); }
  .step { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 32px; background: var(--surface); }
  .step :global(svg) { color: var(--brass); }
  .step h3 { font-size: 24px; }
  .step p { margin: 0; }
  .step-n { position: absolute; top: 24px; right: 28px; font-family: var(--serif); font-size: 40px; color: var(--border); }

  .reviews { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
  .review { margin: 0; padding: 28px; display: flex; flex-direction: column; gap: 14px; }
  .stars { display: flex; gap: 2px; color: var(--brass); }
  .stars :global(svg) { fill: currentColor; }
  blockquote { margin: 0; font-family: var(--serif); font-size: 21px; line-height: 1.35; }

  .where { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
  .contact { list-style: none; margin: 28px 0 0; padding: 0; display: grid; gap: 12px; color: var(--muted); }
  .contact li { display: flex; align-items: center; gap: 12px; }
  .contact :global(svg) { color: var(--brass); }
  .hours { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; }
  .hours th, .hours td { padding: 16px 22px; border-bottom: 1px solid var(--border); text-align: left; }
  .hours tr:last-child th, .hours tr:last-child td { border-bottom: 0; }
  .hours th { font-weight: 600; }
  .hours td { text-align: right; font-variant-numeric: tabular-nums; }
  .hours tr.today { background: rgb(212 162 76 / 0.1); }
  .today-tag { margin-left: 10px; padding: 2px 8px; border-radius: 999px; background: var(--brass); color: var(--brass-ink); font-size: 11px; font-weight: 700; text-transform: uppercase; }

  .final { display: flex; align-items: center; gap: 28px; margin-top: clamp(72px, 10vw, 120px); padding: 32px; border: 1px solid var(--border); border-radius: 28px; background: linear-gradient(120deg, var(--surface-2), var(--surface)); }
  .final-pole { width: 18px; align-self: stretch; border-radius: 999px; }
  .final-body { flex: 1; }
  .final h2 { font-size: clamp(32px, 4vw, 46px); }
  .final p { margin: 6px 0 0; }

  @media (max-width: 960px) {
    .hero-grid, .where { grid-template-columns: 1fr; }
    .hero-art { height: 380px; }
    .big-pole { height: 260px; }
    .menu, .team, .reviews, .steps { grid-template-columns: 1fr; }
  }
  @media (max-width: 560px) {
    .ticket { top: 30px; min-width: 0; }
    .badge { bottom: 30px; min-width: 0; }
    .final { flex-direction: column; align-items: flex-start; }
    .final-pole { width: auto; height: 12px; align-self: stretch; }
  }
</style>
