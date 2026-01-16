import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { 
  FadeIn, 
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ListenStackNavigator from "@/navigation/ListenStackNavigator";
import LibraryStackNavigator from "@/navigation/LibraryStackNavigator";
import RadioStackNavigator from "@/navigation/RadioStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import { MiniPlayer } from "@/components/MiniPlayer";
import { useThemeContext, useSkin, useThemeTokens } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { getTabBarStyle } from "@/lib/themeUtils";
import {
  FluentSpacing,
  FluentIconSize,
  FluentTypography,
  FluentDuration,
} from "@/constants/fluent2";

export type MainTabParamList = {
  ListenTab: undefined;
  LibraryTab: undefined;
  RadioTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({
  iconKey,
  color,
  focused,
  isDark,
}: {
  iconKey: 'listen' | 'library' | 'radio' | 'settings';
  color: string;
  focused: boolean;
  isDark: boolean;
}) {
  const skin = useSkin();
  const tokens = useThemeTokens();
  const indicatorScale = useSharedValue(focused ? 1 : 0);
  const iconScale = useSharedValue(1);
  
  React.useEffect(() => {
    indicatorScale.value = withSpring(focused ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
    iconScale.value = withSpring(focused ? 1.05 : 1, {
      damping: 15,
      stiffness: 200,
    });
  }, [focused]);
  
  const iconMap = {
    listen: focused ? skin.icons.tabListenFocused : skin.icons.tabListen,
    library: focused ? skin.icons.tabLibraryFocused : skin.icons.tabLibrary,
    radio: focused ? skin.icons.tabRadioFocused : skin.icons.tabRadio,
    settings: focused ? skin.icons.tabSettingsFocused : skin.icons.tabSettings,
  };
  
  const iconName = iconMap[iconKey] as keyof typeof MaterialCommunityIcons.glyphMap;
  
  const activeIndicatorColor = tokens.colors.primary;
  const activeIconColor = tokens.colors.onPrimary;
  
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: indicatorScale.value },
      { scaleY: indicatorScale.value },
    ],
    opacity: indicatorScale.value,
  }));
  
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));
  
  return (
    <View style={styles.tabIconContainer}>
      <Animated.View
        style={[
          styles.m3ActiveIndicator,
          { backgroundColor: activeIndicatorColor },
          indicatorStyle,
        ]}
      />
      <Animated.View style={[styles.tabIcon, iconAnimatedStyle]}>
        <MaterialCommunityIcons
          name={iconName}
          size={FluentIconSize.medium}
          color={focused ? activeIconColor : color}
        />
      </Animated.View>
    </View>
  );
}

const TAB_BAR_HEIGHT = 56;
const MIN_BOTTOM_PADDING = 16;

export default function MainTabNavigator() {
  const { isDark } = useThemeContext();
  const tokens = useThemeTokens();
  const { playTapSound } = useUiSound();
  const { currentSong } = usePlayerContext();
  const { isNowPlayingVisible } = useNavigationContext();
  const [currentTab, setCurrentTab] = useState<string>("ListenTab");
  const insets = useSafeAreaInsets();
  
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, MIN_BOTTOM_PADDING) : insets.bottom;
  const tabBarHeight = TAB_BAR_HEIGHT + safeBottom;
  const showMiniPlayer = currentSong && currentTab !== "SettingsTab" && currentTab !== "RadioTab" && !isNowPlayingVisible;

  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      initialRouteName="ListenTab"
      screenOptions={{
        tabBarActiveTintColor: tokens.colors.primary,
        tabBarInactiveTintColor: tokens.colors.textSecondary,
        tabBarStyle: {
          position: "absolute",
          height: tabBarHeight,
          paddingBottom: safeBottom > 0 ? safeBottom : FluentSpacing.s,
          paddingTop: FluentSpacing.xs,
          ...getTabBarStyle(tokens),
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: FluentTypography.caption1.fontSize,
          fontWeight: FluentTypography.caption1.fontWeight as any,
          marginTop: FluentSpacing.xxs,
        },
        tabBarItemStyle: {
          paddingVertical: FluentSpacing.xs,
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
              isDark={isDark}
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
              isDark={isDark}
            />
          ),
        }}
      />
      <Tab.Screen
        name="RadioTab"
        component={RadioStackNavigator}
        options={{
          title: "Radio",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconKey="radio"
              color={color}
              focused={focused}
              isDark={isDark}
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
              isDark={isDark}
            />
          ),
        }}
      />
    </Tab.Navigator>
    {showMiniPlayer ? (
      <Animated.View 
        entering={FadeIn.duration(FluentDuration.normal)}
        exiting={FadeOut.duration(FluentDuration.normal)}
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
    alignItems: "center",
    justifyContent: "center",
  },
});
