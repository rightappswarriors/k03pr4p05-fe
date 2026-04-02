const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)
 
config.resolver.unstable_enablePackageExports = false;

// Exclude react-native-maps for web platform
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName.includes('react-native-maps') || moduleName === '../Utilities/Platform' || moduleName === './PlatformColorValueTypes' || moduleName.includes('ReactNativePrivateInterface') || moduleName.includes('ReactNativeViewConfigRegistry') || moduleName.includes('createReactNativeComponentClass') || moduleName.includes('requireNativeComponent') || moduleName.includes('codegenNativeComponent') || moduleName.includes('react-native-external-display')) {
      return { type: 'empty' };
    }
  }
  return context.resolveRequest ? context.resolveRequest(context, moduleName, platform) : null;
};

module.exports = withNativeWind(config, { input: './global.css' })