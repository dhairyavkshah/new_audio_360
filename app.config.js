const IS_DEV = process.env.APP_ENV === 'development';
const IS_PREVIEW = process.env.APP_ENV === 'preview';
const IS_TESTING = process.env.APP_ENV === 'testing';

const getAppVariant = () => {
  if (IS_DEV) return 'development';
  if (IS_PREVIEW) return 'preview';
  if (IS_TESTING) return 'testing';
  return 'production';
};

const getAppName = () => {
  if (IS_DEV) return 'New Audio 360 (Dev)';
  if (IS_PREVIEW) return 'New Audio 360 (Preview)';
  // Testing uses production name (same APK as production, just without license check)
  return 'New Audio 360';
};

const getAppIdentifier = () => {
  if (IS_DEV) return 'com.theteam360.newaudio360.dev';
  if (IS_PREVIEW) return 'com.theteam360.newaudio360.preview';
  // Testing uses production package (same APK as production, just without license check)
  return 'com.theteam360.newaudio360';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'new-audio-360',
    version: '33.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    scheme: 'newaudio360',
    ios: {
      supportsTablet: true,
      bundleIdentifier: getAppIdentifier(),
      buildNumber: '33',
      infoPlist: {
        NSAppleMusicUsageDescription: 'Allow $(PRODUCT_NAME) to access your music library to play your songs.',
        NSMicrophoneUsageDescription: 'Allow $(PRODUCT_NAME) to access your microphone for voice recording and audio testing.',
        NSPhotoLibraryUsageDescription: 'Allow $(PRODUCT_NAME) to access your photos to display album artwork.',
        UIBackgroundModes: ['audio'],
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSAllowsLocalNetworking: true,
        },
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#1565C0',
        foregroundImage: './assets/images/android-icon-foreground.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: false,
      package: getAppIdentifier(),
      versionCode: 33,
      permissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_AUDIO',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
        'android.permission.WAKE_LOCK',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
    },
    web: {
      output: 'single',
      favicon: './assets/images/favicon.png',
      name: 'New Audio 360',
      shortName: 'New Audio 360',
      description: 'Premium Music Player - Studio-quality audio processing with 10-band EQ, spatial enhancement, and 55 themes',
      lang: 'en',
      themeColor: '#1565C0',
      backgroundColor: '#1565C0',
      startUrl: '/',
      display: 'standalone',
      orientation: 'any',
      preferRelatedApplications: false,
      bundler: 'metro',
    },
    plugins: [
      'expo-asset',
      'expo-font',
      'expo-secure-store',
      'expo-audio',
      [
        'react-native-audio-api',
        {
          iosBackgroundMode: true,
          androidPermissions: [
            'android.permission.MODIFY_AUDIO_SETTINGS',
            'android.permission.FOREGROUND_SERVICE',
            'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
          ],
          androidForegroundService: true,
          androidFSTypes: ['mediaPlayback'],
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            newArchEnabled: false,
          },
          ios: {
            newArchEnabled: false,
          },
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#1565C0',
          dark: {
            image: './assets/images/splash-icon.png',
            backgroundColor: '#0D47A1',
          },
        },
      ],
      [
        'expo-media-library',
        {
          photosPermission: 'Allow $(PRODUCT_NAME) to access your photos.',
          savePhotosPermission: 'Allow $(PRODUCT_NAME) to save photos.',
          isAccessMediaLocationEnabled: true,
        },
      ],
      'expo-web-browser',
      [
        'expo-av',
        {
          microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone for voice recording.',
        },
      ],
    ],
    experiments: {
      reactCompiler: false,
    },
    extra: {
      eas: {
        projectId: '973e49b1-f295-4d20-a9e9-2ad49d4ff7d3',
      },
      appVariant: getAppVariant(),
      SOUNDCLOUD_CLIENT_ID: process.env.SOUNDCLOUD_CLIENT_ID || process.env.EXPO_PUBLIC_SOUNDCLOUD_CLIENT_ID,
      SOUNDCLOUD_CLIENT_SECRET: process.env.SOUNDCLOUD_CLIENT_SECRET || process.env.EXPO_PUBLIC_SOUNDCLOUD_CLIENT_SECRET,
    },
  },
};
