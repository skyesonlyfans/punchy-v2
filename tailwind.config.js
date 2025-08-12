/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['Fira Code', 'Source Code Pro', 'monospace'],
      },
      colors: {
        'accent': '#00ff00', // A neon green for interactive elements
      }
    },
  },
  plugins: [],
}
