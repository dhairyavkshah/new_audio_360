import React, { useState } from 'react';
import { View, StyleSheet, Platform, Linking, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';

import { FluentText, FluentSurface } from '@/components/fluent';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useUiSound } from '@/contexts/UiSoundContext';
import { useMediaLibraryContext } from '@/contexts/MediaLibraryContext';
import { FluentSpacing, FluentControlRadius, FluentLightColors, FluentDarkColors } from '@/constants/fluent2';

interface PermissionOnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

type PermissionStatus = 'pending' | 'granted' | 'denied';

interface PermissionStep {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
}

const PERMISSION_STEPS: PermissionStep[] = [
  {
    id: 'media',
    icon: 'music-box-multiple',
    title: 'Music & Audio',
    description: "Access your device's music library to play your favorite songs and audio files",
  },
  {
    id: 'photos',
    icon: 'image-multiple',
    title: 'Photos & Videos',
    description: 'Display album artwork and media thumbnails for your music collection',
  },
  {
    id: 'notifications',
    icon: 'bell',
    title: 'Notifications',
    description: 'Show now-playing controls in your notification bar for easy playback control',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PermissionOnboardingFlow({ onComplete, onSkip }: PermissionOnboardingFlowProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { playTapSound } = useUiSound();
  const { requestPermission: requestMediaPermission } = useMediaLibraryContext();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [permissions, setPermissions] = useState<Record<string, PermissionStatus>>({
    media: 'pending',
    photos: 'pending',
    notifications: 'pending',
  });
  const [isRequesting, setIsRequesting] = useState(false);

  const currentPermission = PERMISSION_STEPS[currentStep];
  const isLastStep = currentStep === PERMISSION_STEPS.length - 1;
  const currentStatus = permissions[currentPermission.id];

  const setupNotificationChannel = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('now-playing', {
        name: 'Now Playing',
        importance: Notifications.AndroidImportance.LOW,
        sound: undefined,
        vibrationPattern: undefined,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
  };

  const requestCurrentPermission = async () => {
    if (Platform.OS === 'web') {
      return;
    }

    setIsRequesting(true);
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let granted = false;

      switch (currentPermission.id) {
        case 'media':
          granted = await requestMediaPermission();
          break;
        case 'photos':
          const photoResult = await MediaLibrary.requestPermissionsAsync();
          granted = photoResult.granted;
          break;
        case 'notifications':
          await setupNotificationChannel();
          const notifResult = await Notifications.requestPermissionsAsync();
          granted = notifResult.granted;
          break;
      }

      setPermissions(prev => ({
        ...prev,
        [currentPermission.id]: granted ? 'granted' : 'denied',
      }));
    } catch (error) {
      console.error('Permission request error:', error);
      setPermissions(prev => ({
        ...prev,
        [currentPermission.id]: 'denied',
      }));
    } finally {
      setIsRequesting(false);
    }
  };

  const handleNext = () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isLastStep) {
      onSkip();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleOpenSettings = async () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (Platform.OS !== 'web') {
      try {
        await Linking.openSettings();
      } catch (error) {
        console.error('Cannot open settings:', error);
      }
    }
  };

  if (Platform.OS === 'web') {
    return (
      <FluentSurface background="neutral1" style={[styles.container, { paddingTop: insets.top + FluentSpacing.xl, paddingBottom: insets.bottom + FluentSpacing.xl }]}>
        <View style={styles.webContent}>
          <View style={[styles.iconContainer, { backgroundColor: colors.colorBrandBackground + '15' }]}>
            <MaterialCommunityIcons name="web" size={64} color={colors.colorBrandForeground1} />
          </View>
          <FluentText variant="title1" align="center">Welcome to New Audio 360</FluentText>
          <FluentText variant="body1" color="secondary" align="center" style={styles.webDescription}>
            On the web, permissions are handled differently. You can use sample music or select folders when prompted.
          </FluentText>
          <FluentText variant="caption1" color="secondary" align="center" style={styles.webNote}>
            For the full experience with all features, use the app on your Android device.
          </FluentText>
          <View style={styles.webButtons}>
            <Pressable
              style={[styles.button, { backgroundColor: colors.colorBrandBackground }]}
              onPress={onComplete}
            >
              <FluentText variant="subtitle1" color="onBrand">Get Started</FluentText>
            </Pressable>
          </View>
        </View>
      </FluentSurface>
    );
  }

  return (
    <FluentSurface background="neutral1" style={[styles.container, { paddingTop: insets.top + FluentSpacing.xl, paddingBottom: insets.bottom + FluentSpacing.xl }]}>
      <View style={styles.header}>
        <View style={styles.stepIndicator}>
          {PERMISSION_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentStep 
                    ? colors.colorBrandBackground 
                    : index < currentStep 
                      ? colors.colorPaletteGreenForeground1 
                      : colors.colorNeutralStroke1,
                },
              ]}
            />
          ))}
        </View>
        <FluentText variant="caption1" color="secondary">
          Step {currentStep + 1} of {PERMISSION_STEPS.length}
        </FluentText>
      </View>

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.colorBrandBackground + '15' }]}>
          <MaterialCommunityIcons 
            name={currentPermission.icon} 
            size={64} 
            color={colors.colorBrandForeground1} 
          />
        </View>
        
        <FluentText variant="title1" align="center">{currentPermission.title}</FluentText>
        <FluentText variant="body1" color="secondary" align="center" style={styles.description}>
          {currentPermission.description}
        </FluentText>

        <View style={[styles.statusContainer, { backgroundColor: colors.colorNeutralBackground3 }]}>
          {currentStatus === 'granted' ? (
            <>
              <MaterialCommunityIcons name="check-circle" size={24} color={colors.colorPaletteGreenForeground1} />
              <FluentText variant="body1Strong" color="success">
                Permission Granted
              </FluentText>
            </>
          ) : currentStatus === 'denied' ? (
            <>
              <MaterialCommunityIcons name="close-circle" size={24} color={colors.colorPaletteRedForeground1} />
              <FluentText variant="body1Strong" color="error">
                Permission Denied
              </FluentText>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="circle-outline" size={24} color={colors.colorNeutralForeground2} />
              <FluentText variant="body1" color="secondary">
                Waiting for permission
              </FluentText>
            </>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        {currentStatus === 'pending' ? (
          <>
            <Pressable
              style={[
                styles.button,
                { backgroundColor: colors.colorBrandBackground },
                isRequesting && styles.buttonDisabled
              ]}
              onPress={requestCurrentPermission}
              disabled={isRequesting}
            >
              {isRequesting ? (
                <FluentText variant="subtitle1" color="onBrand">Requesting...</FluentText>
              ) : (
                <>
                  <MaterialCommunityIcons name="shield-check" size={20} color={colors.colorNeutralForegroundOnBrand} />
                  <FluentText variant="subtitle1" color="onBrand">Allow</FluentText>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, { borderColor: colors.colorNeutralStroke1 }]}
              onPress={handleSkip}
            >
              <FluentText variant="body1" color="secondary">Skip</FluentText>
            </Pressable>
          </>
        ) : currentStatus === 'denied' ? (
          <>
            <Pressable
              style={[styles.button, { backgroundColor: colors.colorBrandBackground }]}
              onPress={handleOpenSettings}
            >
              <MaterialCommunityIcons name="cog" size={20} color={colors.colorNeutralForegroundOnBrand} />
              <FluentText variant="subtitle1" color="onBrand">Open Settings</FluentText>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, { borderColor: colors.colorNeutralStroke1 }]}
              onPress={handleNext}
            >
              <FluentText variant="body1" color="secondary">
                {isLastStep ? 'Get Started' : 'Next'}
              </FluentText>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[styles.button, { backgroundColor: colors.colorBrandBackground }]}
            onPress={handleNext}
          >
            <FluentText variant="subtitle1" color="onBrand">
              {isLastStep ? 'Get Started' : 'Next'}
            </FluentText>
            {!isLastStep && (
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.colorNeutralForegroundOnBrand} />
            )}
          </Pressable>
        )}

        <FluentText variant="caption1" color="secondary" align="center" style={styles.privacyNote}>
          Your data stays on your device. We never upload or share your files. View our Privacy Policy in Settings.
        </FluentText>
      </View>
    </FluentSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: FluentSpacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: FluentSpacing.s,
    marginBottom: FluentSpacing.xl,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: FluentSpacing.s,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: FluentSpacing.l,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: FluentSpacing.m,
  },
  description: {
    lineHeight: 22,
    paddingHorizontal: FluentSpacing.xl,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FluentSpacing.s,
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.l,
    borderRadius: FluentControlRadius.dialog,
    marginTop: FluentSpacing.l,
  },
  footer: {
    gap: FluentSpacing.m,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FluentSpacing.s,
    height: 52,
    width: '100%',
    borderRadius: FluentControlRadius.dialog,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: FluentControlRadius.dialog,
    borderWidth: 1,
  },
  privacyNote: {
    marginTop: FluentSpacing.m,
  },
  webContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: FluentSpacing.l,
  },
  webDescription: {
    lineHeight: 22,
    paddingHorizontal: FluentSpacing.xl,
  },
  webNote: {
    marginTop: FluentSpacing.s,
  },
  webButtons: {
    width: '100%',
    marginTop: FluentSpacing.xl,
  },
});
