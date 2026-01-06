import React from "react";
import { View, StyleSheet, FlatList, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Spacing, M3Motion, M3Shape, Layout, M3Elevation } from "@/constants/theme";

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
}: {
  item: ChipItem;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { theme } = useThemeContext();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.95, {
      duration: M3Motion.durationShort3,
      easing: Easing.bezier(
        M3Motion.easingStandard.x1,
        M3Motion.easingStandard.y1,
        M3Motion.easingStandard.x2,
        M3Motion.easingStandard.y2
      ),
    });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, {
      duration: M3Motion.durationShort4,
      easing: Easing.bezier(
        M3Motion.easingStandard.x1,
        M3Motion.easingStandard.y1,
        M3Motion.easingStandard.x2,
        M3Motion.easingStandard.y2
      ),
    });
  };

  const backgroundColor = isSelected
    ? `${theme.primary}26`
    : theme.surfaceContainerHigh;
  const textColor = isSelected ? theme.primary : theme.onSurfaceVariant;
  const borderColor = isSelected ? theme.primary : "transparent";

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
        type="labelMedium"
        style={[styles.chipText, { color: textColor }]}
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
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();

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
    />
  );

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.surfaceContainer,
        borderBottomColor: theme.outlineVariant,
      },
      Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        android: {
          elevation: M3Elevation.level2.elevation,
        },
        default: {},
      }),
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
    paddingHorizontal: Layout.horizontalPadding,
    alignItems: "center",
  },
  separator: {
    width: Spacing.s,
  },
  chip: {
    height: Layout.buttonSmall,
    paddingHorizontal: Spacing.l,
    borderRadius: M3Shape.cornerFull,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipText: {
    textAlign: "center",
  },
});
