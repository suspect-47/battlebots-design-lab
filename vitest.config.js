import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // The React plugin supplies the automatic JSX runtime. Without it any test
  // that actually renders a component fails with "React is not defined", which
  // is why the older smoke tests only assert `typeof Component === 'function'`.
  // With it, components can be rendered through react-dom/server and a smoke
  // test catches the undefined dereferences it is supposed to catch.
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'server/**/*.test.js'],
  },
})
