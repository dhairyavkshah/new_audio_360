import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';
import { FluentText } from './FluentText';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface FluentAvatarProps {
  source?: { uri: string } | number;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

export function FluentAvatar({
  source,
  name,
  size = 'md',
  style,
}: FluentAvatarProps) {
  const { colors, radius } = useFluent2Theme();

  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    xxl: 96,
  };

  const fontSizeMap = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 32,
  };

  const avatarSize = sizeMap[size];

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const containerStyle: ViewStyle = {
    width: avatarSize,
    height: avatarSize,
    borderRadius: radius.full,
    backgroundColor: colors.brand.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  if (source) {
    return (
      <View style={[containerStyle, style]}>
        <Image
          source={source}
          style={{
            width: avatarSize,
            height: avatarSize,
          }}
        />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <FluentText
        variant="body1"
        color="brand"
        weight="semibold"
        style={{ fontSize: fontSizeMap[size] }}
      >
        {name ? getInitials(name) : '?'}
      </FluentText>
    </View>
  );
}

const styles = StyleSheet.create({});
