// Reaplica os ajustes da react-native-vision-camera v4.7.x para compatibilidade
// com React Native 0.81 (Expo SDK 54). Roda automaticamente no postinstall.
// Idempotente: só altera se ainda não estiver corrigido.
const fs = require("fs");
const path = require("path");

const base = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-vision-camera",
  "android",
  "src",
  "main",
  "java",
  "com",
  "mrousavy",
  "camera",
  "react"
);

function patch(file, find, replace, label) {
  const p = path.join(base, file);
  if (!fs.existsSync(p)) {
    console.log(`[patch-vision-camera] ${file} não encontrado, pulando.`);
    return;
  }
  let src = fs.readFileSync(p, "utf8");
  if (src.includes(replace)) {
    console.log(`[patch-vision-camera] ${label}: já aplicado.`);
    return;
  }
  if (!src.includes(find)) {
    console.log(`[patch-vision-camera] ${label}: trecho alvo não encontrado (versão mudou?).`);
    return;
  }
  src = src.replace(find, replace);
  fs.writeFileSync(p, src, "utf8");
  console.log(`[patch-vision-camera] ${label}: aplicado.`);
}

// 1) RN 0.81: getExportedCustomDirectEventTypeConstants deve retornar MutableMap
patch(
  "CameraViewManager.kt",
  '.put(AverageFpsChangedEvent.EVENT_NAME, MapBuilder.of("registrationName", "onAverageFpsChanged"))\n      .build()',
  '.put(AverageFpsChangedEvent.EVENT_NAME, MapBuilder.of("registrationName", "onAverageFpsChanged"))\n      .build()\n      .toMutableMap()',
  "CameraViewManager.toMutableMap"
);

// 2) RN 0.81: 'currentActivity' precisa vir de reactApplicationContext
patch(
  "CameraViewModule.kt",
  "val activity = currentActivity as? PermissionAwareActivity",
  "val activity = reactApplicationContext.currentActivity as? PermissionAwareActivity",
  "CameraViewModule.currentActivity"
);
