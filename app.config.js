const IS_DEV = process.env.APP_ENV === 'development';
const IS_PREVIEW = process.env.APP_ENV === 'preview';

const getAppVariant = () => {
  if (IS_DEV) return 'development';
  if (IS_PREVIEW) return 'preview';
  return 'production';
};

const getAppName = () => {
  if (IS_DEV) return 'New Audio 360 (Dev)';
  if (IS_PREVIEW) return 'New Audio 360 (Preview)';
  return 'New Audio 360';
};

const getAppIdentifier = () => {
  if (IS_DEV) return 'com.theteam360.newaudio360.dev';
  if (IS_PREVIEW) return 'com.theteam360.newaudio360.preview';
  return 'com.theteam360.newaudio360';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'new-audio-360',
    version: '1.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    scheme: 'newaudio360',
    ios: {
      supportsTablet: true,
      bundleIdentifier: getAppIdentifier(),
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#1565C0',
        foregroundImage: './assets/images/android-icon-foreground.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: false,
      package: getAppIdentifier(),
      versionCode: 1, // v1.0
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
    },
    plugins: [
      'expo-asset',
      'expo-font',
      'expo-secure-store',
      'expo-audio',
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
    },
  },
};
