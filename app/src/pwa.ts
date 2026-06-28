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

  // iOS/Safari ignora o manifest para "Adicionar à Tela de Início" — precisa
  // destas meta/link tags para abrir em standalone com ícone próprio.
  const appleTags: Array<[string, string]> = [
    ["meta:apple-mobile-web-app-capable", "yes"],
    ["meta:apple-mobile-web-app-status-bar-style", "black-translucent"],
    ["meta:apple-mobile-web-app-title", "Luxai"],
    ["link:apple-touch-icon", "/icon-192.png"],
  ];
  for (const [spec, value] of appleTags) {
    const [tag, name] = spec.split(":");
    const sel = tag === "link" ? `link[rel="${name}"]` : `meta[name="${name}"]`;
    if (document.querySelector(sel)) continue;
    const el = document.createElement(tag);
    if (tag === "link") {
      el.setAttribute("rel", name);
      el.setAttribute("href", value);
    } else {
      el.setAttribute("name", name);
      el.setAttribute("content", value);
    }
    document.head.appendChild(el);
  }

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}
