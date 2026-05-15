// Patches the iOS Podfile so third-party RN modules that import React
// headers via `#import <React/...>` compile under `use_frameworks!`
// static linkage. Clang treats those imports as non-modular inside a
// framework module and errors out by default. We allow the non-modular
// include for a narrow allowlist of targets only.
//
// Without this, `expo run:ios` / EAS iOS build fails with:
//   include of non-modular header inside framework module
//   'RNFBApp.RCTConvert_FIRApp'

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ALLOWLIST_PREFIXES = ['RNFB'];
const ALLOWLIST_NAMES = [];

const PATCH = `
    # withFirebaseStaticFrameworks: allow non-modular React imports
    # inside whitelisted static frameworks (see
    # plugins/withFirebaseStaticFrameworks.js).
    runstamp_allowlist_prefixes = ${JSON.stringify(ALLOWLIST_PREFIXES)}
    runstamp_allowlist_names = ${JSON.stringify(ALLOWLIST_NAMES)}
    installer.pods_project.targets.each do |target|
      should_patch = runstamp_allowlist_prefixes.any? { |p| target.name.start_with?(p) } ||
                     runstamp_allowlist_names.include?(target.name)
      if should_patch
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end
`;

const withFirebaseStaticFrameworks = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile',
      );

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes('runstamp_allowlist_names')) {
        return config;
      }

      const postInstallRegex = /(post_install do \|installer\|)/;
      if (!postInstallRegex.test(contents)) {
        throw new Error(
          'withFirebaseStaticFrameworks: could not find post_install block in Podfile',
        );
      }

      contents = contents.replace(postInstallRegex, `$1${PATCH}`);
      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};

module.exports = withFirebaseStaticFrameworks;
