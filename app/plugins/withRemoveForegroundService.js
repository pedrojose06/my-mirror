// Config plugin: remove permissões de Foreground Service que a expo-audio
// adiciona ao manifesto. O app só toca áudio (a narração) com a tela aberta —
// não usa reprodução em segundo plano — então essas permissões são
// desnecessárias e disparam exigências/rejeições no Play Console.
//
// Usa tools:node="remove" para que o mesclador de manifesto do Android tire as
// permissões trazidas por bibliotecas (não basta editar o manifesto do app).
const { withAndroidManifest } = require("@expo/config-plugins");

const PERMISSIONS_TO_REMOVE = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
];

module.exports = function withRemoveForegroundService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Garante o namespace tools (necessário para tools:node)
    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] =
      manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";

    manifest["uses-permission"] = manifest["uses-permission"] || [];

    for (const name of PERMISSIONS_TO_REMOVE) {
      // Remove qualquer declaração existente dessa permissão
      manifest["uses-permission"] = manifest["uses-permission"].filter(
        (p) => p?.$?.["android:name"] !== name
      );
      // Adiciona a diretiva de remoção (aplicada no merge com as libs)
      manifest["uses-permission"].push({
        $: { "android:name": name, "tools:node": "remove" },
      });
    }

    return cfg;
  });
};
