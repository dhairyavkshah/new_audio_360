import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import LibraryScreen from "@/screens/LibraryScreen";
import RecordingsScreen from "@/screens/RecordingsScreen";
import PlaylistManagementScreen from "@/screens/PlaylistManagementScreen";
import PlaylistDetailScreen from "@/screens/PlaylistDetailScreen";
import AlbumDetailScreen from "@/screens/AlbumDetailScreen";
import ArtistDetailScreen from "@/screens/ArtistDetailScreen";

export interface Album {
  id: string;
  name: string;
  artist: string;
  artwork: string;
  songCount: number;
  songs?: any[];
}

export interface Artist {
  id: string;
  name: string;
  artwork: string;
  songCount: number;
  songs?: any[];
}

export type LibraryStackParamList = {
  Library: undefined;
  Recordings: undefined;
  PlaylistManagement: undefined;
  PlaylistDetail: { playlistId: string; playlistName: string };
  AlbumDetail: { album: Album };
  ArtistDetail: { artist: Artist };
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
          headerShown: false,
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
      <Stack.Screen
        name="AlbumDetail"
        component={AlbumDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params.album.name,
          headerBackTitle: "Library",
        })}
      />
      <Stack.Screen
        name="ArtistDetail"
        component={ArtistDetailScreen}
        options={({ route }) => ({
          headerTitle: route.params.artist.name,
          headerBackTitle: "Library",
        })}
      />
    </Stack.Navigator>
  );
}
