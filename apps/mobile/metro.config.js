const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// 1. Only watch directories needed for the mobile app and @medsync/core
config.watchFolders = [
  projectRoot,
  path.resolve(monorepoRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'packages/core'),
];

// 2. Resolve module paths for both project-level and workspace-level node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Prevent duplicate instances of React, React Native, and SVG native views
const singletons = [
  'react',
  'react-native',
  'react-native-svg',
  'react-native-reanimated',
  'react-native-screens',
  'react-native-safe-area-context',
  'react-native-gesture-handler',
  '@react-native-community/netinfo',
];

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const pkg of singletons) {
    if (moduleName === pkg || moduleName.startsWith(pkg + '/')) {
      return context.resolveRequest(
        context,
        path.resolve(projectRoot, 'node_modules', moduleName),
        platform
      );
    }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// 3. Blocklist unnecessary or restricted directories from Metro's file crawler
config.resolver.blockList = [
  /.*node_modules_old.*/,
  /.*\.venv.*/,
  /.*\.git.*/,
];

module.exports = config;
