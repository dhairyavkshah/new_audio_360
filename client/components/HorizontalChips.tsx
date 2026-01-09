import React from "react";
import { View, StyleSheet, FlatList, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Layout } from "@/constants/theme";
import {
  FluentSpacing,
  FluentControlRadius,
  FluentTypography,
  FluentDuration,
  FluentCurve,
  FluentLightColors,
  FluentDarkColors,
  getShadowStyle,
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
  fluentColors,
}: {
  item: ChipItem;
  isSelected: boolean;
  onPress: () => void;
  fluentColors: typeof FluentLightColors;
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
    ? fluentColors.colorBrandBackground
    : fluentColors.colorSubtleBackgroundHover;
  const textColor = isSelected 
    ? fluentColors.colorNeutralForegroundOnBrand 
    : fluentColors.colorNeutralForeground2;
  const borderColor = isSelected ? fluentColors.colorBrandStroke1 : "transparent";

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
      <ThemedText
        style={[
          styles.chipText, 
          { 
            color: textColor,
            fontSize: FluentTypography.caption1Strong.fontSize,
            fontWeight: FluentTypography.caption1Strong.fontWeight,
            lineHeight: FluentTypography.caption1Strong.lineHeight,
          }
        ]}
      >
        {item.label}
      </ThemedText>
    </AnimatedPressable>
  );
}

export function HorizontalChips({
  items,
  selectedId,
  onSelect,
}: HorizontalChipsProps) {
  const { theme, isDark } = useThemeContext();
  const { playTapSound } = useUiSound();
  const fluentColors = isDark ? FluentDarkColors : FluentLightColors;

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
      fluentColors={fluentColors}
    />
  );

  const shadowStyle = getShadowStyle('shadow4', isDark);

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: fluentColors.colorNeutralBackground3,
        borderBottomColor: fluentColors.colorNeutralStroke2,
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
    height: Layout.tabHeight,
    justifyContent: "center",
    borderBottomWidth: 1,
  },
  listContent: {
    paddingHorizontal: FluentSpacing.l,
    alignItems: "center",
  },
  separator: {
    width: FluentSpacing.s,
  },
  chip: {
    height: 32,
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentControlRadius.chip,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipText: {
    textAlign: "center",
  },
});
