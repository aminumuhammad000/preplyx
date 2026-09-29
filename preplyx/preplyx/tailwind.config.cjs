// tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4B0FA3",
        secondary: "#7B2FF7",
        background: "#F8F8FC",
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
      },
    },
  },
  plugins: [],
};
