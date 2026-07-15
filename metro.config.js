const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Habilita resolución de subpath exports (ej: onnxruntime-web/webgpu)
// Necesario para @huggingface/transformers que importa subpaths de onnxruntime-web
config.resolver.unstable_enablePackageExports = true;

// Configura resolución manual para onnxruntime-web subpath exports
// en caso de que unstable_enablePackageExports no sea suficiente
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Mapear subpath imports de onnxruntime-web a sus archivos reales
  // @huggingface/transformers importa "onnxruntime-web/webgpu"
  if (moduleName === 'onnxruntime-web/webgpu') {
    return {
      filePath: require.resolve('onnxruntime-web/dist/ort.webgpu.bundle.min.mjs'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'onnxruntime-common') {
    return {
      filePath: require.resolve('onnxruntime-common'),
      type: 'sourceFile',
    };
  }
  // Fallback al resolver por defecto
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
