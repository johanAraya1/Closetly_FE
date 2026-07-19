const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow .onnx and .ort files to be bundled as assets
config.resolver.assetExts.push('onnx', 'ort');

module.exports = config;
