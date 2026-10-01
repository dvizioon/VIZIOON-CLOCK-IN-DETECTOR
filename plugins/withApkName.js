const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'outputFileName = "clock-in-detector.apk"';

const SNIPPET = `
android.applicationVariants.configureEach { variant ->
    variant.outputs.configureEach {
        outputFileName = "clock-in-detector.apk"
    }
}
`;

module.exports = function withApkName(config) {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(MARKER)) {
      config.modResults.contents += SNIPPET;
    }
    return config;
  });
};
