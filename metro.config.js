const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('react-native-get-random-values'),
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('buffer'),
};

// Block rpc-websockets — it has no iOS/RN exports and was crashing the app.
// @solana/web3.js is no longer imported but may still be traversed transitively.
const { blockList } = config.resolver;
const blockListRE = Array.isArray(blockList) ? blockList : blockList ? [blockList] : [];
config.resolver.blockList = [
  ...blockListRE,
  /node_modules\/rpc-websockets\/.*/,
];

module.exports = config;
