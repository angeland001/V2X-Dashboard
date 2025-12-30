const webpack = require('webpack');
const path = require('path');

module.exports = function override(config) {
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    assert: require.resolve('assert'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
    util: require.resolve('util'),
    stream: require.resolve('stream-browserify'),
    crypto: false,
    fs: false,
    path: false,
  });
  config.resolve.fallback = fallback;

  // Add path aliases
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname, 'src'),
  };

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ]);

  // Ignore source map warnings from node_modules
  config.ignoreWarnings = [/Failed to parse source map/];

  // Fix for .cjs files being treated as static assets instead of modules
  // Find the rule that handles static assets and exclude .cjs files
  const oneOfRule = config.module.rules.find(rule => rule.oneOf);
  if (oneOfRule) {
    // Find the file-loader rule (usually the last one in oneOf)
    const fileLoaderRule = oneOfRule.oneOf.find(rule =>
      rule.type === 'asset/resource'
    );

    if (fileLoaderRule) {
      // Exclude .cjs files from being treated as static assets
      fileLoaderRule.exclude = fileLoaderRule.exclude
        ? [fileLoaderRule.exclude, /\.cjs$/]
        : /\.cjs$/;
    }

    // Add a rule to process .cjs files as JavaScript modules
    const babelLoaderRule = oneOfRule.oneOf.find(rule =>
      rule.loader && rule.loader.includes('babel-loader')
    );

    if (babelLoaderRule) {
      // Ensure .cjs files are processed by babel-loader
      if (babelLoaderRule.test instanceof RegExp) {
        // Modify the test regex to include .cjs files
        const originalTest = babelLoaderRule.test.source;
        babelLoaderRule.test = new RegExp(originalTest.replace('\\.(js|mjs|jsx|ts|tsx)', '\\.(js|mjs|jsx|ts|tsx|cjs)'));
      }
    }
  }

  return config;
};
