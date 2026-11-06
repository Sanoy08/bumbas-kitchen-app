const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const { FileStore } = require("metro-cache");

const config = getDefaultConfig(__dirname);

// Persist Metro cache in .expo/metro-cache to prevent bundler cache rebuilds
config.cacheStores = [
  new FileStore({
    root: path.join(__dirname, '.expo', 'metro-cache'),
  }),
];

module.exports = withNativeWind(config, { input: "./global.css" });
