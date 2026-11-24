// Service worker mínimo: permite instalar o app e mostra aviso quando estiver sem internet.
const OFFLINE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão</title><body style="font-family:system-ui;padding:40px 20px;text-align:center;color:#334155"><h1 style="font-size:20px">Sem internet</h1><p>O sistema precisa de conexão para mostrar os dados atualizados. Tente de novo em instantes.</p><button onclick="location.reload()" style="padding:10px 18px;border-radius:10px;border:0;background:#f8c80a;color:#0f123f;font-weight:600">Tentar de novo</button></body>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
