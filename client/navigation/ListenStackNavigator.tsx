import React, { useCallback } from "react";
import { Platform, Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentLightColors, FluentDarkColors, FluentIconSize, FluentTouchTarget } from "@/constants/fluent2";
import ListenScreen from "@/screens/ListenScreen";
import NowPlayingScreen from "@/screens/NowPlayingScreen";
import SoundLabScreen from "@/screens/SoundLabScreen";
import QueueScreen from "@/screens/QueueScreen";

function NowPlayingBackButton() {
  const navigation = useNavigation<any>();
  const { nowPlayingSource, setNowPlayingSource } = useNavigationContext();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;

  const handleBack = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (nowPlayingSource?.tab && nowPlayingSource.tab !== 'ListenTab') {
      setNowPlayingSource(null);
      navigation.navigate("Main", {
        screen: nowPlayingSource.tab,
        params: nowPlayingSource.screen ? {
          screen: nowPlayingSource.screen,
          params: nowPlayingSource.params,
        } : undefined,
      });
    } else {
      setNowPlayingSource(null);
      navigation.goBack();
    }
  }, [navigation, nowPlayingSource, setNowPlayingSource]);

  return (
    <Pressable
      onPress={handleBack}
      style={{
        width: FluentTouchTarget.minimum,
        height: FluentTouchTarget.minimum,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: -8,
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <MaterialCommunityIcons
        name="arrow-left"
        size={FluentIconSize.medium}
        color={colors.colorNeutralForeground1}
      />
    </Pressable>
  );
}

export type ListenStackParamList = {
  Listen: undefined;
  NowPlaying: { songId: string };
  SoundLab: undefined;
  Queue: undefined;
};

const Stack = createNativeStackNavigator<ListenStackParamList>();

export default function ListenStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Listen"
        component={ListenScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="NowPlaying"
        component={NowPlayingScreen}
        options={{
          headerTitle: "Now Playing",
          headerTransparent: Platform.OS === 'ios',
          headerLeft: () => <NowPlayingBackButton />,
        }}
      />
      <Stack.Screen
        name="SoundLab"
        component={SoundLabScreen}
        options={{
          headerTitle: "Sound Lab",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="Queue"
        component={QueueScreen}
        options={{
          headerTitle: "Play Queue",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
