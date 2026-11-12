const {
  withSettingsGradle,
  withProjectBuildGradle,
  withAppBuildGradle,
} = require('@expo/config-plugins');

/**
 * Ensures React Native & Expo Gradle plugin resolution searches both the app workspace
 * and monorepo root node_modules (preventing `android/null` includeBuild errors under pnpm).
 */
function patchNodeResolveCalls(contents) {
  const monoPaths = `{ paths: [process.cwd(), '..', '../..', '../../..'] }`;
  return contents
    .replace(
      /\["node",\s*"--print",\s*"require\.resolve\('@react-native\/gradle-plugin\/package\.json'\)"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\)/g,
      `providers.exec { commandLine("node", "--print", "require.resolve('@react-native/gradle-plugin/package.json', ${monoPaths})") }.standardOutput.asText.get().trim()`
    )
    .replace(
      /require\.resolve\('(@react-native\/gradle-plugin\/package\.json)'\)/g,
      `require.resolve('$1', ${monoPaths})`
    )
    .replace(
      /require\.resolve\('(react-native\/package\.json)'\)/g,
      `require.resolve('$1', ${monoPaths})`
    )
    .replace(
      /require\.resolve\('(expo\/package\.json)'\)/g,
      `require.resolve('$1', ${monoPaths})`
    )
    .replace(
      /require\.resolve\('(expo-camera\/package\.json)'\)/g,
      `require.resolve('$1', ${monoPaths})`
    )
    .replace(
      /require\('(react-native\/package\.json)'\)/g,
      `require(require.resolve('$1', ${monoPaths}))`
    )
    .replace(
      /require\('(expo\/scripts\/resolveAppEntry)'\)/g,
      `require(require.resolve('$1', ${monoPaths}))`
    );
}

module.exports = function withMonorepoGradleFix(config) {
  config = withSettingsGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      cfg.modResults.contents = patchNodeResolveCalls(cfg.modResults.contents);
    }
    return cfg;
  });

  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      cfg.modResults.contents = patchNodeResolveCalls(cfg.modResults.contents);
    }
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      cfg.modResults.contents = patchNodeResolveCalls(cfg.modResults.contents);
    }
    return cfg;
  });

  return config;
};
