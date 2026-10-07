/** @type {import('tailwindcss').Config} */
export default {
  // Relative to this file, so builds work from any working directory.
  content: { relative: true, files: ['./index.html', './src/**/*.{js,jsx}'] },
  theme: {
    extend: {
      colors: {
        navy: { 950: '#0A1830', 900: '#0F2242', 800: '#182E52', 700: '#1F3A66' },
        gold: { 500: '#F0A93B', 600: '#DD9522', 100: '#FDF1DC' },
        ink: { 900: '#142238', 600: '#4B5568', 400: '#69727F' },
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        gurmukhi: ['Noto Sans Gurmukhi', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
