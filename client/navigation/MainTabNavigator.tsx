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
import ListenStackNavigator from "@/navigation/ListenStackNavigator";
import LibraryStackNavigator from "@/navigation/LibraryStackNavigator";
import SettingsStackNavigator from "@/navigation/SettingsStackNavigator";
import { MiniPlayer } from "@/components/MiniPlayer";
import { useThemeContext, useSkin } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { usePlayerContext } from "@/contexts/PlayerContext";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { Layout, Spacing, Typography, Motion, M3Motion, M3Elevation } from "@/constants/theme";

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
    settings: focused ? skin.icons.tabSettingsFocused : skin.icons.tabSettings,
  };
  
  const iconName = iconMap[iconKey] as keyof typeof MaterialCommunityIcons.glyphMap;
  
  const activeIndicatorColor = theme.secondaryContainer;
  const activeIconColor = theme.onSecondaryContainer;
  
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
          size={24}
          color={focused ? activeIconColor : color}
        />
      </Animated.View>
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
          borderTopWidth: 1,
          borderTopColor: theme.outlineVariant,
          height: Platform.OS === "ios" ? Layout.bottomNavHeight + 20 : Layout.bottomNavHeight,
          paddingBottom: Platform.OS === "ios" ? Spacing.l : Spacing.s,
          paddingTop: Spacing.s,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
            },
            android: {
              elevation: M3Elevation.level3.elevation,
            },
            default: {},
          }),
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: Typography.labelMedium.fontSize,
          fontWeight: Typography.labelMedium.fontWeight,
          letterSpacing: Typography.labelMedium.letterSpacing,
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
    alignItems: "center",
    justifyContent: "center",
  },
});
