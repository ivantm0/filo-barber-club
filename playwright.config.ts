import { defineConfig, devices } from '@playwright/test';

// Se prueba el build de producción
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5221', locale: 'es-ES', timezoneId: 'Europe/Madrid', acceptDownloads: true },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 5221 --strictPort',
    url: 'http://localhost:5221',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
