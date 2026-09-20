const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Support .sql files for Drizzle migrations
config.resolver.sourceExts.push("sql");
// Support .wasm for sqlite web support
config.resolver.assetExts.push("wasm");

module.exports = withNativeWind(config, { input: "./global.css" });
