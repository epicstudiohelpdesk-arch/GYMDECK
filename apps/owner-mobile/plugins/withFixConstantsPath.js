const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to ensure all Xcode build script phases properly quote
 * paths when the workspace contains spaces (e.g. 'GymDeck_Final copy').
 */
const withSpaceSafeBuildPhases = (config) => {
  // 1. Ensure Podfile post_install sanitizes EXConstants script phase
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf-8');
        const hookSignature = '# Sanitize EXConstants build phase to correctly handle project paths with spaces';
        if (!podfileContent.includes(hookSignature)) {
          const targetHook = `
    # Sanitize EXConstants build phase to correctly handle project paths with spaces
    installer.pods_project.targets.each do |target|
      if target.name == 'EXConstants'
        target.build_phases.each do |phase|
          if phase.respond_to?(:shell_script) && phase.name&.include?('Constants.manifest')
            phase.shell_script = <<~'SCRIPT'
              if [ "$BUNDLE_FORMAT" = "deep" ]; then
                RESOURCE_DEST="$CONFIGURATION_BUILD_DIR/EXConstants.bundle/Contents/Resources"
              else
                RESOURCE_DEST="$CONFIGURATION_BUILD_DIR/EXConstants.bundle"
              fi
              mkdir -p "$RESOURCE_DEST"
              "$PODS_TARGET_SRCROOT/../scripts/with-node.sh" "$PODS_TARGET_SRCROOT/../scripts/getAppConfig.js" "$PROJECT_DIR/../.." "$RESOURCE_DEST"
            SCRIPT
          end
        end
      end
    end
`;
          if (podfileContent.includes('post_install do |installer|')) {
            podfileContent = podfileContent.replace(
              'post_install do |installer|',
              `post_install do |installer|${targetHook}`
            );
            fs.writeFileSync(podfilePath, podfileContent);
          }
        }
      }
      return config;
    },
  ]);

  // 2. Ensure GymDeckOwner xcodeproj quotes react-native-xcode.sh execution
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const buildPhases = xcodeProject.hash.project.objects.PBXShellScriptBuildPhase || {};
    for (const key in buildPhases) {
      const phase = buildPhases[key];
      if (phase.name === '"Bundle React Native code and images"' || phase.name === 'Bundle React Native code and images') {
        if (phase.shellScript && phase.shellScript.includes('`"$NODE_BINARY"')) {
          phase.shellScript = phase.shellScript.replace(
            '`"$NODE_BINARY" --print "require(\\\'path\\\').dirname(require.resolve(\\\'react-native/package.json\\\')) + \\\'/scripts/react-native-xcode.sh\\\'"`',
            'bash "$("$NODE_BINARY" --print "require(\\\'path\\\').dirname(require.resolve(\\\'react-native/package.json\\\')) + \\\'/scripts/react-native-xcode.sh\\\'")"'
          );
        }
      }
    }
    return config;
  });

  return config;
};

module.exports = withSpaceSafeBuildPhases;
