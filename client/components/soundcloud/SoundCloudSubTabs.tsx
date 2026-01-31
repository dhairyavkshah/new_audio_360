import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentTouchTarget, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";
import { useThemeContext } from "@/contexts/ThemeContext";

export type SubTabType = 'search' | 'likes' | 'playlists';

interface SoundCloudSubTabsProps {
  activeTab: SubTabType;
  onTabChange: (tab: SubTabType) => void;
}

const TAB_CONFIG: { id: SubTabType; label: string; icon: 'magnify' | 'heart' | 'playlist-music' }[] = [
  { id: 'search', label: 'Search', icon: 'magnify' },
  { id: 'likes', label: 'Likes', icon: 'heart' },
  { id: 'playlists', label: 'Playlists', icon: 'playlist-music' },
];

export function SoundCloudSubTabs({ activeTab, onTabChange }: SoundCloudSubTabsProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  return (
    <View style={[styles.subTabContainer, { backgroundColor: colors.colorNeutralBackground2 }]}>
      {TAB_CONFIG.map((tab) => (
        <Pressable
          key={tab.id}
          style={[
            styles.subTab,
            activeTab === tab.id && { backgroundColor: colors.colorBrandBackground },
          ]}
          onPress={() => onTabChange(tab.id)}
        >
          <MaterialCommunityIcons
            name={tab.icon}
            size={FluentIconSize.small}
            color={activeTab === tab.id ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground2}
          />
          <FluentText
            variant={activeTab === tab.id ? "caption1Strong" : "caption1"}
            style={{
              color: activeTab === tab.id ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground2,
              marginLeft: FluentSpacing.xs,
            }}
          >
            {tab.label}
          </FluentText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  subTabContainer: {
    flexDirection: 'row',
    marginHorizontal: FluentSpacing.m,
    marginTop: FluentSpacing.s,
    marginBottom: FluentSpacing.xs,
    borderRadius: FluentRadius.large,
    padding: 4,
    gap: 4,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: FluentTouchTarget.minimum,
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
  },
});

export default SoundCloudSubTabs;
