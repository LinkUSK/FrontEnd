// src/polyfills.js
// Fix "global is not defined" for SockJS/stompjs in Vite + Browser.
if (typeof window !== "undefined" && typeof window.global === "undefined") {
  window.global = window;
}
// (optional) minimal process shim to silence some libs
if (typeof window !== "undefined" && typeof window.process === "undefined") {
  window.process = { env: { NODE_ENV: import.meta?.env?.MODE || "development" } };
}
