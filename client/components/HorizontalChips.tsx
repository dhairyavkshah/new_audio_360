import React from "react";
import { View, StyleSheet, FlatList, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import {
  FluentSpacing,
  FluentControlRadius,
  FluentTypography,
  FluentDuration,
  FluentCurve,
  FluentLightColors,
  FluentDarkColors,
  getShadowStyle,
  FluentLayoutSize,
  FluentBorderWidth,
} from "@/constants/fluent2";

interface ChipItem {
  id: string;
  label: string;
  icon?: string;
}

interface HorizontalChipsProps {
  items: ChipItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function Chip({
  item,
  isSelected,
  onPress,
  colors,
}: {
  item: ChipItem;
  isSelected: boolean;
  onPress: () => void;
  colors: typeof FluentLightColors;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.95, {
      duration: FluentDuration.fast,
      easing: FluentCurve.decelerateMid,
    });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, {
      duration: FluentDuration.normal,
      easing: FluentCurve.decelerateMid,
    });
  };

  const backgroundColor = isSelected
    ? colors.colorBrandBackground
    : colors.colorSubtleBackgroundHover;
  const textColor = isSelected 
    ? colors.colorNeutralForegroundOnBrand 
    : colors.colorNeutralForeground2;
  const borderColor = isSelected ? colors.colorBrandStroke1 : "transparent";

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={item.label}
      style={[
        styles.chip,
        {
          backgroundColor,
          borderColor,
        },
        animatedStyle,
      ]}
    >
      <FluentText
        variant="caption1Strong"
        style={[styles.chipText, { color: textColor }]}
      >
        {item.label}
      </FluentText>
    </AnimatedPressable>
  );
}

export function HorizontalChips({
  items,
  selectedId,
  onSelect,
}: HorizontalChipsProps) {
  const { isDark } = useThemeContext();
  const { playTapSound } = useUiSound();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const handleSelect = (id: string) => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(id);
  };

  const renderItem = ({ item }: { item: ChipItem }) => (
    <Chip
      item={item}
      isSelected={selectedId === item.id}
      onPress={() => handleSelect(item.id)}
      colors={colors}
    />
  );

  const shadowStyle = getShadowStyle('shadow4', isDark);

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.colorNeutralBackground3,
        borderBottomColor: colors.colorNeutralStroke2,
      },
      shadowStyle,
    ]}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: FluentLayoutSize.secondaryBarHeight,
    justifyContent: "center",
    borderBottomWidth: FluentBorderWidth.thin,
  },
  listContent: {
    paddingHorizontal: FluentSpacing.l,
    alignItems: "center",
  },
  separator: {
    width: FluentSpacing.s,
  },
  chip: {
    height: FluentLayoutSize.chipHeight,
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentControlRadius.chip,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: FluentBorderWidth.thin,
  },
  chipText: {
    textAlign: "center",
  },
});
