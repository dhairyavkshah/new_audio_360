import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Song } from "@/lib/data";
import { PlayableSong } from "@/contexts/PlayerContext";
import {
  Playlist,
  getPlaylists,
  addPlaylist,
  addSongToPlaylist,
} from "@/lib/storage";

interface SongContextMenuProps {
  visible: boolean;
  song: PlayableSong | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onHideSong?: (songId: string) => Promise<void>;
  showHideOption?: boolean;
}

type MenuView = "main" | "selectPlaylist" | "createPlaylist";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function SongContextMenu({ visible, song, onClose, onSuccess, onHideSong, showHideOption = false }: SongContextMenuProps) {
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  const [menuView, setMenuView] = useState<MenuView>("main");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleHideSong = async () => {
    if (!song || !onHideSong) return;
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      await onHideSong(song.id);
      onSuccess?.(`"${song.title}" hidden from library`);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlaylists = useCallback(async () => {
    const data = await getPlaylists();
    setPlaylists(data);
  }, []);

  useEffect(() => {
    if (visible) {
      loadPlaylists();
      setMenuView("main");
      setNewPlaylistName("");
    }
  }, [visible, loadPlaylists]);

  const handleClose = () => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (!song) return;
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      await addSongToPlaylist(playlist.id, song.id);
      onSuccess?.(`Added "${song.title}" to ${playlist.name}`);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!song || !newPlaylistName.trim()) return;
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name: newPlaylistName.trim(),
        songIds: [song.id],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await addPlaylist(newPlaylist);
      onSuccess?.(`Created "${newPlaylistName.trim()}" with "${song.title}"`);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (view: MenuView) => {
    playTapSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuView(view);
  };

  if (!visible || !song) return null;

  const renderMainMenu = () => (
    <View style={styles.menuContent}>
      <View style={styles.songHeader}>
        <Image source={{ uri: song.artwork }} style={styles.songArtwork} />
        <View style={styles.songInfo}>
          <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "600" }}>
            {song.title}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {song.artist}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.surfaceVariant }]} />

      <Pressable
        style={[styles.menuItem, { backgroundColor: theme.surface }]}
        onPress={() => handleNavigate("selectPlaylist")}
      >
        <View style={[styles.menuItemIcon, { backgroundColor: theme.primary + "20" }]}>
          <MaterialCommunityIcons name="playlist-plus" size={20} color={theme.primary} />
        </View>
        <View style={styles.menuItemText}>
          <ThemedText type="body">Add to Playlist</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"} available
          </ThemedText>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        style={[styles.menuItem, { backgroundColor: theme.surface }]}
        onPress={() => handleNavigate("createPlaylist")}
      >
        <View style={[styles.menuItemIcon, { backgroundColor: theme.success + "20" }]}>
          <MaterialCommunityIcons name="playlist-music" size={20} color={theme.success} />
        </View>
        <View style={styles.menuItemText}>
          <ThemedText type="body">Create New Playlist</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Start a new collection with this song
          </ThemedText>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>

      {showHideOption && onHideSong && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.surfaceVariant }]} />
          <Pressable
            style={[styles.menuItem, { backgroundColor: theme.surface }]}
            onPress={handleHideSong}
            disabled={isLoading}
          >
            <View style={[styles.menuItemIcon, { backgroundColor: theme.error + "20" }]}>
              <MaterialCommunityIcons name="eye-off" size={20} color={theme.error} />
            </View>
            <View style={styles.menuItemText}>
              <ThemedText type="body">Hide from Library</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Remove this song from your All Songs list
              </ThemedText>
            </View>
          </Pressable>
        </>
      )}
    </View>
  );

  const renderPlaylistSelection = () => (
    <View style={styles.menuContent}>
      <Pressable style={styles.backHeader} onPress={() => handleNavigate("main")}>
        <MaterialCommunityIcons name="arrow-left" size={20} color={theme.text} />
        <ThemedText type="body" style={{ marginLeft: Spacing.sm, fontWeight: "600" }}>
          Select Playlist
        </ThemedText>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: theme.surfaceVariant }]} />

      {playlists.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="playlist-music" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            No playlists yet
          </ThemedText>
          <Pressable
            style={[styles.createButton, { backgroundColor: theme.primary }]}
            onPress={() => handleNavigate("createPlaylist")}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF", marginLeft: Spacing.xs }}>
              Create Playlist
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.playlistList} showsVerticalScrollIndicator={false}>
          {playlists.map((playlist) => {
            const isAlreadyAdded = playlist.songIds.includes(song.id);
            return (
              <Pressable
                key={playlist.id}
                style={[
                  styles.playlistItem,
                  { backgroundColor: theme.surface },
                  isAlreadyAdded && { opacity: 0.5 },
                ]}
                onPress={() => !isAlreadyAdded && handleAddToPlaylist(playlist)}
                disabled={isAlreadyAdded || isLoading}
              >
                <View style={[styles.playlistIcon, { backgroundColor: theme.primary + "15" }]}>
                  <MaterialCommunityIcons name="playlist-music" size={24} color={theme.primary} />
                </View>
                <View style={styles.playlistInfo}>
                  <ThemedText type="body" numberOfLines={1}>
                    {playlist.name}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {playlist.songIds.length} {playlist.songIds.length === 1 ? "song" : "songs"}
                    {isAlreadyAdded ? " • Already added" : ""}
                  </ThemedText>
                </View>
                {isAlreadyAdded ? (
                  <MaterialCommunityIcons name="check-circle" size={20} color={theme.success} />
                ) : (
                  <MaterialCommunityIcons name="plus-circle-outline" size={20} color={theme.primary} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const renderCreatePlaylist = () => (
    <KeyboardAwareScrollViewCompat>
      <View style={styles.menuContent}>
        <Pressable style={styles.backHeader} onPress={() => handleNavigate("main")}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={theme.text} />
          <ThemedText type="body" style={{ marginLeft: Spacing.sm, fontWeight: "600" }}>
            Create New Playlist
          </ThemedText>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.surfaceVariant }]} />

        <View style={styles.createForm}>
          <View style={styles.songPreview}>
            <Image source={{ uri: song.artwork }} style={styles.previewArtwork} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
              First song: {song.title}
            </ThemedText>
          </View>

          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
            Playlist Name
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.surfaceVariant,
                color: theme.text,
                borderColor: theme.surfaceVariant,
              },
            ]}
            placeholder="Enter playlist name..."
            placeholderTextColor={theme.textSecondary}
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreatePlaylist}
          />

          <Pressable
            style={[
              styles.createSubmitButton,
              { backgroundColor: newPlaylistName.trim() ? theme.primary : theme.surfaceVariant },
            ]}
            onPress={handleCreatePlaylist}
            disabled={!newPlaylistName.trim() || isLoading}
          >
            <MaterialCommunityIcons
              name="playlist-plus"
              size={20}
              color={newPlaylistName.trim() ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              type="body"
              style={{
                color: newPlaylistName.trim() ? "#FFFFFF" : theme.textSecondary,
                marginLeft: Spacing.sm,
                fontWeight: "600",
              }}
            >
              {isLoading ? "Creating..." : "Create Playlist"}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.5)" }]}
      >
        <Pressable style={styles.backdropPressable} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(20).stiffness(200)}
        exiting={SlideOutDown.duration(200)}
        style={[styles.menuContainer, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={[styles.handle, { backgroundColor: theme.textSecondary + "40" }]} />
        {menuView === "main" && renderMainMenu()}
        {menuView === "selectPlaylist" && renderPlaylistSelection()}
        {menuView === "createPlaylist" && renderCreatePlaylist()}

        <Pressable
          style={[styles.cancelButton, { backgroundColor: theme.surfaceVariant }]}
          onPress={handleClose}
        >
          <ThemedText type="body" style={{ fontWeight: "500" }}>
            Cancel
          </ThemedText>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropPressable: {
    flex: 1,
  },
  menuContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl + 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  menuContent: {
    paddingHorizontal: Spacing.lg,
  },
  songHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  songArtwork: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
  },
  songInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  backHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  playlistList: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  playlistInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  createForm: {
    paddingVertical: Spacing.sm,
  },
  songPreview: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  previewArtwork: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
  },
  textInput: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.body.fontSize,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  createSubmitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: BorderRadius.md,
  },
  cancelButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
});
