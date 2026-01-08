const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('ogg');

// Add modules directory to watch folders for native module resolution
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, 'modules'),
];

// Ensure platform-specific extensions are properly resolved
config.resolver.sourceExts = [
  'web.tsx', 'web.ts', 'web.jsx', 'web.js',
  'tsx', 'ts', 'jsx', 'js', 'json'
];

// Add extra node_modules resolution for the modules directory
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, 'modules'),
];

// Add alias for modules directory
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'audio-effects': path.resolve(__dirname, 'modules/audio-effects'),
};

module.exports = config;
