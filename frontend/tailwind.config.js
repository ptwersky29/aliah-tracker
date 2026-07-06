/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "'Heebo'", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "'Heebo'", "system-ui", "sans-serif"],
        hebrew: ["'Heebo'", "'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        // Page surfaces
        canvas: "#F7F8FA",
        surface: "#FFFFFF",
        surface2: "#F1F3F7",
        line: "#E4E7EC",
        line2: "#D0D5DD",

        // Ink (text)
        ink: {
          900: "#101828",
          700: "#344054",
          500: "#667085",
          400: "#98A2B3",
          300: "#D0D5DD",
        },

        // Brand — deep slate-navy
        brand: {
          50: "#EEF2F8",
          100: "#D9E2F0",
          500: "#3B5B8A",
          600: "#2A4574",
          700: "#1E3258",
          800: "#152340",
          900: "#0B1729",
        },

        // Accent — emerald
        emerald: {
          50: "#ECFDF5",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },

        // Warning — amber
        amber: {
          50: "#FFFBEB",
          500: "#F59E0B",
          600: "#D97706",
        },

        // Danger — red
        danger: {
          50: "#FEF2F2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },

        // shadcn aliases (kept for any UI primitives we may need)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.05)",
        cardLg: "0 4px 16px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)",
        ring: "0 0 0 4px rgba(42, 69, 116, 0.12)",
        pop: "0 12px 32px rgba(16, 24, 40, 0.12), 0 2px 6px rgba(16, 24, 40, 0.08)",
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      keyframes: {
        "fade-in": { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "slide-up": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
      animation: {
        "fade-in": "fade-in .25s ease-out both",
        "slide-up": "slide-up .35s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
