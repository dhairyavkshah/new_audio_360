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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FluentText } from "@/components/fluent";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useUiSound } from "@/contexts/UiSoundContext";
import {
  FluentSpacing,
  FluentRadius,
  FluentControlRadius,
  FluentTypography,
  FluentLightColors,
  FluentDarkColors,
} from "@/constants/fluent2";
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

const MIN_BOTTOM_PADDING = 24;

export function SongContextMenu({ visible, song, onClose, onSuccess, onHideSong, showHideOption = false }: SongContextMenuProps) {
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { playTapSound } = useUiSound();
  const insets = useSafeAreaInsets();
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, MIN_BOTTOM_PADDING) : insets.bottom;
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
        id: `playlist_${Date.now()}`,
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
          <FluentText variant="body1Strong" color="primary" numberOfLines={1}>
            {song.title}
          </FluentText>
          <FluentText variant="caption1" color="secondary">
            {song.artist}
          </FluentText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />

      <Pressable
        style={[styles.menuItem, { backgroundColor: colors.colorNeutralBackground2 }]}
        onPress={() => handleNavigate("selectPlaylist")}
      >
        <View style={[styles.menuItemIcon, { backgroundColor: colors.colorBrandBackground + "20" }]}>
          <MaterialCommunityIcons name="playlist-plus" size={20} color={colors.colorBrandForeground1} />
        </View>
        <View style={styles.menuItemText}>
          <FluentText variant="body1" color="primary">Add to Playlist</FluentText>
          <FluentText variant="caption1" color="secondary">
            {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"} available
          </FluentText>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.colorNeutralForeground2} />
      </Pressable>

      <Pressable
        style={[styles.menuItem, { backgroundColor: colors.colorNeutralBackground2 }]}
        onPress={() => handleNavigate("createPlaylist")}
      >
        <View style={[styles.menuItemIcon, { backgroundColor: colors.colorPaletteGreenBackground1 }]}>
          <MaterialCommunityIcons name="playlist-music" size={20} color={colors.colorPaletteGreenForeground1} />
        </View>
        <View style={styles.menuItemText}>
          <FluentText variant="body1" color="primary">Create New Playlist</FluentText>
          <FluentText variant="caption1" color="secondary">
            Start a new collection with this song
          </FluentText>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.colorNeutralForeground2} />
      </Pressable>

      {showHideOption && onHideSong && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />
          <Pressable
            style={[styles.menuItem, { backgroundColor: colors.colorNeutralBackground2 }]}
            onPress={handleHideSong}
            disabled={isLoading}
          >
            <View style={[styles.menuItemIcon, { backgroundColor: colors.colorPaletteRedBackground1 }]}>
              <MaterialCommunityIcons name="eye-off" size={20} color={colors.colorPaletteRedForeground1} />
            </View>
            <View style={styles.menuItemText}>
              <FluentText variant="body1" color="primary">Hide from Library</FluentText>
              <FluentText variant="caption1" color="secondary">
                Remove this song from your All Songs list
              </FluentText>
            </View>
          </Pressable>
        </>
      )}
    </View>
  );

  const renderPlaylistSelection = () => (
    <View style={styles.menuContent}>
      <Pressable style={styles.backHeader} onPress={() => handleNavigate("main")}>
        <MaterialCommunityIcons name="arrow-left" size={20} color={colors.colorNeutralForeground1} />
        <FluentText variant="body1Strong" color="primary" style={{ marginLeft: FluentSpacing.s }}>
          Select Playlist
        </FluentText>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />

      {playlists.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="playlist-music" size={48} color={colors.colorNeutralForeground2} />
          <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.m }}>
            No playlists yet
          </FluentText>
          <Pressable
            style={[styles.createButton, { backgroundColor: colors.colorBrandBackground }]}
            onPress={() => handleNavigate("createPlaylist")}
          >
            <MaterialCommunityIcons name="plus" size={18} color={colors.colorNeutralForegroundOnBrand} />
            <FluentText variant="body1" color="onBrand" style={{ marginLeft: FluentSpacing.xs }}>
              Create Playlist
            </FluentText>
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
                  { backgroundColor: colors.colorNeutralBackground2 },
                  isAlreadyAdded && { opacity: 0.5 },
                ]}
                onPress={() => !isAlreadyAdded && handleAddToPlaylist(playlist)}
                disabled={isAlreadyAdded || isLoading}
              >
                <View style={[styles.playlistIcon, { backgroundColor: colors.colorBrandBackground + "15" }]}>
                  <MaterialCommunityIcons name="playlist-music" size={24} color={colors.colorBrandForeground1} />
                </View>
                <View style={styles.playlistInfo}>
                  <FluentText variant="body1" color="primary" numberOfLines={1}>
                    {playlist.name}
                  </FluentText>
                  <FluentText variant="caption1" color="secondary">
                    {playlist.songIds.length} {playlist.songIds.length === 1 ? "song" : "songs"}
                    {isAlreadyAdded ? " • Already added" : ""}
                  </FluentText>
                </View>
                {isAlreadyAdded ? (
                  <MaterialCommunityIcons name="check-circle" size={20} color={colors.colorPaletteGreenForeground1} />
                ) : (
                  <MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.colorBrandForeground1} />
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
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.colorNeutralForeground1} />
          <FluentText variant="body1Strong" color="primary" style={{ marginLeft: FluentSpacing.s }}>
            Create New Playlist
          </FluentText>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />

        <View style={styles.createForm}>
          <View style={styles.songPreview}>
            <Image source={{ uri: song.artwork }} style={styles.previewArtwork} />
            <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
              First song: {song.title}
            </FluentText>
          </View>

          <FluentText variant="caption1" color="secondary" style={{ marginBottom: FluentSpacing.xs }}>
            Playlist Name
          </FluentText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.colorNeutralBackground3,
                color: colors.colorNeutralForeground1,
                borderColor: colors.colorNeutralStroke2,
              },
            ]}
            placeholder="Enter playlist name..."
            placeholderTextColor={colors.colorNeutralForeground3}
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreatePlaylist}
          />

          <Pressable
            style={[
              styles.createSubmitButton,
              { backgroundColor: newPlaylistName.trim() ? colors.colorBrandBackground : colors.colorNeutralBackground3 },
            ]}
            onPress={handleCreatePlaylist}
            disabled={!newPlaylistName.trim() || isLoading}
          >
            <MaterialCommunityIcons
              name="playlist-plus"
              size={20}
              color={newPlaylistName.trim() ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground3}
            />
            <FluentText
              variant="body1Strong"
              style={{
                color: newPlaylistName.trim() ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground3,
                marginLeft: FluentSpacing.s,
              }}
            >
              {isLoading ? "Creating..." : "Create Playlist"}
            </FluentText>
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
        style={[styles.menuContainer, { backgroundColor: colors.colorNeutralBackground1, paddingBottom: FluentSpacing.xl + safeBottom }]}
      >
        <View style={[styles.handle, { backgroundColor: colors.colorNeutralForeground3 + "40" }]} />
        {menuView === "main" && renderMainMenu()}
        {menuView === "selectPlaylist" && renderPlaylistSelection()}
        {menuView === "createPlaylist" && renderCreatePlaylist()}

        <Pressable
          style={[styles.cancelButton, { backgroundColor: colors.colorNeutralBackground3 }]}
          onPress={handleClose}
        >
          <FluentText variant="body1Strong" color="primary">
            Cancel
          </FluentText>
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
    borderTopLeftRadius: FluentRadius.xLarge,
    borderTopRightRadius: FluentRadius.xLarge,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: FluentControlRadius.checkbox,
    alignSelf: "center",
    marginTop: FluentSpacing.s,
    marginBottom: FluentSpacing.m,
  },
  menuContent: {
    paddingHorizontal: FluentSpacing.l,
  },
  songHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.s,
  },
  songArtwork: {
    width: 56,
    height: 56,
    borderRadius: FluentRadius.medium,
  },
  songInfo: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  divider: {
    height: 1,
    marginVertical: FluentSpacing.m,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    marginBottom: FluentSpacing.s,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: FluentRadius.medium,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  backHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.s,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: FluentSpacing.xl,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    marginTop: FluentSpacing.l,
  },
  playlistList: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    marginBottom: FluentSpacing.s,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: FluentRadius.medium,
    justifyContent: "center",
    alignItems: "center",
  },
  playlistInfo: {
    flex: 1,
    marginLeft: FluentSpacing.m,
  },
  createForm: {
    paddingVertical: FluentSpacing.s,
  },
  songPreview: {
    alignItems: "center",
    marginBottom: FluentSpacing.l,
  },
  previewArtwork: {
    width: 80,
    height: 80,
    borderRadius: FluentRadius.large,
  },
  textInput: {
    height: 48,
    borderRadius: FluentRadius.medium,
    paddingHorizontal: FluentSpacing.m,
    fontSize: FluentTypography.body1.fontSize,
    borderWidth: 1,
    marginBottom: FluentSpacing.l,
  },
  createSubmitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: FluentRadius.medium,
  },
  cancelButton: {
    marginHorizontal: FluentSpacing.l,
    marginTop: FluentSpacing.m,
    height: 48,
    borderRadius: FluentRadius.medium,
    justifyContent: "center",
    alignItems: "center",
  },
});
