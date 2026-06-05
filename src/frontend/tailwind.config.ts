/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sensor: {
          temp: "#D94F1E",
          vib: "#1A8A5A",
          flow: "#7040CC",
          pres: "#1060B8",
          alert: "#DC2626",
          paused: "#94A3B8",
        },
      },
    },
  },
  plugins: [],
};
