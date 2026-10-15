import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import svgr from '@svgr/rollup';

const projectDirectory = dirname(fileURLToPath(import.meta.url));
const apiPrefixes = [
  '^/api(?:/|$)',
  '^/auth/(?:login|register|logout)(?:$|\\?)',
  '^/users(?:/|$)',
  '^/daily-reviews(?:/|$|\\?)',
  '^/projects(?:/|$|\\?)',
  '^/finance(?:/|$)',
  '^/mail(?:/|$|\\?)',
  '^/ai(?:/|$)',
  '^/dashboard(?:/|$)',
];

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, projectDirectory, '');
  const target = environment.API_PROXY_TARGET || 'http://127.0.0.1:8080';
  const proxy = Object.fromEntries(
    apiPrefixes.map((prefix) => [prefix, { target, changeOrigin: true }]),
  );

  return {
    server: { proxy, strictPort: true },
    resolve: {
      alias: {
        react: resolve(projectDirectory, 'node_modules/react'),
        'react-dom': resolve(projectDirectory, 'node_modules/react-dom'),
        src: resolve(projectDirectory, 'src'),
        '@': resolve(projectDirectory, 'src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    plugins: [svgr(), react()],
  };
});
