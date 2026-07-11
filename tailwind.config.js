/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#e11d48",
        background: "#ffffff",
      },
      // ★ Font Family যুক্ত করা হলো
      fontFamily: {
        sans: ['Poppins_400Regular', 'sans-serif'],
        medium: ['Poppins_500Medium', 'sans-serif'],
        semibold: ['Poppins_600SemiBold', 'sans-serif'],
        bold: ['Poppins_700Bold', 'sans-serif'],
      }
    },
  },
  plugins: [],
}