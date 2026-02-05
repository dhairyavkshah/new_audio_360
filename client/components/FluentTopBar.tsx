import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import {
  FluentSpacing,
  FluentIconSize,
  FluentTypography,
  FluentControlRadius,
  FluentLayoutSize,
  FluentControlHeight,
} from "@/constants/fluent2";
import { Layout } from "@/constants/theme";

export type SortOption = "title_asc" | "title_desc" | "artist_asc" | "duration_asc" | "duration_desc";

export const SORT_OPTIONS: { key: SortOption; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { key: "title_asc", label: "A-Z", icon: "sort-alphabetical-ascending" },
  { key: "title_desc", label: "Z-A", icon: "sort-alphabetical-descending" },
  { key: "artist_asc", label: "Artist", icon: "account-music" },
  { key: "duration_asc", label: "Shortest", icon: "sort-clock-ascending" },
  { key: "duration_desc", label: "Longest", icon: "sort-clock-descending" },
];

export interface CategoryOption {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  count?: number;
}

interface FluentTopBarProps {
  title: string;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  showSort?: boolean;
  sortBy?: SortOption;
  onSortChange?: (option: SortOption) => void;
  showSortOverlay?: boolean;
  onSortOverlayToggle?: () => void;
  categoryOptions?: CategoryOption[];
  activeCategory?: string;
  onCategoryChange?: (key: string) => void;
  showCategoryDropdown?: boolean;
  onCategoryDropdownToggle?: () => void;
  rightAction?: React.ReactNode;
}

export function FluentTopBar({
  title,
  showSearch = false,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  showSort = false,
  sortBy = "title_asc",
  onSortChange,
  showSortOverlay = false,
  onSortOverlayToggle,
  categoryOptions,
  activeCategory,
  onCategoryChange,
  showCategoryDropdown = false,
  onCategoryDropdownToggle,
  rightAction,
}: FluentTopBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useThemeContext();
  const { playTapSound } = useUiSound();
  const fluentColors = useThemedColors();

  const activeCategoryConfig = categoryOptions?.find(c => c.key === activeCategory);

  const handleSortPress = (option: SortOption) => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSortChange?.(option);
  };

  const handleCategoryPress = (key: string) => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onCategoryChange?.(key);
  };

  const handleToggleSort = () => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSortOverlayToggle?.();
  };

  const handleToggleCategoryDropdown = () => {
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onCategoryDropdownToggle?.();
  };

  const handleClearSearch = () => {
    playTapSound();
    onSearchChange?.("");
  };

  const topPadding = insets.top + FluentSpacing.s;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topPadding,
          backgroundColor: fluentColors.colorNeutralBackground1,
          borderBottomColor: fluentColors.colorNeutralStroke2,
        },
      ]}
    >
      <View style={styles.titleRow}>
        <Text
          style={[
            styles.title,
            FluentTypography.title2,
            { color: fluentColors.colorNeutralForeground1 },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {categoryOptions && activeCategoryConfig && (
        <View
          style={[
            styles.categoryRow,
            !rightAction && { justifyContent: "flex-start" },
          ]}
        >
          <Pressable
            style={[
              styles.categoryDropdownButton,
              {
                backgroundColor: fluentColors.colorNeutralBackground3,
                borderColor: fluentColors.colorNeutralStroke2,
              },
            ]}
            onPress={handleToggleCategoryDropdown}
            accessibilityRole="button"
            accessibilityLabel={`Category: ${activeCategoryConfig.label}. Tap to change.`}
          >
            <View style={[styles.categoryIcon, { backgroundColor: activeCategoryConfig.color + "20" }]}>
              <MaterialCommunityIcons
                name={activeCategoryConfig.icon}
                size={FluentIconSize.regular}
                color={activeCategoryConfig.color}
              />
            </View>
            <Text
              style={[
                FluentTypography.body1Strong,
                { color: fluentColors.colorNeutralForeground1 },
              ]}
            >
              {activeCategoryConfig.label}
            </Text>
            {activeCategoryConfig.count !== undefined && (
              <Text
                style={[
                  FluentTypography.caption1,
                  { color: fluentColors.colorNeutralForeground3, marginLeft: FluentSpacing.xs },
                ]}
              >
                {activeCategoryConfig.count}
              </Text>
            )}
            <MaterialCommunityIcons
              name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
              size={FluentIconSize.regular}
              color={fluentColors.colorNeutralForeground3}
              style={{ marginLeft: FluentSpacing.xs }}
            />
          </Pressable>
          {rightAction}
        </View>
      )}

      {(showSearch || showSort) && (
        <View style={styles.controlsRow}>
          {showSearch && (
            <View style={[styles.searchContainer, { backgroundColor: fluentColors.colorNeutralBackground3 }]}>
              <MaterialCommunityIcons
                name="magnify"
                size={FluentIconSize.small}
                color={fluentColors.colorNeutralForeground3}
                style={styles.searchIcon}
              />
              <TextInput
                style={[
                  styles.searchInput,
                  FluentTypography.body1,
                  { color: fluentColors.colorNeutralForeground1 },
                ]}
                placeholder={searchPlaceholder}
                placeholderTextColor={fluentColors.colorNeutralForeground4}
                value={searchQuery}
                onChangeText={onSearchChange}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={handleClearSearch}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Clear search"
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={FluentIconSize.small}
                    color={fluentColors.colorNeutralForeground3}
                  />
                </Pressable>
              )}
            </View>
          )}
          {showSort && (
            <Pressable
              style={[styles.sortButton, { backgroundColor: fluentColors.colorNeutralBackground3 }]}
              onPress={handleToggleSort}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              accessibilityLabel="Sort options"
            >
              <MaterialCommunityIcons
                name={SORT_OPTIONS.find((o) => o.key === sortBy)?.icon || "sort"}
                size={FluentIconSize.small}
                color={fluentColors.colorNeutralForeground1}
              />
              <MaterialCommunityIcons
                name={showSortOverlay ? "chevron-up" : "chevron-down"}
                size={FluentIconSize.tiny}
                color={fluentColors.colorNeutralForeground3}
                style={{ marginLeft: FluentSpacing.xxs }}
              />
            </Pressable>
          )}
        </View>
      )}

      {showCategoryDropdown && categoryOptions && (
        <>
          <Pressable
            style={styles.overlayBackdrop}
            onPress={handleToggleCategoryDropdown}
          />
          <View
            style={[
              styles.dropdownOverlay,
              {
                backgroundColor: fluentColors.colorNeutralBackground1,
                borderColor: fluentColors.colorNeutralStroke2,
              },
            ]}
          >
            {categoryOptions.map((category) => {
              const isActive = activeCategory === category.key;
              return (
                <Pressable
                  key={category.key}
                  style={[
                    styles.dropdownOption,
                    isActive && { backgroundColor: category.color + "12" },
                  ]}
                  onPress={() => handleCategoryPress(category.key)}
                >
                  <View style={[styles.dropdownOptionIcon, { backgroundColor: category.color + "20" }]}>
                    <MaterialCommunityIcons
                      name={category.icon}
                      size={FluentIconSize.small}
                      color={category.color}
                    />
                  </View>
                  <Text
                    style={[
                      FluentTypography.body1,
                      styles.dropdownOptionLabel,
                      isActive && { color: category.color, fontWeight: "600" },
                      !isActive && { color: fluentColors.colorNeutralForeground1 },
                    ]}
                  >
                    {category.label}
                  </Text>
                  {category.count !== undefined && (
                    <Text
                      style={[
                        FluentTypography.caption1,
                        { color: fluentColors.colorNeutralForeground3 },
                      ]}
                    >
                      {category.count}
                    </Text>
                  )}
                  {isActive && (
                    <MaterialCommunityIcons
                      name="check"
                      size={FluentIconSize.small}
                      color={category.color}
                      style={{ marginLeft: FluentSpacing.s }}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {showSortOverlay && (
        <>
          <Pressable
            style={styles.overlayBackdrop}
            onPress={handleToggleSort}
          />
          <View
            style={[
              styles.sortOverlay,
              {
                backgroundColor: fluentColors.colorNeutralBackground1,
                borderColor: fluentColors.colorNeutralStroke2,
              },
            ]}
          >
            {SORT_OPTIONS.map((option) => {
              const isActive = sortBy === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[
                    styles.sortOption,
                    isActive && { backgroundColor: fluentColors.colorNeutralBackground3 },
                  ]}
                  onPress={() => handleSortPress(option.key)}
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={FluentIconSize.small}
                    color={isActive ? fluentColors.colorBrandForeground1 : fluentColors.colorNeutralForeground1}
                  />
                  <Text
                    style={[
                      FluentTypography.body1,
                      styles.sortOptionLabel,
                      { color: isActive ? fluentColors.colorBrandForeground1 : fluentColors.colorNeutralForeground1 },
                      isActive && { fontWeight: "600" },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isActive && (
                    <MaterialCommunityIcons
                      name="check"
                      size={FluentIconSize.small}
                      color={fluentColors.colorBrandForeground1}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: FluentSpacing.l,
    paddingBottom: FluentSpacing.s,
    zIndex: 100,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.xs,
  },
  title: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.s,
    marginBottom: FluentSpacing.s,
  },
  categoryDropdownButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
    borderWidth: 1,
    gap: FluentSpacing.s,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: FluentControlRadius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: FluentSpacing.s,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: FluentControlRadius.button,
    paddingHorizontal: FluentSpacing.m,
    height: FluentLayoutSize.inputFieldHeight,
  },
  searchIcon: {
    marginRight: FluentSpacing.xs,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
    height: FluentControlHeight.large,
    minWidth: 48,
  },
  overlayBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: -1000,
    backgroundColor: "transparent",
    zIndex: 100,
  },
  dropdownOverlay: {
    position: "absolute",
    top: "100%",
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
    borderWidth: 1,
    paddingVertical: FluentSpacing.xs,
    zIndex: 101,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
      },
    }),
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.m,
    gap: FluentSpacing.s,
  },
  dropdownOptionIcon: {
    width: 28,
    height: 28,
    borderRadius: FluentControlRadius.chip,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownOptionLabel: {
    flex: 1,
  },
  sortOverlay: {
    position: "absolute",
    top: "100%",
    right: FluentSpacing.l,
    width: 160,
    borderRadius: FluentControlRadius.card,
    borderWidth: 1,
    paddingVertical: FluentSpacing.xs,
    zIndex: 101,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
      },
    }),
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.m,
    gap: FluentSpacing.s,
  },
  sortOptionLabel: {
    flex: 1,
  },
});
