import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { FluentSpacing, FluentControlRadius } from "@/constants/fluent2";
import { Layout } from "@/constants/theme";
import { getSelectedFolders, setSelectedFolders as saveSelectedFolders } from "@/lib/storage";

interface FolderInfo {
  id: string;
  title: string;
  assetCount: number;
}

export default function FolderSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeContext();
  const { refreshSongs, setSelectedFolders: updateContextFolders } = useMediaLibraryContext();
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadFolders = useCallback(async () => {
    if (Platform.OS === "web") {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const albums = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: false,
      });

      const audioFolders: FolderInfo[] = [];
      
      for (const album of albums) {
        const assets = await MediaLibrary.getAssetsAsync({
          album: album.id,
          mediaType: MediaLibrary.MediaType.audio,
          first: 1,
        });
        
        if (assets.totalCount > 0) {
          audioFolders.push({
            id: album.id,
            title: album.title,
            assetCount: assets.totalCount,
          });
        }
      }

      audioFolders.sort((a, b) => b.assetCount - a.assetCount);
      setFolders(audioFolders);
    } catch (error) {
      console.error("Error loading folders:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSelectedFolders = useCallback(async () => {
    const saved = await getSelectedFolders();
    setSelectedFolderIds(saved);
  }, []);

  useEffect(() => {
    loadFolders();
    loadSelectedFolders();
  }, [loadFolders, loadSelectedFolders]);

  const toggleFolder = useCallback((folderId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFolderIds(prev => {
      if (prev.includes(folderId)) {
        return prev.filter(id => id !== folderId);
      }
      return [...prev, folderId];
    });
  }, []);

  const selectAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFolderIds(folders.map(f => f.id));
  }, [folders]);

  const clearAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFolderIds([]);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveSelectedFolders(selectedFolderIds);
    if (updateContextFolders) {
      updateContextFolders(selectedFolderIds);
    }
    await refreshSongs();
    setIsSaving(false);
  }, [selectedFolderIds, refreshSongs, updateContextFolders]);

  const totalSongsSelected = folders
    .filter(f => selectedFolderIds.includes(f.id))
    .reduce((sum, f) => sum + f.assetCount, 0);

  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.emptyState, { paddingTop: insets.top }]}>
          <MaterialCommunityIcons name="folder-music" size={64} color={theme.textSecondary} />
          <ThemedText type="body" style={[styles.emptyTitle, { color: theme.textSecondary }]}>
            Folder Selection Not Available
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
            This feature is only available on mobile devices
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.surfaceContainerLow }]}>
        <Pressable
          onPress={selectAll}
          style={[styles.headerButton, { backgroundColor: theme.primary }]}
        >
          <MaterialCommunityIcons name="checkbox-multiple-marked" size={18} color="#FFFFFF" />
          <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: FluentSpacing.xs }}>
            Select All
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={clearAll}
          style={[styles.headerButton, { backgroundColor: theme.surfaceContainerHigh }]}
        >
          <MaterialCommunityIcons name="checkbox-multiple-blank-outline" size={18} color={theme.text} />
          <ThemedText type="small" style={{ color: theme.text, fontWeight: "600", marginLeft: FluentSpacing.xs }}>
            Clear
          </ThemedText>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: FluentSpacing.m }}>
            Scanning folders...
          </ThemedText>
        </View>
      ) : folders.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="folder-music" size={64} color={theme.textSecondary} />
          <ThemedText type="body" style={[styles.emptyTitle, { color: theme.textSecondary }]}>
            No Music Folders Found
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Add music to your device to see folders here
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="caption" style={[styles.infoText, { color: theme.textSecondary }]}>
            {selectedFolderIds.length === 0 
              ? "No folders selected - showing all songs"
              : `${selectedFolderIds.length} folder${selectedFolderIds.length === 1 ? "" : "s"} selected (${totalSongsSelected} songs)`
            }
          </ThemedText>

          {folders.map((folder) => {
            const isSelected = selectedFolderIds.includes(folder.id);
            return (
              <Pressable
                key={folder.id}
                onPress={() => toggleFolder(folder.id)}
                style={[
                  styles.folderItem,
                  { 
                    backgroundColor: isSelected ? theme.primary + "15" : theme.surfaceContainerLow,
                    borderColor: isSelected ? theme.primary : theme.outlineVariant,
                  },
                ]}
              >
                <View style={[
                  styles.checkbox,
                  { 
                    backgroundColor: isSelected ? theme.primary : "transparent",
                    borderColor: isSelected ? theme.primary : theme.outlineVariant,
                  },
                ]}>
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.folderInfo}>
                  <View style={styles.folderTitleRow}>
                    <MaterialCommunityIcons 
                      name="folder-music" 
                      size={20} 
                      color={isSelected ? theme.primary : theme.textSecondary} 
                    />
                    <ThemedText 
                      type="body" 
                      style={[styles.folderTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {folder.title}
                    </ThemedText>
                  </View>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {folder.assetCount} {folder.assetCount === 1 ? "song" : "songs"}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={[
        styles.footer, 
        { 
          backgroundColor: theme.backgroundDefault, 
          paddingBottom: insets.bottom + FluentSpacing.m,
          borderTopColor: theme.outlineVariant,
        }
      ]}>
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={[
            styles.saveButton, 
            { 
              backgroundColor: theme.primary,
              opacity: isSaving ? 0.7 : 1,
            }
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: FluentSpacing.xs }}>
                Save Selection
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    gap: FluentSpacing.s,
    padding: FluentSpacing.m,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.s,
    paddingHorizontal: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
  },
  content: {
    paddingHorizontal: Layout.horizontalPadding,
    paddingTop: FluentSpacing.s,
  },
  infoText: {
    textAlign: "center",
    marginBottom: FluentSpacing.m,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.xl,
  },
  emptyTitle: {
    marginTop: FluentSpacing.m,
    marginBottom: FluentSpacing.xs,
    fontWeight: "600",
  },
  folderItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.dialog,
    marginBottom: FluentSpacing.s,
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: FluentControlRadius.checkbox,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: FluentSpacing.m,
  },
  folderInfo: {
    flex: 1,
  },
  folderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.xxs,
  },
  folderTitle: {
    marginLeft: FluentSpacing.xs,
    fontWeight: "500",
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: FluentSpacing.m,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.dialog,
    minHeight: Layout.buttonStandard,
  },
});
