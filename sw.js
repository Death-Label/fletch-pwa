// Fletch PWA — service worker
// Estratégia: network-first pro shell (index.html + estáticos) com fallback pro cache.
// Isso garante que atualizações do PWA se propagam automaticamente pra clientes
// já instalados no celular (a versão v1 do cache anterior era cache-first e nunca
// deixava chegar novas versões — bug que travou o rollout da feature TCGdex).
// Dados dinâmicos (chamadas ao Supabase) vão sempre pela rede.

const CACHE = "fletch-pwa-v4";
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
  // Shell/estáticos: network-first (se online, sempre serve versão atual;
  // atualiza cache em background). Se offline, cai no cache. Isso garante que
  // updates do PWA são visíveis no próximo refresh sem precisar limpar dados.
  e.respondWith(
    fetch(e.request).then((response) => {
      // Só cacheia respostas OK (evita cachear 404 ou erro do server)
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
      }
      return response;
    }).catch(() => caches.match(e.request))
  );
});

