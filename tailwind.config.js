/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#EAEAEA',
        'primary-focus': '#FFFFFF',
        'light-bg': '#f7f8fa',
        'dark-bg': '#101010',
        'dark-sidebar': '#171717',
        'dark-card': '#212121',
        'dark-border': '#2D2D2D',
        'text-primary': '#EAEAEA',
        'text-secondary': '#A7A7A7',
        'text-tertiary': '#6F6F6F',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'input': '0 0 40px -15px rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
}
