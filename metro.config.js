const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reduce file watching to prevent EMFILE errors
config.watchFolders = [];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Exclude unnecessary directories from watching
config.watchFolders = [__dirname];
config.resolver.blacklistRE = /(.*\/__tests__\/.*|.*\/node_modules\/.*\/node_modules\/.*)/;

// Limit the number of workers to reduce file handles
config.maxWorkers = 2;

module.exports = config;