import React from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { ThemeName, ThemeColors, themeRegistry } from "@/constants/theme";
import { getSkin } from "@/constants/skins";
import { FluentSpacing, FluentControlRadius } from "@/constants/fluent2";

interface ThemeSelectorProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ThemeOption({
  themeName,
  label,
  description,
  isSelected,
  isLocked,
  previewIsDark,
  onPress,
}: {
  themeName: ThemeName;
  label: string;
  description: string;
  isSelected: boolean;
  isLocked: boolean;
  previewIsDark: boolean;
  onPress: () => void;
}) {
  const { theme } = useThemeContext();
  const scale = useSharedValue(1);

  const themePreview = ThemeColors[themeName][previewIsDark ? "dark" : "light"];
  const skin = getSkin(themeName);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLocked) {
      Alert.alert("Premium Theme", "Upgrade to Premium to unlock all 55 themes.", [
        { text: "OK", style: "default" }
      ]);
      return;
    }
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.themeOption,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: isSelected ? themePreview.primary : "transparent",
          borderWidth: 2,
          borderRadius: FluentControlRadius.card,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.colorPreview}>
        <View style={[styles.colorSwatch, { backgroundColor: themePreview.primary }]} />
        <View style={[styles.colorSwatch, { backgroundColor: themePreview.secondary }]} />
        <View style={[styles.colorSwatch, { backgroundColor: themePreview.backgroundDefault }]} />
      </View>
      <View style={styles.themeInfo}>
        <View style={styles.themeLabelRow}>
          <ThemedText type="body" style={styles.themeLabel}>
            {label}
          </ThemedText>
          <View style={styles.skinIcons}>
            <MaterialCommunityIcons 
              name={skin.icons.play as keyof typeof MaterialCommunityIcons.glyphMap} 
              size={12} 
              color={themePreview.primary} 
            />
          </View>
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {description}
        </ThemedText>
      </View>
      {isLocked ? (
        <View style={[styles.lockBadge, { backgroundColor: theme.warning + "20" }]}>
          <MaterialCommunityIcons name="lock" size={14} color={theme.warning} />
        </View>
      ) : isSelected ? (
        <View style={[styles.checkmark, { backgroundColor: themePreview.primary }]}>
          <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

const categories = [
  { id: "System", label: "System", icon: "cog" as const },
  { id: "Winamp", label: "Winamp", icon: "music-box" as const },
  { id: "iTunes", label: "iTunes", icon: "apple" as const },
  { id: "iOS", label: "iOS", icon: "apple" as const },
  { id: "Windows", label: "Windows", icon: "microsoft-windows" as const },
  { id: "Zune", label: "Zune", icon: "microsoft" as const },
  { id: "Android", label: "Android", icon: "android" as const },
  { id: "Samsung", label: "Samsung", icon: "cellphone" as const },
  { id: "Players", label: "Music Players", icon: "music" as const },
  { id: "Specialty", label: "Specialty", icon: "palette" as const },
];

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const { theme } = useThemeContext();
  const { isThemeUnlocked } = useSubscription();

  const themesByCategory = categories.map(cat => ({
    ...cat,
    themes: themeRegistry.filter(t => t.category === cat.id),
  })).filter(cat => cat.themes.length > 0);

  return (
    <View style={styles.container}>
      {themesByCategory.map((category) => (
        <View key={category.id} style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <MaterialCommunityIcons
              name={category.icon}
              size={18}
              color={theme.textSecondary}
            />
            <ThemedText type="small" style={[styles.categoryLabel, { color: theme.textSecondary }]}>
              {category.label}
            </ThemedText>
            <ThemedText type="caption" style={[styles.categoryCount, { color: theme.textTertiary }]}>
              ({category.themes.length})
            </ThemedText>
          </View>
          <View style={styles.themesGrid}>
            {category.themes.map((option) => (
              <ThemeOption
                key={option.name}
                themeName={option.name}
                label={option.label}
                description={option.description}
                isSelected={currentTheme === option.name}
                isLocked={!isThemeUnlocked(option.name)}
                previewIsDark={option.isDark}
                onPress={() => onThemeChange(option.name)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: FluentSpacing.xl,
  },
  categorySection: {
    gap: FluentSpacing.s,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.xs,
    paddingVertical: FluentSpacing.xs,
  },
  categoryLabel: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryCount: {
    marginLeft: FluentSpacing.xs,
  },
  themesGrid: {
    gap: FluentSpacing.s,
  },
  themeOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
  },
  colorPreview: {
    flexDirection: "row",
    gap: 4,
    marginRight: FluentSpacing.m,
  },
  colorSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  themeInfo: {
    flex: 1,
  },
  themeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  themeLabel: {
    fontWeight: "600",
    flex: 1,
  },
  skinIcons: {
    flexDirection: "row",
    gap: 4,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  lockBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
});
