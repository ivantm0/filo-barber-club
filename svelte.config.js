import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Web estática: la landing se pre-renderiza y la reserva funciona en el navegador
    adapter: adapter({ fallback: '404.html' }),
    prerender: { handleHttpError: 'fail' },
  },
};
