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
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline mode unavailable; the app still works online */
    });
  });
}
