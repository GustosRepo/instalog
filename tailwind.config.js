/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0B0D10',
        'dark-surface': '#141821',
        'text-primary': '#EDEEF0',
        'text-secondary': '#9AA0A6',
        'accent': '#6E6AF2',
      },
    },
  },
  plugins: [],
};
