import React, { useState, memo, useCallback, useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, StyleSheet, View, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ListenStackNavigator from "@/navigation/ListenStackNavigator";
import LibraryStackNavigator from "@/navigation/LibraryStackNavigator";
import RadioStackNavigator from "@/navigation/RadioStackNavigator";
import DiscoverStackNavigator from "@/navigation/DiscoverStackNavigator";
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
  FluentControlRadius,
  FluentLayoutSize,
} from "@/constants/fluent2";

export type MainTabParamList = {
  ListenTab: undefined;
  LibraryTab: undefined;
  RadioTab: undefined;
  DiscoverTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabIcon = memo(function TabIcon({
  iconKey,
  color,
  focused,
}: {
  iconKey: 'listen' | 'library' | 'radio' | 'discover' | 'settings';
  color: string;
  focused: boolean;
  isDark?: boolean;
}) {
  const skin = useSkin();
  const tokens = useThemeTokens();
  
  const iconMap = {
    listen: focused ? skin.icons.tabListenFocused : skin.icons.tabListen,
    library: focused ? skin.icons.tabLibraryFocused : skin.icons.tabLibrary,
    radio: focused ? skin.icons.tabRadioFocused : skin.icons.tabRadio,
    discover: focused ? skin.icons.tabDiscoverFocused : skin.icons.tabDiscover,
    settings: focused ? skin.icons.tabSettingsFocused : skin.icons.tabSettings,
  };
  
  const iconName = iconMap[iconKey] as keyof typeof MaterialCommunityIcons.glyphMap;
  const activeIndicatorColor = tokens.colors.primary;
  const activeIconColor = tokens.colors.onPrimary;
  
  return (
    <View style={styles.tabIconContainer}>
      {focused && (
        <View
          style={[
            styles.m3ActiveIndicator,
            { backgroundColor: activeIndicatorColor },
          ]}
        />
      )}
      <View style={styles.tabIcon}>
        <MaterialCommunityIcons
          name={iconName}
          size={FluentIconSize.medium}
          color={focused ? activeIconColor : color}
        />
      </View>
    </View>
  );
});

const TAB_BAR_HEIGHT = FluentLayoutSize.bottomNavHeight;
const MIN_BOTTOM_PADDING = FluentSpacing.l;

function MainTabNavigator() {
  const { isDark } = useThemeContext();
  const tokens = useThemeTokens();
  const { playTapSound } = useUiSound();
  const { currentSong } = usePlayerContext();
  const { isNowPlayingVisible } = useNavigationContext();
  const [currentTab, setCurrentTab] = useState<string>("ListenTab");
  const [isMiniPlayerDismissed, setIsMiniPlayerDismissed] = useState(false);
  const insets = useSafeAreaInsets();
  
  const safeBottom = useMemo(() => Platform.OS === 'android' ? Math.max(insets.bottom, MIN_BOTTOM_PADDING) : insets.bottom, [insets.bottom]);
  const tabBarHeight = useMemo(() => TAB_BAR_HEIGHT + safeBottom, [safeBottom]);
  const showMiniPlayer = useMemo(() => currentSong && !isNowPlayingVisible, [currentSong, isNowPlayingVisible]);
  
  const handleMiniPlayerDismiss = useCallback(() => setIsMiniPlayerDismissed(true), []);
  const handleMiniPlayerRestore = useCallback(() => setIsMiniPlayerDismissed(false), []);

  // No animation - just show/hide based on state

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
        tabBarButton: ({ 
          children, 
          onPress, 
          onLongPress,
          onPressIn,
          onPressOut,
          style, 
          accessibilityLabel, 
          accessibilityRole, 
          accessibilityState,
          accessibilityHint,
          disabled,
          testID 
        }) => (
          <TouchableOpacity
            onPress={onPress ?? undefined}
            onLongPress={onLongPress ?? undefined}
            onPressIn={onPressIn ?? undefined}
            onPressOut={onPressOut ?? undefined}
            style={style}
            activeOpacity={1}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole={accessibilityRole}
            accessibilityState={accessibilityState}
            accessibilityHint={accessibilityHint}
            disabled={disabled ?? undefined}
            testID={testID}
          >
            {children}
          </TouchableOpacity>
        ),
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
        name="DiscoverTab"
        component={DiscoverStackNavigator}
        options={{
          title: "Discover",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              iconKey="discover"
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
      <MiniPlayer 
        bottomOffset={tabBarHeight} 
        isDismissed={isMiniPlayerDismissed}
        onDismiss={handleMiniPlayerDismiss}
        onRestore={handleMiniPlayerRestore}
      />
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
    borderRadius: FluentControlRadius.fab,
  },
  tabIcon: {
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default memo(MainTabNavigator);
