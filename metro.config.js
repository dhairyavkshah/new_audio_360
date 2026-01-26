const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

let wrapWithAudioAPIMetroConfig;
try {
  wrapWithAudioAPIMetroConfig = require('react-native-audio-api/metro-config').wrapWithAudioAPIMetroConfig;
} catch (e) {
  wrapWithAudioAPIMetroConfig = (config) => config;
}

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('ogg');

config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, 'modules'),
];

config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, 'modules'),
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'audio-effects': path.resolve(__dirname, 'modules/audio-effects'),
};

module.exports = wrapWithAudioAPIMetroConfig(config);
