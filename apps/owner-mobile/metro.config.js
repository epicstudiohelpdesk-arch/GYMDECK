const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Ensure Metro watches the workspace root if needed, but ignores Tauri and build artifacts
config.watchFolders = [projectRoot];

// Block watching src-tauri, target, and backend build directories
config.resolver.blockList = [
  /.*\/src-tauri\/.*/,
  /.*\/target\/.*/,
  /.*\/dist\/.*/,
];

module.exports = config;
