/*
 * Serviço de apoio do aplicativo AFIM.
 *  - Guarda só arquivos visuais imutáveis (JS/CSS/fontes/ícones) para abrir mais rápido.
 *  - NUNCA guarda páginas, dados, APIs nem arquivos do cliente: tudo o que é financeiro vem sempre do servidor
 *    (assim nada sensível fica no aparelho e, depois de sair, ninguém vê dados antigos).
 *  - Sem internet, mostra uma página simples de "sem conexão".
 */
const VERSAO = "afim-v1";
const ESTATICOS = `${VERSAO}-estaticos`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(ESTATICOS)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => !c.startsWith(VERSAO)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return; // envios de formulário e ações vão direto ao servidor
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  // Navegação entre páginas: sempre da rede; sem internet, a página de "sem conexão".
  if (pedido.mode === "navigate") {
    evento.respondWith(fetch(pedido).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Arquivos visuais imutáveis: do cache primeiro (o nome muda a cada versão do sistema).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    evento.respondWith(
      caches.open(ESTATICOS).then(async (cache) => {
        const guardado = await cache.match(pedido);
        if (guardado) return guardado;
        const resposta = await fetch(pedido);
        if (resposta.ok) cache.put(pedido, resposta.clone());
        return resposta;
      }),
    );
  }
  // Todo o resto (APIs, dados, arquivos enviados): direto da rede, sem guardar nada.
});
