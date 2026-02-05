import React from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeContext, useThemedColors } from '@/contexts/ThemeContext';
import { FluentText } from './FluentText';
import {
  FluentSpacing,
  FluentControlRadius,
  FluentIconSize,
  getShadowStyle,
} from '@/constants/fluent2';

export interface FluentModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showHandle?: boolean;
  showCloseButton?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  animationType?: 'none' | 'slide' | 'fade';
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet' | 'overFullScreen';
}

export function FluentModal({
  visible,
  onClose,
  title,
  children,
  showHandle = true,
  showCloseButton = true,
  contentStyle,
  animationType = 'slide',
  presentationStyle = 'pageSheet',
}: FluentModalProps) {
  const { isDark } = useThemeContext();
  const colors = useThemedColors();
  const insets = useSafeAreaInsets();
  const shadowStyle = getShadowStyle('shadow16', isDark);

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      presentationStyle={presentationStyle}
      onRequestClose={onClose}
      transparent={presentationStyle === 'overFullScreen'}
    >
      {presentationStyle === 'overFullScreen' ? (
        <View style={styles.scrimContainer}>
          <Pressable
            style={[styles.scrim, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
            onPress={onClose}
            accessibilityLabel="Close modal"
            accessibilityRole="button"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View
              style={[
                styles.centeredContent,
                {
                  backgroundColor: colors.colorNeutralBackground1,
                  borderRadius: FluentControlRadius.dialog,
                },
                shadowStyle,
                contentStyle,
              ]}
            >
              {showHandle && (
                <View
                  style={[
                    styles.handleBar,
                    { backgroundColor: colors.colorNeutralStroke1 },
                  ]}
                />
              )}
              {(title || showCloseButton) && (
                <View style={styles.header}>
                  {title ? (
                    <FluentText variant="title2" style={styles.title}>
                      {title}
                    </FluentText>
                  ) : (
                    <View style={styles.titlePlaceholder} />
                  )}
                  {showCloseButton && (
                    <Pressable
                      onPress={onClose}
                      style={styles.closeButton}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      accessibilityLabel="Close"
                      accessibilityRole="button"
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={FluentIconSize.medium}
                        color={colors.colorNeutralForeground1}
                      />
                    </Pressable>
                  )}
                </View>
              )}
              <View style={styles.body}>{children}</View>
            </View>
          </KeyboardAvoidingView>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.colorNeutralBackground1,
              paddingTop: insets.top + FluentSpacing.l,
            },
          ]}
        >
          {showHandle && (
            <View style={styles.handleBarCentered}>
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: colors.colorNeutralStroke1 },
                ]}
              />
            </View>
          )}
          {(title || showCloseButton) && (
            <View style={styles.header}>
              {title ? (
                <FluentText variant="title2" style={styles.title}>
                  {title}
                </FluentText>
              ) : (
                <View style={styles.titlePlaceholder} />
              )}
              {showCloseButton && (
                <Pressable
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={FluentIconSize.medium}
                    color={colors.colorNeutralForeground1}
                  />
                </Pressable>
              )}
            </View>
          )}
          <View style={styles.sheetBody}>{children}</View>
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrimContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: FluentSpacing.xl,
  },
  centeredContent: {
    width: '100%',
    maxWidth: 400,
    padding: FluentSpacing.xl,
    alignItems: 'center',
  },
  sheetContainer: {
    flex: 1,
  },
  handleBarCentered: {
    alignItems: 'center',
    marginBottom: FluentSpacing.m,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: FluentSpacing.m,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: FluentSpacing.l,
    paddingBottom: FluentSpacing.m,
  },
  title: {
    flex: 1,
  },
  titlePlaceholder: {
    flex: 1,
  },
  closeButton: {
    padding: FluentSpacing.xs,
  },
  body: {
    width: '100%',
  },
  sheetBody: {
    flex: 1,
  },
});

export default FluentModal;
