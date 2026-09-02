const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch both project and workspace root for monorepo pnpm symlinks
config.watchFolders = [monorepoRoot];

// 2. Resolve modules from both local and monorepo node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Block non-mobile directories like src-tauri and target
config.resolver.blockList = [
  /.*\/src-tauri\/.*/,
  /.*\/target\/.*/,
];

module.exports = config;
