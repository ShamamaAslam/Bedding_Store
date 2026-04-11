/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 24px 80px rgba(0, 0, 0, 0.35)'
      },
      backgroundImage: {
        'hero-sheen': 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0))'
      }
    }
  },
  plugins: []
};