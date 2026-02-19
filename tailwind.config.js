/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vermelho: { DEFAULT: '#dc2626', light: '#fef2f2', dark: '#991b1b' },
        branco:   { DEFAULT: '#1d4ed8', light: '#eff6ff', dark: '#1e3a8a' },
        jefferson:{ DEFAULT: '#059669', light: '#ecfdf5', dark: '#065f46' },
      },
    },
  },
  plugins: [],
}

