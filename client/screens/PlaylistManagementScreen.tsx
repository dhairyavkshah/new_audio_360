import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
import { Playlist, getPlaylists, addPlaylist, updatePlaylist, deletePlaylist } from "@/lib/storage";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

export default function PlaylistManagementScreen() {
  const insets = useSafeAreaInsets();
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = Layout.bottomNavHeight + insets.bottom;
  }
  const { theme } = useThemeContext();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");

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
    Alert.alert(
      "Delete Playlist",
      `Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePlaylist(playlist.id);
            await loadPlaylists();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
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
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.sm, paddingBottom: tabBarHeight + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
      >
        <Pressable
          onPress={handleCreateNew}
          style={[styles.createButton, { backgroundColor: theme.primary }]}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.xs }}>
            Create New Playlist
          </ThemedText>
        </Pressable>

        {playlists.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="playlist-music" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={[styles.emptyTitle, { color: theme.textSecondary }]}>
              No Playlists Yet
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
              Create your first playlist to organize your favorite songs
            </ThemedText>
          </View>
        ) : (
          <View style={styles.playlistsList}>
            {playlists.map((playlist) => (
              <GlassCard key={playlist.id} style={styles.playlistCard}>
                <View style={styles.playlistHeader}>
                  <View style={[styles.playlistIcon, { backgroundColor: theme.primary + "20" }]}>
                    <MaterialCommunityIcons name="playlist-music" size={24} color={theme.primary} />
                  </View>
                  <View style={styles.playlistInfo}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {playlist.name}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {playlist.songIds.length} songs
                    </ThemedText>
                  </View>
                </View>

                {playlist.description ? (
                  <ThemedText type="small" style={[styles.playlistDesc, { color: theme.textSecondary }]}>
                    {playlist.description}
                  </ThemedText>
                ) : null}

                <View style={styles.playlistMeta}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    Created {formatDate(playlist.createdAt)}
                  </ThemedText>
                </View>

                <View style={styles.playlistActions}>
                  <Pressable
                    onPress={() => handleEdit(playlist)}
                    style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.text} />
                    <ThemedText type="small" style={{ marginLeft: Spacing["2xs"] }}>
                      Edit
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(playlist)}
                    style={[styles.actionButton, { backgroundColor: theme.error + "15" }]}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.error} />
                    <ThemedText type="small" style={{ marginLeft: Spacing["2xs"], color: theme.error }}>
                      Delete
                    </ThemedText>
                  </Pressable>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        <GlassCard style={styles.infoCard}>
          <View style={styles.infoContent}>
            <MaterialCommunityIcons name="lightbulb-outline" size={18} color={theme.primary} />
            <View style={styles.infoText}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                Smart Playlist Tips
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing["2xs"] }}>
                Long-press songs in your library to quickly add them to playlists. You can also create genre-based or mood-based playlists for a better listening experience.
              </ThemedText>
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
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="h4" style={{ fontWeight: "700" }}>
                  {editingPlaylist ? "Edit Playlist" : "Create Playlist"}
                </ThemedText>
                <Pressable onPress={() => setIsModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={theme.text} />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Playlist Name
                </ThemedText>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  value={playlistName}
                  onChangeText={setPlaylistName}
                  placeholder="My Awesome Playlist"
                  placeholderTextColor={theme.textSecondary}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Description (optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                    { backgroundColor: theme.backgroundSecondary, color: theme.text },
                  ]}
                  value={playlistDescription}
                  onChangeText={setPlaylistDescription}
                  placeholder="Add a description for your playlist..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setIsModalVisible(false)}
                  style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    Cancel
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  style={[styles.modalButton, { backgroundColor: theme.primary }]}
                >
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    {editingPlaylist ? "Save Changes" : "Create"}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.horizontalPadding,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  emptyTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    fontWeight: "600",
  },
  playlistsList: {
    gap: Spacing.sm,
  },
  playlistCard: {
    marginBottom: Spacing.xs,
  },
  playlistHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  playlistInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  playlistDesc: {
    marginBottom: Spacing.xs,
  },
  playlistMeta: {
    marginBottom: Spacing.sm,
  },
  playlistActions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  infoCard: {
    marginTop: Spacing.lg,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
    fontWeight: "500",
  },
  textInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
