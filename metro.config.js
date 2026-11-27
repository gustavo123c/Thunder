const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// 3D body models (assets/models/*.glb) are bundled as assets.
config.resolver.assetExts.push('glb');

// three's CommonJS entry (picked by require('three') in @react-three/fiber/native) calls
// Node's process.emitWarning, which React Native lacks: always use the ES module build.
const threeModule = path.resolve(__dirname, 'node_modules/three/build/three.module.js');
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') return { type: 'sourceFile', filePath: threeModule };
  return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
