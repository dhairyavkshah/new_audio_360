import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import DiscoverScreen from "@/screens/DiscoverScreen";
import SoundCloudPlaylistScreen from "@/screens/SoundCloudPlaylistScreen";
import { SoundCloudPlaylist } from "@/services/SoundCloudService";

export type DiscoverStackParamList = {
  Discover: undefined;
  SoundCloudPlaylist: { playlist: SoundCloudPlaylist };
};

const Stack = createNativeStackNavigator<DiscoverStackParamList>();

export default function DiscoverStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SoundCloudPlaylist"
        component={SoundCloudPlaylistScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
