// Load configuration from environment or config file
const path = require('path');

// Environment variable overrides
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === 'true',
};

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      
      // Disable hot reload completely if environment variable is set
      if (config.disableHotReload) {
        // Remove hot reload related plugins
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
        });
        
        // Disable watch mode
        webpackConfig.watch = false;
        webpackConfig.watchOptions = {
          ignored: /.*/, // Ignore all files
        };
      }
      
      // Add webpack polyfills for Node.js modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "fs": false,
        "path": require.resolve("path-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "url": require.resolve("url"),
        "buffer": require.resolve("buffer"),
        "util": require.resolve("util"),
        "tty": false,
        "child_process": false,
        "readline": false,
        "zlib": require.resolve("browserify-zlib"),
        "querystring": require.resolve("querystring-es3"),
        "process": require.resolve("process/browser"),
        "vm": require.resolve("vm-browserify"),
        "constants": require.resolve("constants-browserify"),
        "domain": require.resolve("domain-browser"),
        "events": require.resolve("events"),
        "net": false,
        "dgram": false,
        "cluster": false,
        "module": false,
        "timers": require.resolve("timers-browserify"),
        "string_decoder": require.resolve("string_decoder"),
        "punycode": require.resolve("punycode")
      };
      
      return webpackConfig;
    },
  },
};
