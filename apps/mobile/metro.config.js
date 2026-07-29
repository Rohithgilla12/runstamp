// Expo + pnpm monorepo metro config.
// Extends Expo's default `watchFolders` with the workspace root so changes in
// packages/ trigger reloads.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
];
// Local Expo module JS entry — native side autolinks; this teaches Metro
// where the TypeScript surface lives.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  'widget-bridge': path.resolve(projectRoot, 'modules/widget-bridge')
};

module.exports = config;
