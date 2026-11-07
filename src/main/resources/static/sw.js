// Service worker do PWA Pitbull Barber.
// - Telas e arquivos do app: abrem na hora a partir do cache e se atualizam em segundo plano.
// - API (/api/**), login Google e health: sempre direto na rede (dados nunca ficam velhos).
// - Sem internet: mostra a página offline.
const VERSAO = "pitbull-v2";
const SHELL = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/app/styles.css",
  "/app/main.js",
  "/app/api.js",
  "/app/ui.js",
  "/app/views/auth.js",
  "/app/views/inicio.js",
  "/app/views/agendar.js",
  "/app/views/admin.js",
  "/app/views/relatorio.js",
  "/imagens/logo.webp",
  "/imagens/fundo.webp",
  "/imagens/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSAO).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

const nuncaCachear = (url) =>
  url.origin !== self.location.origin ||
  url.pathname.startsWith("/api/") ||
  url.pathname.startsWith("/oauth2/") ||
  url.pathname.startsWith("/login/") ||
  url.pathname.startsWith("/actuator/") ||
  url.pathname.startsWith("/barbearia");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (nuncaCachear(url)) return;

  // Navegação (abrir o app): rede primeiro, cache se offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSAO).then((c) => c.put("/", copia));
          return res;
        })
        .catch(async () => (await caches.match("/")) || caches.match("/offline.html"))
    );
    return;
  }

  // Arquivos estáticos: responde do cache e atualiza em segundo plano (stale-while-revalidate).
  event.respondWith(
    caches.open(VERSAO).then(async (cache) => {
      const emCache = await cache.match(req);
      const daRede = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => emCache);
      return emCache || daRede;
    })
  );
});
