import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import LibraryScreen from "@/screens/LibraryScreen";
import RecordingsScreen from "@/screens/RecordingsScreen";
import PlaylistManagementScreen from "@/screens/PlaylistManagementScreen";
import PlaylistDetailScreen from "@/screens/PlaylistDetailScreen";

export type LibraryStackParamList = {
  Library: undefined;
  Recordings: undefined;
  PlaylistManagement: undefined;
  PlaylistDetail: { playlistId: string; playlistName: string };
};

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export default function LibraryStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          headerTitle: "Library",
        }}
      />
      <Stack.Screen
        name="Recordings"
        component={RecordingsScreen}
        options={{
          headerTitle: "My Recordings",
        }}
      />
      <Stack.Screen
        name="PlaylistManagement"
        component={PlaylistManagementScreen}
        options={{
          headerTitle: "Manage Playlists",
          headerBackTitle: "Library",
        }}
      />
      <Stack.Screen
        name="PlaylistDetail"
        component={PlaylistDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params.playlistName,
          headerBackTitle: "Library",
        })}
      />
    </Stack.Navigator>
  );
}
