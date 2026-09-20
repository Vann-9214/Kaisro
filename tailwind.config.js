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
        background: "#FAF7F2",
        surface: "#FFFFFF",
        "surface-raised": "#FFFFFF",
        overlay: "rgba(51, 49, 46, 0.4)",
        text: "#33312E",
        "text-muted": "#7A756D",
        border: "#E2DED7",
        primary: "#3A4A7A",
        tasks: "#6FA8A0",
        money: "#E8C99B",
        "on-primary": "#FFFFFF",
        "on-tasks": "#FFFFFF",
        "on-money": "#785B28",
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
        "space-md": "14px",
        "space-lg": "20px",
        "space-xl": "32px",
      },
    },
  },
  plugins: [],
};
