<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status} · Filo Barber Club</title>
</svelte:head>

<div class="container err">
  <p class="eyebrow">Error {page.status}</p>
  <h1>{page.status === 404 ? 'Esta página se ha ido a cortarse el pelo' : 'Algo ha ido mal'}</h1>
  <a class="btn btn-primary" href="/">Volver al inicio</a>
</div>

<style>
  .err { padding: 100px 0; display: flex; flex-direction: column; align-items: flex-start; gap: 20px; }
  h1 { font-size: clamp(36px, 6vw, 60px); }
</style>
