const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const { FileStore } = require("metro-cache");

const config = getDefaultConfig(__dirname);

const persistentStore = new FileStore({
  root: path.join(__dirname, '.expo', 'metro-cache'),
});

// Protect the persistent cache from being wiped on export
persistentStore.clear = () => {};

config.cacheStores = [persistentStore];
config.resetCache = false;

module.exports = withNativeWind(config, { input: "./global.css" });
