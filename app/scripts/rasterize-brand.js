// Converte os SVGs da identidade Luxai em PNGs prontos pro app.
// Uso: node scripts/rasterize-brand.js
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const BRAND = path.join(__dirname, "..", "assets", "brand");

async function main() {
  // Icon do app — 1024x1024 (Expo redimensiona)
  await sharp(path.join(BRAND, "isotipo.svg"))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(BRAND, "icon.png"));

  // Adaptive icon foreground — 1024x1024 (frame centralizado, fundo transparente)
  await sharp(path.join(BRAND, "adaptive-icon.svg"))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(BRAND, "adaptive-icon.png"));

  // Splash screen (React, tela cheia) — retrato cheio (1080x2340), composição completa
  await sharp(path.join(BRAND, "splash.svg"))
    .resize(1080, 2340)
    .png()
    .toFile(path.join(BRAND, "splash.png"));

  // Splash nativo (expo-splash-screen) — só o emblema centralizado (800x800)
  await sharp(path.join(BRAND, "splash-native.svg"))
    .resize(800, 800)
    .png()
    .toFile(path.join(BRAND, "splash-native.png"));

  // ISOLOGO pra header (tamanho menor, 800x320)
  await sharp(path.join(BRAND, "isologo.svg"))
    .resize(800, 320)
    .png()
    .toFile(path.join(BRAND, "isologo.png"));

  console.log("OK — assets gerados em", BRAND);
  for (const f of fs.readdirSync(BRAND)) {
    const s = fs.statSync(path.join(BRAND, f));
    console.log(`  ${f}: ${(s.size / 1024).toFixed(1)} KB`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
