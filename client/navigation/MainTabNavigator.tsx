import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import ListenStackNavigator from "@/navigation/ListenStackNavigator";
import LibraryStackNavigator from "@/navigation/LibraryStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import { MiniPlayer } from "@/components/MiniPlayer";
import { useThemeContext, useSkin } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { Layout, Spacing, Typography, Motion } from "@/constants/theme";

export type MainTabParamList = {
  ListenTab: undefined;
  LibraryTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({
  iconKey,
  color,
  focused,
}: {
  iconKey: 'listen' | 'library' | 'settings';
  color: string;
  focused: boolean;
}) {
  const { theme } = useThemeContext();
  const skin = useSkin();
  
  const iconMap = {
    listen: focused ? skin.icons.tabListenFocused : skin.icons.tabListen,
    library: focused ? skin.icons.tabLibraryFocused : skin.icons.tabLibrary,
    settings: focused ? skin.icons.tabSettingsFocused : skin.icons.tabSettings,
  };
  
  const iconName = iconMap[iconKey] as keyof typeof MaterialCommunityIcons.glyphMap;
  
  const themeAny = theme as any;
  const activeIndicatorColor = themeAny.secondaryContainer || (theme.primary + "24");
  const activeIconColor = themeAny.onSecondaryContainer || color;
  
  return (
    <View style={styles.tabIconContainer}>
      {focused ? (
        <Animated.View
          style={[
            styles.m3ActiveIndicator,
            { backgroundColor: activeIndicatorColor },
          ]}
        />
      ) : null}
      <MaterialCommunityIcons
        name={iconName}
        size={24}
        color={focused ? activeIconColor : color}
        style={styles.tabIcon}
      />
    </View>
  );
}

export default function MainTabNavigator() {
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  const { currentSong } = usePlayerContext();
  const { isNowPlayingVisible } = useNavigationContext();
  const [currentTab, setCurrentTab] = useState<string>("ListenTab");
  
  const tabBarHeight = Platform.OS === "ios" ? Layout.bottomNavHeight + 20 : Layout.bottomNavHeight;
  const showMiniPlayer = currentSong && currentTab !== "SettingsTab" && !isNowPlayingVisible;

  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      initialRouteName="ListenTab"
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.onSurfaceVariant,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: theme.surfaceContainer,
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === "ios" ? Layout.bottomNavHeight + 20 : Layout.bottomNavHeight,
          paddingBottom: Platform.OS === "ios" ? Spacing.l : Spacing.s,
          paddingTop: Spacing.s,
          shadowColor: theme.scrim,
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: Typography.labelSmall.fontSize,
          fontWeight: Typography.labelSmall.fontWeight,
          marginTop: Spacing.titleToSubtitle,
        },
        tabBarItemStyle: {
          paddingVertical: Spacing.s,
        },
      }}
      screenListeners={{
        tabPress: (e) => {
          playTapSound();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const tabName = e.target?.split("-")[0];
          if (tabName) {
            setCurrentTab(tabName);
          }
        },
      }}
    >
      <Tab.Screen
        name="ListenTab"
        component={ListenStackNavigator}
        options={{
          title: "Listen",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconKey="listen"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryStackNavigator}
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconKey="library"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackNavigator}
        options={{
          title: "Settings",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconKey="settings"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tab.Navigator>
    {showMiniPlayer ? (
      <Animated.View 
        entering={FadeIn.duration(Motion.duration.normal)}
        exiting={FadeOut.duration(Motion.duration.normal)}
      >
        <MiniPlayer bottomOffset={tabBarHeight} />
      </Animated.View>
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 32,
  },
  m3ActiveIndicator: {
    position: "absolute",
    width: 64,
    height: 32,
    borderRadius: 16,
  },
  tabIcon: {
    zIndex: 1,
  },
});
