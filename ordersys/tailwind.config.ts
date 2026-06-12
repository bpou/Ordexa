import type { Config } from "tailwindcss";
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // eller anpassa efter ditt projekt
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        16: 'repeat(16, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
}

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./src/pages/**/*.{ts,tsx}",
    "./**/*.mdx",
  ],
  darkMode: "class",
  theme: {
    boxShadow: {
      soft: "0 1px 2px 0 rgb(15 23 42 / 0.06), 0 1px 1px -1px rgb(15 23 42 / 0.10)",
    },
    borderRadius: {
      xl2: "1.25rem",
    },
    animation: {
      shimmer: "shimmer 1.5s ease-in-out infinite",
      "shimmer-pill": "shimmer-pill 1.5s ease-in-out infinite",
    },
    keyframes: {
      shimmer: {
        "0%": { transform: "translateX(-100%)" },
        "100%": { transform: "translateX(100%)" },
      },
      "shimmer-pill": {
        "0%": {
          transform: "translateX(-100%) rotate(45deg)",
          opacity: 0,
        },
        "50%": {
          opacity: 1,
        },
        "100%": {
          transform: "translateX(200%) rotate(45deg)",
          opacity: 0,
        },
      },
    },
  },
  plugins: [],

  
} satisfies Config;
