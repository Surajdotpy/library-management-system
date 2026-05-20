import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const IPV4_HOSTNAME_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function validateProductionApiBaseUrl(mode: string): void {
  if (mode === 'development') {
    return;
  }

  const env = loadEnv(mode, __dirname, '');
  const configuredApiBaseUrl = env.VITE_API_BASE_URL?.trim();

  if (!configuredApiBaseUrl) {
    throw new Error(
      'VITE_API_BASE_URL is required for non-development builds. Rebuild after setting a production API URL.'
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(configuredApiBaseUrl);
  } catch {
    throw new Error(`VITE_API_BASE_URL must be a valid URL. Received: ${configuredApiBaseUrl}`);
  }

  if (parsedUrl.protocol === 'https:' && IPV4_HOSTNAME_PATTERN.test(parsedUrl.hostname)) {
    throw new Error(
      'VITE_API_BASE_URL cannot use a raw IP over HTTPS. Use the production domain instead so Electron can validate the TLS certificate.'
    );
  }
}

export default defineConfig(({ mode }) => {
  validateProductionApiBaseUrl(mode);

  return {
    plugins: [react(), tailwindcss()],
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
