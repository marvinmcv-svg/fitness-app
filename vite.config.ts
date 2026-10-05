import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run dev` serves the app; `npm run build:app` emits one self-contained
// HTML file (dist/index.html) that can be opened directly or published.
export default defineConfig({
  root: "app",
  plugins: [react(), viteSingleFile()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { outDir: "../dist", emptyOutDir: true },
});
