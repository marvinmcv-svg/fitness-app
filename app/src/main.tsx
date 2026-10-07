import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support when installed from a real web address (not inside the claude.ai preview frame).
if (import.meta.env.PROD && "serviceWorker" in navigator && location.protocol === "https:" && window.top === window.self) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {
      /* offline mode unavailable; the app still works online */
    });
  });
}
