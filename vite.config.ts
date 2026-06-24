import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function getCommitHash() {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 7);
  }
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base: '/personalfinance/',
  plugins: [react()],
  define: {
    __APP_COMMIT__: JSON.stringify(getCommitHash()),
  },
});
