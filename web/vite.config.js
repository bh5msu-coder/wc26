import { defineConfig } from "vite";

// Static, zero-runtime-dependency build. The Monte-Carlo simulation runs in an
// ES-module Web Worker (worker.format 'es'); `base: ''` keeps every asset path
// relative so the built site works from any Vercel path and from `vite preview`.
export default defineConfig({
  base: "",
  build: { target: "esnext", outDir: "dist" },
  worker: { format: "es" },
  test: {
    include: ["tests/**/*.test.js", "src/**/*.test.js"],
    environment: "node",
  },
});
