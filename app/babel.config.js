module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // VisionCamera v4 frame processors (deve vir antes do reanimated)
      "react-native-worklets-core/plugin",
      // reanimated 4 — precisa ser sempre o ÚLTIMO plugin
      "react-native-worklets/plugin",
    ],
  };
};
