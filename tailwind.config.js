/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind preset যুক্ত করা হলো
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
    },
  },
  plugins: [],
}