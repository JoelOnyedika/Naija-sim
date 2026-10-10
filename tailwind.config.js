/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        naija: { DEFAULT: '#0B8F4D', deep: '#07603A', mint: '#7FE3B0' },
        danfo: { DEFAULT: '#FFC21A', deep: '#E5A400', soft: '#FFE9A6' },
        night: { DEFAULT: '#0A1512', 800: '#0F211C', 700: '#16302A', 600: '#1F4339' },
        hibiscus: '#FF4D6D',
        lagoon: '#19C3A6',
        sunset: '#FF8A3D',
        cement: { DEFAULT: '#EDE7DA', dark: '#DDD4C0' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.14)',
        pop: '0 10px 30px rgba(255,194,26,0.35)',
      },
    },
  },
  plugins: [],
};
