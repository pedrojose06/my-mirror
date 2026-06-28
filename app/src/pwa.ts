// Setup do PWA em runtime. O output web é "single" (SPA), que não usa +html.tsx,
// então injetamos o link do manifest, o theme-color e registramos o service
// worker aqui. No-op fora do navegador (nativo/SSR) via guarda de `document`.
// ponytail: injeção em runtime em vez de +html.tsx — Chrome relê o manifest
// após o load, então instalabilidade funciona normalmente.
export function setupPWA(): void {
  if (typeof document === "undefined") return;

  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/manifest.json";
    document.head.appendChild(link);
  }

  if (!document.querySelector('meta[name="theme-color"]')) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", "#7d28cf");
    document.head.appendChild(meta);
  }

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}
