import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText } from "@/components/fluent";
import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentRadius, FluentTouchTarget, FluentControlRadius, FluentIconSize } from "@/constants/fluent2";
import ArchiveTabScreen from "./ArchiveTabScreen";
import SoundCloudTabScreen from "./SoundCloudTabScreen";

type TabType = 'archive' | 'soundcloud';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemedColors();
  
  const [activeTab, setActiveTab] = useState<TabType>('archive');
  
  useEffect(() => {
    if (Platform.OS === 'web') {
      const hasOAuthResult = sessionStorage.getItem('soundcloud_oauth_result');
      const hasOAuthError = sessionStorage.getItem('soundcloud_oauth_error');
      if (hasOAuthResult || hasOAuthError) {
        setActiveTab('soundcloud');
      }
    }
  }, []);

  const tabs: { key: TabType; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
    { key: 'archive', label: 'Archive', icon: 'archive' },
    { key: 'soundcloud', label: 'SoundCloud', icon: 'soundcloud' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.colorNeutralBackground1 }]}>
      <View style={[styles.header, { paddingTop: insets.top + FluentSpacing.s }]}>
        <FluentText variant="title2">
          Discover
        </FluentText>
        
        <View style={[styles.tabBar, { backgroundColor: colors.colorNeutralBackground3 }]}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[
                  styles.tab,
                  isActive && { backgroundColor: colors.colorBrandBackground },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={FluentIconSize.small}
                  color={isActive ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground2}
                />
                <FluentText
                  variant={isActive ? "body2Strong" : "body2"}
                  style={{ color: isActive ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground2 }}
                >
                  {tab.label}
                </FluentText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'archive' ? <ArchiveTabScreen /> : <SoundCloudTabScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: FluentSpacing.l,
    paddingBottom: FluentSpacing.m,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: FluentRadius.medium,
    padding: FluentSpacing.xs,
    marginTop: FluentSpacing.s,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: FluentTouchTarget.minimum,
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.button,
    gap: FluentSpacing.xs,
  },
  content: {
    flex: 1,
  },
});
