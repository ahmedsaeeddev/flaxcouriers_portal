/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0A2342",
          light: "#123566",
          soft: "#16305A",
          deep: "#081b36",
        },
        brand: {
          yellow: "#F4C430",
          yellowDeep: "#DDA80E",
        },
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        dashmove: { to: { strokeDashoffset: "-200" } },
        fadeUp: {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        floaty: "floaty 5s ease-in-out infinite",
        dashmove: "dashmove 6s linear infinite",
        fadeUp: "fadeUp .45s ease both",
        shimmer: "shimmer 1.4s infinite",
      },
    },
  },
  plugins: [],
};
