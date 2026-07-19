/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#eaf0f6', 2: '#aab6c6', 3: '#6b7788' },
        cyan: { hot: '#1fe3e8', deep: '#0a9ba0' },
        amber: { hot: '#ffab12', deep: '#b9760a' },
        magenta: { hot: '#ff2e6e', deep: '#b01048' },
        lime: { hot: '#46e88a' },
      },
      fontFamily: {
        display: ['Anton', 'Archivo', 'sans-serif'],
        ui: ['Antic Slab', 'Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
