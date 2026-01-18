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
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  SlideInRight,
  SlideOutRight,
  SlideInLeft,
  SlideOutLeft,
} from "react-native-reanimated";
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
  FluentTouchTarget,
  FluentIconSize,
  getShadowStyle,
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
const MENU_ITEM_HEIGHT = 56;
const HANDLE_TOP_PADDING = 8;
const HANDLE_BOTTOM_PADDING = 16;
const DIVIDER_MARGIN_VERTICAL = 8;
const TRANSITION_DURATION = 300;

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
  const [pressedItem, setPressedItem] = useState<string | null>(null);

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
      setPressedItem(null);
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
    <Animated.View
      entering={SlideInLeft.duration(TRANSITION_DURATION).easing((t) => t * (2 - t))}
      exiting={SlideOutLeft.duration(TRANSITION_DURATION).easing((t) => t * (2 - t))}
      style={styles.menuContent}
    >
      <View style={styles.songHeader}>
        <Image source={{ uri: song.artwork }} style={styles.songArtwork} />
        <View style={styles.songInfo}>
          <FluentText variant="body1Strong" color="primary" numberOfLines={1}>
            {song.title}
          </FluentText>
          <FluentText variant="body2" color="secondary" numberOfLines={1}>
            {song.artist}
          </FluentText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />

      <Pressable
        style={[
          styles.menuItem,
          pressedItem === "addToPlaylist" && { backgroundColor: colors.colorNeutralBackground1Pressed },
        ]}
        onPress={() => handleNavigate("selectPlaylist")}
        onPressIn={() => setPressedItem("addToPlaylist")}
        onPressOut={() => setPressedItem(null)}
      >
        <MaterialCommunityIcons name="playlist-plus" size={FluentIconSize.medium} color={colors.colorNeutralForeground1} />
        <FluentText variant="body2" color="primary" style={styles.menuItemText}>
          Add to Playlist
        </FluentText>
        <MaterialCommunityIcons name="chevron-right" size={FluentIconSize.medium} color={colors.colorNeutralForeground3} />
      </Pressable>

      <Pressable
        style={[
          styles.menuItem,
          pressedItem === "createPlaylist" && { backgroundColor: colors.colorNeutralBackground1Pressed },
        ]}
        onPress={() => handleNavigate("createPlaylist")}
        onPressIn={() => setPressedItem("createPlaylist")}
        onPressOut={() => setPressedItem(null)}
      >
        <MaterialCommunityIcons name="playlist-music" size={FluentIconSize.medium} color={colors.colorNeutralForeground1} />
        <FluentText variant="body2" color="primary" style={styles.menuItemText}>
          Create New Playlist
        </FluentText>
        <MaterialCommunityIcons name="chevron-right" size={FluentIconSize.medium} color={colors.colorNeutralForeground3} />
      </Pressable>

      {showHideOption && onHideSong && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />
          <Pressable
            style={[
              styles.menuItem,
              pressedItem === "hide" && { backgroundColor: colors.colorNeutralBackground1Pressed },
            ]}
            onPress={handleHideSong}
            onPressIn={() => setPressedItem("hide")}
            onPressOut={() => setPressedItem(null)}
            disabled={isLoading}
          >
            <MaterialCommunityIcons name="eye-off" size={FluentIconSize.medium} color={colors.colorPaletteRedForeground1} />
            <FluentText
              variant="body2"
              style={[styles.menuItemText, { color: colors.colorPaletteRedForeground1 }]}
            >
              Hide from Library
            </FluentText>
          </Pressable>
        </>
      )}
    </Animated.View>
  );

  const renderPlaylistSelection = () => (
    <Animated.View
      entering={SlideInRight.duration(TRANSITION_DURATION).easing((t) => t * (2 - t))}
      exiting={SlideOutRight.duration(TRANSITION_DURATION).easing((t) => t * (2 - t))}
      style={styles.menuContent}
    >
      <Pressable
        style={[
          styles.backHeader,
          pressedItem === "back" && { backgroundColor: colors.colorNeutralBackground1Pressed },
        ]}
        onPress={() => handleNavigate("main")}
        onPressIn={() => setPressedItem("back")}
        onPressOut={() => setPressedItem(null)}
      >
        <MaterialCommunityIcons name="arrow-left" size={FluentIconSize.medium} color={colors.colorNeutralForeground1} />
        <FluentText variant="body1Strong" color="primary" style={{ marginLeft: FluentSpacing.l }}>
          Select Playlist
        </FluentText>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />

      {playlists.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="playlist-music" size={48} color={colors.colorNeutralForeground3} />
          <FluentText variant="body2" color="secondary" style={{ marginTop: FluentSpacing.m }}>
            No playlists yet
          </FluentText>
          <Pressable
            style={[styles.createButton, { backgroundColor: colors.colorBrandBackground }]}
            onPress={() => handleNavigate("createPlaylist")}
          >
            <MaterialCommunityIcons name="plus" size={FluentIconSize.regular} color={colors.colorNeutralForegroundOnBrand} />
            <FluentText variant="body2Strong" color="onBrand" style={{ marginLeft: FluentSpacing.s }}>
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
                  styles.menuItem,
                  isAlreadyAdded && { opacity: 0.5 },
                  pressedItem === playlist.id && { backgroundColor: colors.colorNeutralBackground1Pressed },
                ]}
                onPress={() => !isAlreadyAdded && handleAddToPlaylist(playlist)}
                onPressIn={() => setPressedItem(playlist.id)}
                onPressOut={() => setPressedItem(null)}
                disabled={isAlreadyAdded || isLoading}
              >
                <MaterialCommunityIcons name="playlist-music" size={FluentIconSize.medium} color={colors.colorNeutralForeground1} />
                <View style={styles.playlistInfo}>
                  <FluentText variant="body2" color="primary" numberOfLines={1}>
                    {playlist.name}
                  </FluentText>
                  <FluentText variant="caption1" color="secondary">
                    {playlist.songIds.length} {playlist.songIds.length === 1 ? "song" : "songs"}
                    {isAlreadyAdded ? " • Already added" : ""}
                  </FluentText>
                </View>
                {isAlreadyAdded ? (
                  <MaterialCommunityIcons name="check-circle" size={FluentIconSize.medium} color={colors.colorPaletteGreenForeground1} />
                ) : (
                  <MaterialCommunityIcons name="plus-circle-outline" size={FluentIconSize.medium} color={colors.colorBrandForeground1} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </Animated.View>
  );

  const renderCreatePlaylist = () => (
    <KeyboardAwareScrollViewCompat>
      <Animated.View
        entering={SlideInRight.duration(TRANSITION_DURATION).easing((t) => t * (2 - t))}
        exiting={SlideOutRight.duration(TRANSITION_DURATION).easing((t) => t * (2 - t))}
        style={styles.menuContent}
      >
        <Pressable
          style={[
            styles.backHeader,
            pressedItem === "backCreate" && { backgroundColor: colors.colorNeutralBackground1Pressed },
          ]}
          onPress={() => handleNavigate("main")}
          onPressIn={() => setPressedItem("backCreate")}
          onPressOut={() => setPressedItem(null)}
        >
          <MaterialCommunityIcons name="arrow-left" size={FluentIconSize.medium} color={colors.colorNeutralForeground1} />
          <FluentText variant="body1Strong" color="primary" style={{ marginLeft: FluentSpacing.l }}>
            Create New Playlist
          </FluentText>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.colorNeutralStroke2 }]} />

        <View style={styles.createForm}>
          <View style={styles.songPreview}>
            <Image source={{ uri: song.artwork }} style={styles.previewArtwork} />
            <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.s }}>
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
              size={FluentIconSize.regular}
              color={newPlaylistName.trim() ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground3}
            />
            <FluentText
              variant="body2Strong"
              style={{
                color: newPlaylistName.trim() ? colors.colorNeutralForegroundOnBrand : colors.colorNeutralForeground3,
                marginLeft: FluentSpacing.s,
              }}
            >
              {isLoading ? "Creating..." : "Create Playlist"}
            </FluentText>
          </Pressable>
        </View>
      </Animated.View>
    </KeyboardAwareScrollViewCompat>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropPressable} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(20).stiffness(200)}
        exiting={SlideOutDown.duration(200)}
        style={[
          styles.menuContainer,
          { backgroundColor: colors.colorNeutralBackground1, paddingBottom: FluentSpacing.xl + safeBottom },
          getShadowStyle('shadow16', isDark),
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.colorNeutralForeground3 }]} />
        {menuView === "main" && renderMainMenu()}
        {menuView === "selectPlaylist" && renderPlaylistSelection()}
        {menuView === "createPlaylist" && renderCreatePlaylist()}

        <Pressable
          style={[
            styles.cancelButton,
            { backgroundColor: colors.colorNeutralBackground3 },
            pressedItem === "cancel" && { backgroundColor: colors.colorNeutralBackground1Pressed },
          ]}
          onPress={handleClose}
          onPressIn={() => setPressedItem("cancel")}
          onPressOut={() => setPressedItem(null)}
        >
          <FluentText variant="body2Strong" color="primary">
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropPressable: {
    flex: 1,
  },
  menuContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: FluentControlRadius.bottomSheet,
    borderTopRightRadius: FluentControlRadius.bottomSheet,
    maxHeight: SCREEN_HEIGHT * 0.7,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: HANDLE_TOP_PADDING,
    marginBottom: HANDLE_BOTTOM_PADDING,
  },
  menuContent: {
    paddingHorizontal: 0,
  },
  songHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingBottom: FluentSpacing.l,
  },
  songArtwork: {
    width: 64,
    height: 64,
    borderRadius: FluentRadius.large,
  },
  songInfo: {
    flex: 1,
    marginLeft: FluentSpacing.l,
  },
  divider: {
    height: 1,
    marginVertical: DIVIDER_MARGIN_VERTICAL,
    marginHorizontal: FluentSpacing.l,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    height: MENU_ITEM_HEIGHT,
    paddingHorizontal: FluentSpacing.xl,
    gap: FluentSpacing.l,
  },
  menuItemText: {
    flex: 1,
  },
  backHeader: {
    flexDirection: "row",
    alignItems: "center",
    height: MENU_ITEM_HEIGHT,
    paddingHorizontal: FluentSpacing.xl,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: FluentSpacing.xxxl,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.medium,
    marginTop: FluentSpacing.l,
    minHeight: FluentTouchTarget.minimum,
  },
  playlistList: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  playlistInfo: {
    flex: 1,
  },
  createForm: {
    paddingHorizontal: FluentSpacing.xl,
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
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.input,
    paddingHorizontal: FluentSpacing.m,
    fontSize: FluentTypography.body2.fontSize,
    borderWidth: 1,
    marginBottom: FluentSpacing.l,
  },
  createSubmitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: FluentTouchTarget.minimum,
    borderRadius: FluentTouchTarget.minimum / 2,
  },
  cancelButton: {
    marginHorizontal: FluentSpacing.l,
    marginTop: FluentSpacing.m,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentTouchTarget.minimum / 2,
    justifyContent: "center",
    alignItems: "center",
  },
});
