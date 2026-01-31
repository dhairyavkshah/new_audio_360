import React from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
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

  return (
    <>
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.colorNeutralBackground2 }]}>
          <MaterialCommunityIcons name="magnify" size={FluentIconSize.regular} color={colors.colorNeutralForeground3} />
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
          style={[styles.searchButton, { backgroundColor: colors.colorBrandBackground }]}
          onPress={onSearch}
        >
          <MaterialCommunityIcons name="magnify" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
        </Pressable>
      </View>

      <View style={[styles.searchTypeContainer, { backgroundColor: colors.colorNeutralBackground2 }]}>
        {SEARCH_TYPE_CONFIG.map((type) => (
          <Pressable
            key={type.id}
            style={[
              styles.searchTypeChip,
              searchType === type.id && { backgroundColor: colors.colorBrandBackground },
            ]}
            onPress={() => onSearchTypeChange(type.id)}
          >
            <MaterialCommunityIcons
              name={type.icon}
              size={FluentIconSize.small}
              color={searchType === type.id ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground2}
            />
            <FluentText
              variant={searchType === type.id ? "caption1Strong" : "caption1"}
              style={{
                color: searchType === type.id ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground2,
                marginLeft: FluentSpacing.xs,
              }}
            >
              {type.label}
            </FluentText>
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: FluentSpacing.m,
    paddingVertical: FluentSpacing.s,
    gap: FluentSpacing.s,
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
    fontSize: 16,
  },
  searchButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchTypeContainer: {
    flexDirection: 'row',
    marginHorizontal: FluentSpacing.m,
    marginBottom: FluentSpacing.s,
    borderRadius: FluentRadius.large,
    padding: 4,
    gap: 4,
  },
  searchTypeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FluentSpacing.xs,
    paddingHorizontal: FluentSpacing.s,
    borderRadius: FluentControlRadius.button,
  },
});

export default SoundCloudSearchHeader;
