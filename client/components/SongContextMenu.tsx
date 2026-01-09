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
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Button } from "@/components/Button";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import { Spacing, BorderRadius, FluentMotion, FluentShadow, Typography } from "@/constants/theme";
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

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const MENU_ITEM_HEIGHT = 44;
const ICON_SIZE = 20;
const ICON_GAP = 12;

const getFluentShadowStyle = (shadow: typeof FluentShadow.shadow8) => {
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: shadow.key.x, height: shadow.key.y },
      shadowOpacity: 0.14,
      shadowRadius: shadow.key.blur,
    },
    android: {
      elevation: shadow.elevation,
    },
    default: {
      boxShadow: shadow.combined,
    },
  }) || {};
};

export function SongContextMenu({ visible, song, onClose, onSuccess, onHideSong, showHideOption = false }: SongContextMenuProps) {
  const { theme } = useThemeContext();
  const { playTapSound } = useUiSound();
  const insets = useSafeAreaInsets();
  const [menuView, setMenuView] = useState<MenuView>("main");
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const translateY = useSharedValue(300);
  const backdropOpacity = useSharedValue(0);
  const [isRendered, setIsRendered] = useState(visible);

  const handleAnimationComplete = useCallback((toVisible: boolean) => {
    if (!toVisible) {
      setIsRendered(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      translateY.value = withTiming(0, {
        duration: FluentMotion.duration.normal,
        easing: Easing.bezier(
          FluentMotion.easing.decelerateMax.x1,
          FluentMotion.easing.decelerateMax.y1,
          FluentMotion.easing.decelerateMax.x2,
          FluentMotion.easing.decelerateMax.y2
        ),
      });
      backdropOpacity.value = withTiming(1, {
        duration: FluentMotion.duration.fast,
      });
    } else if (isRendered) {
      translateY.value = withTiming(300, {
        duration: FluentMotion.duration.fast,
        easing: Easing.bezier(
          FluentMotion.easing.accelerate.x1,
          FluentMotion.easing.accelerate.y1,
          FluentMotion.easing.accelerate.x2,
          FluentMotion.easing.accelerate.y2
        ),
      }, () => {
        runOnJS(handleAnimationComplete)(false);
      });
      backdropOpacity.value = withTiming(0, {
        duration: FluentMotion.duration.fast,
      });
    }
  }, [visible]);

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleHideSong = async () => {
    if (!song || !onHideSong) return;
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (!song) return;
    playTapSound();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setMenuView(view);
  };

  if (!isRendered || !song) return null;

  const safeBottomPadding = Math.max(insets.bottom, Spacing.xl);

  const renderMainMenu = () => (
    <View style={styles.menuContent}>
      <View style={styles.songHeader}>
        <Image source={{ uri: song.artwork }} style={styles.songArtwork} />
        <View style={styles.songInfo}>
          <ThemedText type="title4" numberOfLines={1}>
            {song.title}
          </ThemedText>
          <ThemedText type="bodyMedium" style={{ color: theme.onSurfaceVariant }}>
            {song.artist}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.divider }]} />

      <Pressable
        style={({ pressed }) => [
          styles.menuItem,
          { backgroundColor: pressed ? theme.surfaceContainerHighest : "transparent" },
        ]}
        onPress={() => handleNavigate("selectPlaylist")}
      >
        <View style={[styles.menuItemIcon, { backgroundColor: theme.primary + "20" }]}>
          <MaterialCommunityIcons name="playlist-plus" size={ICON_SIZE} color={theme.primary} />
        </View>
        <View style={styles.menuItemText}>
          <ThemedText type="bodyMedium">Add to Playlist</ThemedText>
          <ThemedText type="bodySmall" style={{ color: theme.onSurfaceVariant }}>
            {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"} available
          </ThemedText>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={ICON_SIZE} color={theme.onSurfaceVariant} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.menuItem,
          { backgroundColor: pressed ? theme.surfaceContainerHighest : "transparent" },
        ]}
        onPress={() => handleNavigate("createPlaylist")}
      >
        <View style={[styles.menuItemIcon, { backgroundColor: theme.success + "20" }]}>
          <MaterialCommunityIcons name="playlist-music" size={ICON_SIZE} color={theme.success} />
        </View>
        <View style={styles.menuItemText}>
          <ThemedText type="bodyMedium">Create New Playlist</ThemedText>
          <ThemedText type="bodySmall" style={{ color: theme.onSurfaceVariant }}>
            Start a new collection with this song
          </ThemedText>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={ICON_SIZE} color={theme.onSurfaceVariant} />
      </Pressable>

      {showHideOption && onHideSong && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              { backgroundColor: pressed ? theme.surfaceContainerHighest : "transparent" },
            ]}
            onPress={handleHideSong}
            disabled={isLoading}
          >
            <View style={[styles.menuItemIcon, { backgroundColor: theme.error + "20" }]}>
              <MaterialCommunityIcons name="eye-off" size={ICON_SIZE} color={theme.error} />
            </View>
            <View style={styles.menuItemText}>
              <ThemedText type="bodyMedium">Hide from Library</ThemedText>
              <ThemedText type="bodySmall" style={{ color: theme.onSurfaceVariant }}>
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
        <MaterialCommunityIcons name="arrow-left" size={ICON_SIZE} color={theme.onSurface} />
        <ThemedText type="title4" style={{ marginLeft: ICON_GAP }}>
          Select Playlist
        </ThemedText>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: theme.divider }]} />

      {playlists.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="playlist-music" size={48} color={theme.onSurfaceVariant} />
          <ThemedText type="bodyMedium" style={{ color: theme.onSurfaceVariant, marginTop: Spacing.m }}>
            No playlists yet
          </ThemedText>
          <Button
            variant="default"
            size="default"
            onPress={() => handleNavigate("createPlaylist")}
            style={{ marginTop: Spacing.l }}
          >
            Create Playlist
          </Button>
        </View>
      ) : (
        <ScrollView style={styles.playlistList} showsVerticalScrollIndicator={false}>
          {playlists.map((playlist) => {
            const isAlreadyAdded = playlist.songIds.includes(song.id);
            return (
              <Pressable
                key={playlist.id}
                style={({ pressed }) => [
                  styles.playlistItem,
                  { backgroundColor: pressed ? theme.surfaceContainerHighest : "transparent" },
                  isAlreadyAdded && { opacity: 0.5 },
                ]}
                onPress={() => !isAlreadyAdded && handleAddToPlaylist(playlist)}
                disabled={isAlreadyAdded || isLoading}
              >
                <View style={[styles.playlistIcon, { backgroundColor: theme.primary + "15" }]}>
                  <MaterialCommunityIcons name="playlist-music" size={24} color={theme.primary} />
                </View>
                <View style={styles.playlistInfo}>
                  <ThemedText type="bodyMedium" numberOfLines={1}>
                    {playlist.name}
                  </ThemedText>
                  <ThemedText type="bodySmall" style={{ color: theme.onSurfaceVariant }}>
                    {playlist.songIds.length} {playlist.songIds.length === 1 ? "song" : "songs"}
                    {isAlreadyAdded ? " • Already added" : ""}
                  </ThemedText>
                </View>
                {isAlreadyAdded ? (
                  <MaterialCommunityIcons name="check-circle" size={ICON_SIZE} color={theme.success} />
                ) : (
                  <MaterialCommunityIcons name="plus-circle-outline" size={ICON_SIZE} color={theme.primary} />
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
          <MaterialCommunityIcons name="arrow-left" size={ICON_SIZE} color={theme.onSurface} />
          <ThemedText type="title4" style={{ marginLeft: ICON_GAP }}>
            Create New Playlist
          </ThemedText>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={styles.createForm}>
          <View style={styles.songPreview}>
            <Image source={{ uri: song.artwork }} style={styles.previewArtwork} />
            <ThemedText type="bodySmall" style={{ color: theme.onSurfaceVariant, marginTop: Spacing.s }}>
              First song: {song.title}
            </ThemedText>
          </View>

          <ThemedText type="bodySmall" style={{ color: theme.onSurfaceVariant, marginBottom: Spacing.xs }}>
            Playlist Name
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.surfaceContainer,
                color: theme.onSurface,
                borderColor: theme.outline,
              },
            ]}
            placeholder="Enter playlist name..."
            placeholderTextColor={theme.onSurfaceVariant}
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreatePlaylist}
          />

          <Button
            variant={newPlaylistName.trim() ? "default" : "secondary"}
            size="lg"
            onPress={handleCreatePlaylist}
            disabled={!newPlaylistName.trim() || isLoading}
            style={styles.createSubmitButton}
          >
            {isLoading ? "Creating..." : "Create Playlist"}
          </Button>
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
  );

  return (
    <Modal visible={isRendered} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <Animated.View
          style={[styles.backdrop, { backgroundColor: theme.scrim }, backdropAnimatedStyle]}
        >
          <Pressable style={styles.backdropPressable} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.menuContainer,
            {
              backgroundColor: theme.surface,
              paddingBottom: safeBottomPadding,
              maxHeight: SCREEN_HEIGHT * 0.75 - safeBottomPadding,
            },
            getFluentShadowStyle(FluentShadow.shadow8),
            menuAnimatedStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.onSurfaceVariant + "40" }]} />
          {menuView === "main" && renderMainMenu()}
          {menuView === "selectPlaylist" && renderPlaylistSelection()}
          {menuView === "createPlaylist" && renderCreatePlaylist()}

          <Button
            variant="secondary"
            size="lg"
            onPress={handleClose}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropPressable: {
    flex: 1,
  },
  menuContainer: {
    borderTopLeftRadius: BorderRadius.xLarge,
    borderTopRightRadius: BorderRadius.xLarge,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: Spacing.s,
    marginBottom: Spacing.m,
  },
  menuContent: {
    paddingHorizontal: Spacing.l,
  },
  songHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.s,
  },
  songArtwork: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.large,
  },
  songInfo: {
    flex: 1,
    marginLeft: Spacing.m,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.m,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    height: MENU_ITEM_HEIGHT + Spacing.m,
    paddingHorizontal: Spacing.s,
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.xs,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.large,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    flex: 1,
    marginLeft: ICON_GAP,
  },
  backHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.s,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  playlistList: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    height: MENU_ITEM_HEIGHT + Spacing.m,
    paddingHorizontal: Spacing.s,
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.xs,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.large,
    justifyContent: "center",
    alignItems: "center",
  },
  playlistInfo: {
    flex: 1,
    marginLeft: ICON_GAP,
  },
  createForm: {
    paddingVertical: Spacing.s,
  },
  songPreview: {
    alignItems: "center",
    marginBottom: Spacing.l,
  },
  previewArtwork: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.large,
  },
  textInput: {
    height: 48,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.m,
    fontSize: Typography.bodyMedium.fontSize,
    borderWidth: 1,
    marginBottom: Spacing.l,
  },
  createSubmitButton: {
    width: "100%",
  },
  cancelButton: {
    marginHorizontal: Spacing.l,
    marginTop: Spacing.m,
  },
});
