// 改咗任何 PWA 檔案之後，將 VERSION 加 1（index.html 嘅 APP_VERSION 都要改），手機先會攞新版本
const VERSION = "lifelog-v6";
const CORE = ["./", "./index.html", "./manifest.json", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  // cache: "reload" = 唔好用瀏覽器 HTTP cache 入面嘅舊檔案
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// 開 app（navigation）：有網就攞最新版，3 秒內攞唔到或者冇網就用 cache，所以離線都開到
function networkFirst(req) {
  const net = fetch(req, { cache: "no-cache" }).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); }
    return res;
  });
  const timeout = new Promise(resolve => setTimeout(resolve, 3000));
  return Promise.race([net, timeout])
    .then(res => res || caches.match("./index.html").then(hit => hit || net))
    .catch(() => caches.match("./index.html"));
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 唔好 cache 同步 server 嘅 API
  if (url.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") { e.respondWith(networkFirst(req)); return; }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
