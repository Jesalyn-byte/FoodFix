const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withReleaseSigning(config) {
  const appVersion = config.version || '4.0.0';
  const androidConfig = config.android || {};
  const versionCode = androidConfig.versionCode || 53;

  config = withProjectBuildGradle(config, (projConfig) => {
    if (projConfig.modResults.contents) {
      let contents = projConfig.modResults.contents;
      contents = contents.replace(/compileSdkVersion\s*=\s*\d+/, 'compileSdkVersion = 35');
      contents = contents.replace(/targetSdkVersion\s*=\s*\d+/, 'targetSdkVersion = 35');
      contents = contents.replace(/buildToolsVersion\s*=\s*"[^"]+"/, 'buildToolsVersion = "35.0.0"');
      if (contents.includes('ndkVersion')) {
        contents = contents.replace(/ndkVersion\s*=\s*"[^"]+"/, 'ndkVersion = "27.1.12297006"');
      } else {
        contents = contents.replace(/(ext\s*\{)/, '$1\n    ndkVersion = "27.1.12297006"');
      }
      projConfig.modResults.contents = contents;
    }
    return projConfig;
  });

  return withAppBuildGradle(config, (appConfig) => {
    if (appConfig.modResults.contents) {
      let contents = appConfig.modResults.contents;

      // Add release signingConfig if not already defined
      if (!contents.match(/signingConfigs\s*\{[\s\S]*?release\s*\{/)) {
        contents = contents.replace(
          /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\n\s*\})/,
          `$1\n        release {\n            storeFile file('debug.keystore')\n            storePassword 'android'\n            keyAlias 'androiddebugkey'\n            keyPassword 'android'\n            v1SigningEnabled true\n            v2SigningEnabled true\n        }`
        );
      }

      // Fix signingConfig from debug to release
      contents = contents.replace(
        /(release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/,
        '$1signingConfigs.release'
      );

      // Update versionCode
      contents = contents.replace(
        /(versionCode\s+)\d+/,
        `$1${versionCode}`
      );

      // Update versionName
      contents = contents.replace(
        /(versionName\s+)"[^"]+"/,
        `$1"${appVersion}"`
      );

      appConfig.modResults.contents = contents;
    }
    return appConfig;
  });
};
