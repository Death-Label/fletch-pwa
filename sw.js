// Fletch PWA — service worker
// Estratégia: cache-first pro shell (index.html + icons + manifest).
// Dados dinâmicos (chamadas ao Supabase) vão sempre pela rede, mas o IndexedDB
// do próprio app guarda snapshots pra abrir offline instantaneamente.

const CACHE = "fletch-pwa-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Requisições ao Supabase: sempre rede. Se falhar, deixa o app tratar (IndexedDB local).
  if (url.hostname.endsWith(".supabase.co")) return;
  // Shell/estáticos: cache-first
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});
