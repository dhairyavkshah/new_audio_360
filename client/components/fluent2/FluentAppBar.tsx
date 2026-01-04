import React from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  ViewStyle,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';
import { FluentText } from './FluentText';

interface FluentAppBarProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  leadingIcon?: React.ReactNode;
  trailingActions?: React.ReactNode[];
  elevated?: boolean;
  transparent?: boolean;
  style?: ViewStyle;
}

export function FluentAppBar({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  leadingIcon,
  trailingActions,
  elevated = false,
  transparent = false,
  style,
}: FluentAppBarProps) {
  const { colors, spacing, elevation, iconSize } = useFluent2Theme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: transparent ? 'transparent' : colors.background,
          ...(elevated ? elevation.level2 : elevation.none),
        },
        style,
      ]}
    >
      <View style={[styles.content, { paddingHorizontal: spacing.lg }]}>
        <View style={styles.leading}>
          {showBackButton && (
            <TouchableOpacity
              onPress={onBackPress}
              style={[styles.iconButton, { marginRight: spacing.sm }]}
            >
              <Ionicons
                name="arrow-back"
                size={iconSize.lg}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          )}
          {leadingIcon && (
            <View style={{ marginRight: spacing.sm }}>
              {leadingIcon}
            </View>
          )}
        </View>

        <View style={styles.titleContainer}>
          {title && (
            <FluentText variant="subtitle1" numberOfLines={1}>
              {title}
            </FluentText>
          )}
          {subtitle && (
            <FluentText variant="caption1" color="secondary" numberOfLines={1}>
              {subtitle}
            </FluentText>
          )}
        </View>

        <View style={styles.trailing}>
          {trailingActions?.map((action, index) => (
            <View key={index} style={{ marginLeft: spacing.xs }}>
              {action}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
});
