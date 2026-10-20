import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  // No GitHub Pages o site fica em https://pacheco-15.github.io/fichas-5e/ (build e `npm run preview`);
  // no `npm run dev`, na raiz.
  base: command === 'build' || isPreview ? '/fichas-5e/' : '/',
}))
