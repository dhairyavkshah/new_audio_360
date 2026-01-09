import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import ListenScreen from "@/screens/ListenScreen";
import NowPlayingScreen from "@/screens/NowPlayingScreen";
import SoundLabScreen from "@/screens/SoundLabScreen";
import QueueScreen from "@/screens/QueueScreen";

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
          headerTransparent: true,
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
