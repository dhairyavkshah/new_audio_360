import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentTouchTarget, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";
import { useThemeContext } from "@/contexts/ThemeContext";

export type SearchType = 'tracks' | 'playlists' | 'albums';

interface SoundCloudSearchHeaderProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  searchType: SearchType;
  onSearchTypeChange: (type: SearchType) => void;
}

const SEARCH_TYPE_CONFIG: { id: SearchType; label: string; icon: 'music-note' | 'playlist-music' | 'album' }[] = [
  { id: 'tracks', label: 'Tracks', icon: 'music-note' },
  { id: 'playlists', label: 'Playlists', icon: 'playlist-music' },
  { id: 'albums', label: 'Albums', icon: 'album' },
];

export function SoundCloudSearchHeader({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  searchType,
  onSearchTypeChange,
}: SoundCloudSearchHeaderProps) {
  const { theme, isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const activeTypeConfig = SEARCH_TYPE_CONFIG.find(t => t.id === searchType) || SEARCH_TYPE_CONFIG[0];

  const handleTypeSelect = (type: SearchType) => {
    onSearchTypeChange(type);
    setShowTypeDropdown(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.colorNeutralBackground3 }]}>
          <MaterialCommunityIcons name="magnify" size={FluentIconSize.small} color={colors.colorNeutralForeground3} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder={`Search ${searchType}...`}
            placeholderTextColor={colors.colorNeutralForeground3}
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
        </View>
        <Pressable
          style={[styles.typeDropdownButton, { backgroundColor: colors.colorNeutralBackground3 }]}
          onPress={() => setShowTypeDropdown(!showTypeDropdown)}
        >
          <MaterialCommunityIcons 
            name={activeTypeConfig.icon} 
            size={FluentIconSize.small} 
            color={colors.colorNeutralForeground1} 
          />
          <MaterialCommunityIcons 
            name={showTypeDropdown ? "chevron-up" : "chevron-down"} 
            size={FluentIconSize.tiny} 
            color={colors.colorNeutralForeground3} 
            style={{ marginLeft: FluentSpacing.xxs }}
          />
        </Pressable>
        <Pressable
          style={[styles.searchButton, { backgroundColor: colors.colorBrandBackground }]}
          onPress={onSearch}
        >
          <MaterialCommunityIcons name="magnify" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
        </Pressable>
      </View>

      {showTypeDropdown && (
        <>
          <Pressable
            style={styles.overlayBackdrop}
            onPress={() => setShowTypeDropdown(false)}
          />
          <View
            style={[
              styles.dropdownOverlay,
              {
                backgroundColor: colors.colorNeutralBackground1,
                borderColor: colors.colorNeutralStroke2,
              },
            ]}
          >
            {SEARCH_TYPE_CONFIG.map((type) => {
              const isActive = searchType === type.id;
              return (
                <Pressable
                  key={type.id}
                  style={[
                    styles.dropdownOption,
                    isActive && { backgroundColor: colors.colorNeutralBackground3 },
                  ]}
                  onPress={() => handleTypeSelect(type.id)}
                >
                  <MaterialCommunityIcons
                    name={type.icon}
                    size={FluentIconSize.small}
                    color={isActive ? colors.colorBrandForeground1 : colors.colorNeutralForeground1}
                  />
                  <FluentText
                    variant={isActive ? "body1Strong" : "body1"}
                    style={[
                      styles.dropdownOptionLabel,
                      { color: isActive ? colors.colorBrandForeground1 : colors.colorNeutralForeground1 },
                    ]}
                  >
                    {type.label}
                  </FluentText>
                  {isActive && (
                    <MaterialCommunityIcons
                      name="check"
                      size={FluentIconSize.small}
                      color={colors.colorBrandForeground1}
                      style={{ marginLeft: 'auto' }}
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
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    gap: FluentSpacing.s,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.input,
    height: FluentTouchTarget.minimum,
    gap: FluentSpacing.s,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  typeDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: FluentTouchTarget.minimum,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
    gap: FluentSpacing.xxs,
  },
  searchButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -1000,
    zIndex: 50,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: FluentTouchTarget.minimum + FluentSpacing.s + FluentSpacing.s,
    right: FluentSpacing.m + FluentTouchTarget.minimum + FluentSpacing.s,
    minWidth: 140,
    borderRadius: FluentRadius.medium,
    borderWidth: 1,
    padding: FluentSpacing.xs,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
    gap: FluentSpacing.s,
  },
  dropdownOptionLabel: {
    flex: 1,
  },
});

export default SoundCloudSearchHeader;
