const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch both project and workspace root for monorepo pnpm symlinks
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from local project first, then monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Pin critical packages to local member-mobile versions to prevent version bleeding
config.resolver.extraNodeModules = {
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
};

// 4. Enable pnpm symlinks and package exports resolution
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// 5. Block non-mobile directories & incompatible parent packages
config.resolver.blockList = [
  /.*\/src-tauri\/.*/,
  /.*\/target\/.*/,
  /.*\/node_modules\/\.pnpm\/react-native@0\.86\..*/,
];

module.exports = config;
