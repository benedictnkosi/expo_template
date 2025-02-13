export default {
  name: 'exam-quiz',
  slug: 'exam-quiz',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'examquiz',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'za.co.examquiz',
    buildNumber: '1.0.0',
    deploymentTarget: "15.1",
    googleServicesFile: './GoogleService-Info.plist'
  },
  android: {
    package: 'za.co.examquiz',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
      googleServicesFile: './google-services.json'
    }
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png'
  },
  plugins: [
    'expo-router',
    '@react-native-google-signin/google-signin',
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: "34.0.0"
        },
        ios: {
          deploymentTarget: "15.1"
        }
      }
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff'
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    router: {
      origin: false
    },
    eas: {
      projectId: 'b4f9ab87-947e-4014-8990-0c11fa29cb2c'
    }
  },
  owner: 'nkosib',
  runtimeVersion: {
    policy: 'appVersion'
  },
  updates: {
    url: 'https://u.expo.dev/b4f9ab87-947e-4014-8990-0c11fa29cb2c'
  }
}; 