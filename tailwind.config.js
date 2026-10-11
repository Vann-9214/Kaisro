/** @type {import('tailwindcss').Config} */
module.exports = {
  // Configured with 'class' dark mode to support manual switching (System / Light / Dark)
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "background": "rgb(var(--color-background) / <alpha-value>)",
        "surface": "rgb(var(--color-surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--color-surface-raised) / <alpha-value>)",
        "overlay": "var(--color-overlay)",
        "text": "rgb(var(--color-text) / <alpha-value>)",
        "text-muted": "rgb(var(--color-text-muted) / <alpha-value>)",
        "border": "rgb(var(--color-border) / <alpha-value>)",
        "primary": "rgb(var(--color-primary) / <alpha-value>)",
        "tasks": "rgb(var(--color-tasks) / <alpha-value>)",
        "money": "rgb(var(--color-money) / <alpha-value>)",
        "on-primary": "rgb(var(--color-on-primary) / <alpha-value>)",
        "on-tasks": "rgb(var(--color-on-tasks) / <alpha-value>)",
        "on-money": "rgb(var(--color-on-money) / <alpha-value>)",
        "error": "rgb(var(--color-error) / <alpha-value>)",
        "on-error": "rgb(var(--color-on-error) / <alpha-value>)"
},
      fontFamily: {
        sans: ["Inter_400Regular", "Inter", "sans-serif"],
        medium: ["Inter_500Medium", "Inter", "sans-serif"],
        semibold: ["Inter_600SemiBold", "Inter", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        full: "9999px",
      },
      spacing: {
        "space-xs": "4px",
        "space-sm": "8px",
        "card-gap": "12px",
        "space-md": "14px",
        "space-base": "16px",
        "space-lg": "20px",
        "space-xl": "24px",
        "space-2xl": "32px",
      },
    },
  },
  plugins: [],
};
