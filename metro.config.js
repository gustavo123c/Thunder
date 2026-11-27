const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// 3D body models (assets/models/*.glb) are bundled as assets.
config.resolver.assetExts.push('glb');

module.exports = withNativeWind(config, { input: './global.css' });
