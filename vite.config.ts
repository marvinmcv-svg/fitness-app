import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run dev` serves the app. Builds emit one self-contained HTML file:
// `npm run build:app` puts it at dist/app/ (served at /app/ next to the landing
// page at /), and `npm run build:artifact` at dist/index.html for the preview.
export default defineConfig({
  root: "app",
  plugins: [react(), viteSingleFile()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { outDir: "../dist", emptyOutDir: true },
});
