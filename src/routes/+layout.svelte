<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { bookings } from '$lib/bookings.svelte';
  import { BUSINESS } from '$lib/data';
  import Icon from '$lib/components/Icon.svelte';

  let { children } = $props();
  let menuOpen = $state(false);
  let scrolled = $state(false);

  onMount(() => {
    bookings.init();
    const onScroll = () => (scrolled = window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

  const links = [
    { href: '/#servicios', label: 'Servicios' },
    { href: '/#equipo', label: 'Equipo' },
    { href: '/#horario', label: 'Horario' },
    { href: '/mis-citas', label: 'Mis citas' },
  ];

  const isBooking = $derived(page.url.pathname.startsWith('/reservar'));
</script>

<a class="skip" href="#main">Saltar al contenido</a>

<header class:scrolled>
  <div class="container bar">
    <a href="/" class="brand" aria-label="{BUSINESS.fullName}, inicio">
      <span class="logo pole" aria-hidden="true"></span>
      <span>Filo<em>Barber Club</em></span>
    </a>

    <nav class:open={menuOpen} aria-label="Principal">
      {#each links as l (l.href)}
        <a href={l.href} onclick={() => (menuOpen = false)} aria-current={page.url.pathname === l.href ? 'page' : undefined}>{l.label}</a>
      {/each}
      <a href="/panel" class="panel-link" onclick={() => (menuOpen = false)}>Panel</a>
    </nav>

    {#if !isBooking}
      <a href="/reservar" class="btn btn-primary cta">Reservar cita</a>
    {/if}
    <button type="button" class="menu-btn" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>
      <Icon name={menuOpen ? 'x' : 'menu'} />
    </button>
  </div>
</header>

<main id="main" tabindex="-1">
  {@render children()}
</main>

<footer>
  <div class="container foot">
    <div>
      <p class="foot-brand">{BUSINESS.fullName}</p>
      <p class="muted">{BUSINESS.address}<br />{BUSINESS.phone} · {BUSINESS.email}</p>
    </div>
    <p class="muted small">
      Filo es una barbería ficticia: proyecto de portfolio de
      <a href="https://ivanterol.com" rel="noopener">Iván Terol</a>. Las reservas solo se guardan en tu navegador.
    </p>
  </div>
</footer>

<style>
  .skip { position: fixed; left: 16px; top: -60px; z-index: 100; padding: 10px 16px; border-radius: 12px; background: var(--brass); color: var(--brass-ink); font-weight: 700; }
  .skip:focus { top: 12px; }

  header { position: sticky; top: 0; z-index: 40; border-bottom: 1px solid transparent; transition: background 0.25s, border-color 0.25s; }
  header.scrolled { background: rgb(15 13 11 / 0.85); border-color: var(--border); backdrop-filter: blur(14px); }
  .bar { display: flex; align-items: center; gap: 20px; height: 76px; }

  .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; font-family: var(--serif); font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
  .brand em { display: block; margin-top: -6px; font: 600 10px var(--sans); letter-spacing: 0.3em; text-transform: uppercase; color: var(--brass); font-style: normal; }
  .logo { width: 14px; height: 40px; border-radius: 999px; box-shadow: 0 0 0 3px var(--surface-2), 0 0 0 4px var(--border); }

  nav { display: flex; gap: 4px; margin-left: auto; }
  nav a { padding: 8px 14px; border-radius: 999px; color: var(--muted); font-weight: 500; font-size: 15px; text-decoration: none; transition: color 0.15s; }
  nav a:hover, nav a[aria-current='page'] { color: var(--text); }
  .panel-link { border: 1px dashed var(--border); }
  .cta { min-height: 44px; padding: 0 20px; font-size: 15px; }
  .menu-btn { display: none; place-items: center; width: 44px; height: 44px; border: 1px solid var(--border); border-radius: 50%; background: none; color: var(--text); cursor: pointer; }

  main { outline: none; min-height: 60vh; }

  footer { margin-top: 80px; border-top: 1px solid var(--border); padding: 40px 0; }
  .foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 24px; }
  .foot p { margin: 0; }
  .foot-brand { font-family: var(--serif); font-size: 22px; margin-bottom: 6px !important; }
  .small { max-width: 420px; font-size: 14px; }

  @media (max-width: 860px) {
    .menu-btn { display: grid; margin-left: auto; }
    .cta + .menu-btn { margin-left: 0; }
    .cta { margin-left: auto; padding: 0 16px; }
    nav {
      position: fixed;
      inset: 76px 0 auto 0;
      flex-direction: column;
      gap: 0;
      margin: 0;
      padding: 12px 16px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--bg);
      transform: translateY(-120%);
      transition: transform 0.25s ease;
    }
    nav.open { transform: none; }
    nav a { padding: 14px 8px; font-size: 18px; border-radius: 10px; }
    .panel-link { border: 0; }
  }
  @media (max-width: 420px) {
    .brand em { display: none; }
    .cta { font-size: 14px; padding: 0 14px; }
  }
</style>
