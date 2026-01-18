import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentLayoutSize, FluentLightColors, FluentDarkColors, FluentTypography, FluentTouchTarget, FluentIconSize, getShadowStyle } from "@/constants/fluent2";
import { Layout } from "@/constants/theme";
import { Playlist, getPlaylists, addPlaylist, updatePlaylist, deletePlaylist } from "@/lib/storage";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const MIN_BOTTOM_PADDING = 24;

export default function PlaylistManagementScreen() {
  const tabBarHeight = useSafeTabBarHeight();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const safeBottom = Platform.OS === 'android' ? Math.max(insets.bottom, MIN_BOTTOM_PADDING) : insets.bottom;
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);

  const loadPlaylists = useCallback(async () => {
    const data = await getPlaylists();
    setPlaylists(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlaylists();
    }, [loadPlaylists])
  );

  const handleCreateNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingPlaylist(null);
    setPlaylistName("");
    setPlaylistDescription("");
    setIsModalVisible(true);
  };

  const handleEdit = (playlist: Playlist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingPlaylist(playlist);
    setPlaylistName(playlist.name);
    setPlaylistDescription(playlist.description || "");
    setIsModalVisible(true);
  };

  const handleDelete = (playlist: Playlist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPlaylistToDelete(playlist);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!playlistToDelete) return;
    await deletePlaylist(playlistToDelete.id);
    await loadPlaylists();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDeleteModal(false);
    setPlaylistToDelete(null);
  };

  const handleSave = async () => {
    if (!playlistName.trim()) {
      Alert.alert("Error", "Please enter a playlist name.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingPlaylist) {
      await updatePlaylist(editingPlaylist.id, {
        name: playlistName.trim(),
        description: playlistDescription.trim() || undefined,
      });
    } else {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name: playlistName.trim(),
        description: playlistDescription.trim() || undefined,
        songIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await addPlaylist(newPlaylist);
    }

    setIsModalVisible(false);
    await loadPlaylists();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: FluentSpacing.s, paddingBottom: tabBarHeight + FluentSpacing.l },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <Pressable
          onPress={handleCreateNew}
          style={[styles.createButton, { backgroundColor: colors.colorBrandBackground }]}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <FluentText variant="body1Strong" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.xs }}>
            Create New Playlist
          </FluentText>
        </Pressable>

        {playlists.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="playlist-music" size={48} color={colors.colorNeutralForeground2} />
            <FluentText variant="body1" color="secondary" style={styles.emptyTitle}>
              No Playlists Yet
            </FluentText>
            <FluentText variant="body1" color="secondary" style={{ textAlign: "center" }}>
              Create your first playlist to organize your favorite songs
            </FluentText>
          </View>
        ) : (
          <View style={styles.playlistsList}>
            {playlists.map((playlist) => (
              <GlassCard key={playlist.id} style={styles.playlistCard}>
                <View style={styles.playlistHeader}>
                  <View style={[styles.playlistIcon, { backgroundColor: colors.colorBrandBackground + "20" }]}>
                    <MaterialCommunityIcons name="playlist-music" size={24} color={colors.colorBrandForeground1} />
                  </View>
                  <View style={styles.playlistInfo}>
                    <FluentText variant="body1Strong">
                      {playlist.name}
                    </FluentText>
                    <FluentText variant="caption1" color="secondary">
                      {playlist.songIds.length} songs
                    </FluentText>
                  </View>
                </View>

                {playlist.description ? (
                  <FluentText variant="body1" color="secondary" style={styles.playlistDesc}>
                    {playlist.description}
                  </FluentText>
                ) : null}

                <View style={styles.playlistMeta}>
                  <FluentText variant="caption1" color="secondary">
                    Created {formatDate(playlist.createdAt)}
                  </FluentText>
                </View>

                <View style={styles.playlistActions}>
                  <Pressable
                    onPress={() => handleEdit(playlist)}
                    style={[styles.actionButton, { backgroundColor: colors.colorNeutralBackground2 }]}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.colorNeutralForeground1} />
                    <FluentText variant="body1" style={{ marginLeft: FluentSpacing.xxs }}>
                      Edit
                    </FluentText>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(playlist)}
                    style={[styles.actionButton, { backgroundColor: colors.colorPaletteRedBackground1 }]}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.colorPaletteRedForeground1} />
                    <FluentText variant="body1" style={{ marginLeft: FluentSpacing.xxs, color: colors.colorPaletteRedForeground1 }}>
                      Delete
                    </FluentText>
                  </Pressable>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        <GlassCard style={styles.infoCard}>
          <View style={styles.infoContent}>
            <MaterialCommunityIcons name="lightbulb-outline" size={18} color={colors.colorBrandForeground1} />
            <View style={styles.infoText}>
              <FluentText variant="body1Strong">
                Smart Playlist Tips
              </FluentText>
              <FluentText variant="caption1" color="secondary" style={{ marginTop: FluentSpacing.xxs }}>
                Long-press songs in your library to quickly add them to playlists. You can also create genre-based or mood-based playlists for a better listening experience.
              </FluentText>
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable 
          style={styles.modalBackdrop} 
          onPress={() => setIsModalVisible(false)}
        />
        <KeyboardAwareScrollViewCompat
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.modalContent, { backgroundColor: colors.colorNeutralBackground1, paddingBottom: FluentSpacing.xxl + safeBottom }]}>
            <View style={styles.modalHeader}>
              <FluentText variant="subtitle2" style={styles.modalTitle}>
                {editingPlaylist ? "Edit Playlist" : "Create Playlist"}
              </FluentText>
              <Pressable 
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close" size={FluentIconSize.medium} color={colors.colorNeutralForeground1} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <FluentText variant="body2" color="secondary" style={styles.inputLabel}>
                Playlist Name
              </FluentText>
              <TextInput
                style={[
                  styles.textInput, 
                  { 
                    backgroundColor: colors.colorNeutralBackground1, 
                    color: colors.colorNeutralForeground1,
                    borderColor: colors.colorNeutralStroke2,
                  }
                ]}
                value={playlistName}
                onChangeText={setPlaylistName}
                placeholder="My Awesome Playlist"
                placeholderTextColor={colors.colorNeutralForeground3}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <FluentText variant="body2" color="secondary" style={styles.inputLabel}>
                Description (optional)
              </FluentText>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  { 
                    backgroundColor: colors.colorNeutralBackground1, 
                    color: colors.colorNeutralForeground1,
                    borderColor: colors.colorNeutralStroke2,
                  },
                ]}
                value={playlistDescription}
                onChangeText={setPlaylistDescription}
                placeholder="Add a description for your playlist..."
                placeholderTextColor={colors.colorNeutralForeground3}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setIsModalVisible(false)}
                style={[styles.secondaryButton, { backgroundColor: colors.colorNeutralBackground3 }]}
              >
                <FluentText variant="body2Strong">
                  Cancel
                </FluentText>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={[styles.primaryButton, { backgroundColor: colors.colorBrandBackground }]}
              >
                <FluentText variant="body2Strong" style={{ color: "#FFFFFF" }}>
                  {editingPlaylist ? "Save Changes" : "Create"}
                </FluentText>
              </Pressable>
            </View>
          </View>
        </KeyboardAwareScrollViewCompat>
      </Modal>

      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable 
          style={styles.modalBackdrop} 
          onPress={() => {
            setShowDeleteModal(false);
            setPlaylistToDelete(null);
          }}
        />
        <View style={styles.dialogCentered}>
          <View style={[
            styles.deleteModalContent, 
            { backgroundColor: colors.colorNeutralBackground1 },
            getShadowStyle('shadow28', isDark)
          ]}>
            <MaterialCommunityIcons 
              name="alert-circle" 
              size={FluentIconSize.medium} 
              color={colors.colorPaletteRedForeground1} 
              style={styles.deleteIcon} 
            />
            <FluentText variant="subtitle2" style={styles.deleteTitle}>
              Delete Playlist
            </FluentText>
            <FluentText variant="body2" color="secondary" style={styles.deleteMessage}>
              Are you sure you want to delete "{playlistToDelete?.name}"? This action cannot be undone.
            </FluentText>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setShowDeleteModal(false);
                  setPlaylistToDelete(null);
                }}
                style={[styles.secondaryButton, { backgroundColor: colors.colorNeutralBackground3 }]}
              >
                <FluentText variant="body2Strong">Cancel</FluentText>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                style={[styles.primaryButton, { backgroundColor: colors.colorPaletteRedForeground1 }]}
              >
                <FluentText variant="body2Strong" style={{ color: "#FFFFFF" }}>Delete</FluentText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Layout.horizontalPadding,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.card,
    marginBottom: FluentSpacing.l,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: FluentSpacing.xxl,
  },
  emptyTitle: {
    marginTop: FluentSpacing.m,
    marginBottom: FluentSpacing.xs,
    fontWeight: "600",
  },
  playlistsList: {
    gap: FluentSpacing.s,
  },
  playlistCard: {
    marginBottom: FluentSpacing.xs,
  },
  playlistHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.xs,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: FluentControlRadius.fab,
    justifyContent: "center",
    alignItems: "center",
  },
  playlistInfo: {
    flex: 1,
    marginLeft: FluentSpacing.s,
  },
  playlistDesc: {
    marginBottom: FluentSpacing.xs,
  },
  playlistMeta: {
    marginBottom: FluentSpacing.s,
  },
  playlistActions: {
    flexDirection: "row",
    gap: FluentSpacing.xs,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.s,
    paddingVertical: FluentSpacing.xs,
    borderRadius: FluentControlRadius.card,
  },
  infoCard: {
    marginTop: FluentSpacing.l,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    marginLeft: FluentSpacing.s,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: FluentControlRadius.bottomSheet,
    borderTopRightRadius: FluentControlRadius.bottomSheet,
    padding: FluentSpacing.xxl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: FluentSpacing.l,
  },
  modalTitle: {
    fontWeight: "600",
  },
  closeButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    justifyContent: "center",
    alignItems: "center",
    marginRight: -FluentSpacing.s,
  },
  inputGroup: {
    marginBottom: FluentSpacing.l,
  },
  inputLabel: {
    marginBottom: FluentSpacing.xs,
  },
  textInput: {
    height: FluentLayoutSize.inputFieldHeight,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.input,
    borderWidth: 1,
    fontSize: FluentTypography.body2.fontSize,
  },
  textArea: {
    height: 88,
    paddingTop: FluentSpacing.m,
    textAlignVertical: "top",
  },
  dialogCentered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
  },
  deleteModalContent: {
    width: "100%",
    maxWidth: FluentLayoutSize.dialogMaxWidth,
    padding: FluentSpacing.xxl,
    borderRadius: FluentControlRadius.dialog,
    alignItems: "center",
  },
  deleteIcon: {
    marginBottom: FluentSpacing.l,
  },
  deleteTitle: {
    textAlign: "center",
    marginBottom: FluentSpacing.s,
    fontWeight: "600",
  },
  deleteMessage: {
    textAlign: "center",
    marginBottom: FluentSpacing.l,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: FluentSpacing.m,
    marginTop: FluentSpacing.l,
    width: "100%",
  },
  primaryButton: {
    flex: 1,
    height: FluentTouchTarget.minimum,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: FluentTouchTarget.minimum / 2,
  },
  secondaryButton: {
    flex: 1,
    height: FluentTouchTarget.minimum,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: FluentTouchTarget.minimum / 2,
  },
});
