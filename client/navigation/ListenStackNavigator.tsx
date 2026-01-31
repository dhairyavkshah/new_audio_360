import React, { useCallback, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
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
import { useThemeContext } from "@/contexts/ThemeContext";
import { 
  FluentLightColors, 
  FluentDarkColors, 
  FluentIconSize, 
  FluentTouchTarget,
  FluentControlRadius,
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
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  
  const scale = useSharedValue(1);
  const [isPressed, setIsPressed] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);
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
    setIsPressed(true);
    scale.value = withTiming(0.95, { 
      duration: FluentDuration.fast,
      easing: Easing.bezier(FluentEasingValues.easeMax.x1, FluentEasingValues.easeMax.y1, FluentEasingValues.easeMax.x2, FluentEasingValues.easeMax.y2),
    });
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scale.value = withTiming(1, { 
      duration: FluentDuration.normal,
      easing: Easing.bezier(FluentEasingValues.easeMax.x1, FluentEasingValues.easeMax.y1, FluentEasingValues.easeMax.x2, FluentEasingValues.easeMax.y2),
    });
  };

  const getBackgroundColor = () => {
    if (isPressed) return colors.colorNeutralBackground1Pressed;
    if (hoverActive) return colors.colorNeutralBackground1Hover;
    return colors.colorNeutralBackground1;
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
    <View style={backButtonStyles.container}>
      <AnimatedPressable
        onPress={handleBack}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onHoverIn={() => setHoverActive(true)}
        onHoverOut={() => setHoverActive(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          backButtonStyles.iconButton,
          { backgroundColor: getBackgroundColor() },
          focusStyle,
          animatedStyle,
        ]}
        hitSlop={{ top: FluentSpacing.xs, bottom: FluentSpacing.xs, left: FluentSpacing.xs, right: FluentSpacing.xs }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={FluentIconSize.medium}
          color={colors.colorNeutralForeground1}
        />
      </AnimatedPressable>
    </View>
  );
}

const backButtonStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: Platform.select({
      ios: FluentSpacing.s,
      android: FluentSpacing.m,
      default: FluentSpacing.m,
    }),
    paddingRight: FluentSpacing.s,
  },
  iconButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.button,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
