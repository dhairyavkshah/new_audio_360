import React, { useCallback, useState } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import { 
  FluentIconSize, 
  FluentTouchTarget,
  FluentDuration,
  FluentEasingValues,
  FluentSpacing,
} from "@/constants/fluent2";
import ListenScreen from "@/screens/ListenScreen";
import NowPlayingScreen from "@/screens/NowPlayingScreen";
import SoundLabScreen from "@/screens/SoundLabScreen";
import QueueScreen from "@/screens/QueueScreen";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function NowPlayingBackButton() {
  const navigation = useNavigation<any>();
  const { nowPlayingSource, setNowPlayingSource } = useNavigationContext();
  const colors = useThemedColors();
  
  const scale = useSharedValue(1);
  const [isFocused, setIsFocused] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { 
      duration: FluentDuration.fast,
      easing: Easing.bezier(FluentEasingValues.easeMax.x1, FluentEasingValues.easeMax.y1, FluentEasingValues.easeMax.x2, FluentEasingValues.easeMax.y2),
    });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { 
      duration: FluentDuration.normal,
      easing: Easing.bezier(FluentEasingValues.easeMax.x1, FluentEasingValues.easeMax.y1, FluentEasingValues.easeMax.x2, FluentEasingValues.easeMax.y2),
    });
  };

  const focusStyle = isFocused ? Platform.select({
    web: {
      outline: `2px solid ${colors.colorBrandForeground1}`,
      outlineOffset: 2,
    },
    default: {
      borderWidth: 2,
      borderColor: colors.colorBrandForeground1,
    },
  }) : {};

  return (
    <AnimatedPressable
      onPress={handleBack}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={[
        backButtonStyles.iconButton,
        focusStyle,
        animatedStyle,
      ]}
      hitSlop={{ top: FluentSpacing.s, bottom: FluentSpacing.s, left: FluentSpacing.s, right: FluentSpacing.s }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <MaterialCommunityIcons
        name="arrow-left"
        size={FluentIconSize.medium}
        color={colors.colorNeutralForeground1}
      />
    </AnimatedPressable>
  );
}

const backButtonStyles = StyleSheet.create({
  iconButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
});

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
