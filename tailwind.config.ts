import type { Config } from "tailwindcss";

/**
 * Design tokens for the shipped "Broadcast" theme (dark, neon-lime).
 * These mirror the prototype's theme.js → THEMES.broadcast object.
 * Colors are exposed as CSS variables in globals.css and referenced here
 * so you can retheme by swapping the :root variables alone.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        text: "var(--text)",
        dim: "var(--dim)",
        faint: "var(--faint)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        accent2: "var(--accent-2)",
        pos: "var(--pos)",
        neg: "var(--neg)",
        gold: "var(--gold)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
        sm: "12px",
      },
      maxWidth: {
        app: "1120px",
      },
      boxShadow: {
        card: "0 18px 40px rgba(0,0,0,0.35)",
        hero: "0 24px 60px rgba(0,0,0,0.45)",
      },
      keyframes: {
        pulse: {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "70%": { transform: "scale(2.6)", opacity: "0" },
          "100%": { transform: "scale(2.6)", opacity: "0" },
        },
        spin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "live-pulse": "pulse 1.6s ease-out infinite",
        "spin-slow": "spin 0.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
