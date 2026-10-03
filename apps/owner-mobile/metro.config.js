const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch both project and workspace root for monorepo pnpm symlinks
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from both local and monorepo node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Enable package exports resolution
config.resolver.unstable_enablePackageExports = true;

// 4. Block non-mobile directories
config.resolver.blockList = [
  /.*\/src-tauri\/.*/,
  /.*\/target\/.*/,
];

module.exports = config;
