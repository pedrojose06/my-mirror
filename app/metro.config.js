const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Permite empacotar modelos TensorFlow Lite (.tflite) como assets
config.resolver.assetExts.push("tflite");

module.exports = config;
