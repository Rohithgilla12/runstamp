const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withInstagramQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!manifest.queries) manifest.queries = [{}];
    if (!manifest.queries[0].package) manifest.queries[0].package = [];
    const pkgs = manifest.queries[0].package;
    if (!pkgs.find((p) => p.$ && p.$['android:name'] === 'com.instagram.android')) {
      pkgs.push({ $: { 'android:name': 'com.instagram.android' } });
    }
    return cfg;
  });
};
