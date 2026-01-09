import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Alert } from "react-native";
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
import { 
  getSelectedFolders, 
  setSelectedFolders as saveSelectedFolders,
  getWebFolderData,
  setWebFolderData,
  WebFolderData
} from "@/lib/storage";
import {
  getSessionWebFolders,
  setSessionWebFolders,
  isSessionInitialized,
  markSessionInitialized
} from "@/lib/webFolderCache";

interface FolderInfo {
  id: string;
  title: string;
  assetCount: number;
  path?: string;
}

interface WebAudioFile {
  name: string;
  path: string;
  file?: File;
  blobUrl?: string;
}

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.wma', '.opus'];

function isAudioFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
}

async function scanDirectoryForAudio(dirHandle: FileSystemDirectoryHandle, basePath: string = ''): Promise<WebAudioFile[]> {
  const audioFiles: WebAudioFile[] = [];
  
  try {
    for await (const entry of (dirHandle as any).values()) {
      const currentPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file' && isAudioFile(entry.name)) {
        const file = await entry.getFile();
        const blobUrl = URL.createObjectURL(file);
        audioFiles.push({
          name: entry.name,
          path: currentPath,
          file,
          blobUrl,
        });
      } else if (entry.kind === 'directory') {
        const subFiles = await scanDirectoryForAudio(entry, currentPath);
        audioFiles.push(...subFiles);
      }
    }
  } catch (error) {
    console.error('Error scanning directory:', error);
  }
  
  return audioFiles;
}

export default function FolderSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeContext();
  const { refreshSongs, setSelectedFolders: updateContextFolders, setWebAudioFiles } = useMediaLibraryContext();
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [webFolders, setWebFolders] = useState<WebFolderData[]>(getSessionWebFolders());

  const loadFolders = useCallback(async () => {
    if (Platform.OS === "web") {
      setIsLoading(true);
      try {
        if (isSessionInitialized()) {
          const cached = getSessionWebFolders();
          setWebFolders(cached);
          const folderInfos: FolderInfo[] = cached.map(f => ({
            id: f.id,
            title: f.name,
            assetCount: f.songCount,
            path: f.path,
          }));
          setFolders(folderInfos);
          setSelectedFolderIds(cached.map(f => f.id));
        } else {
          await setWebFolderData([]);
          markSessionInitialized();
        }
      } catch (error) {
        console.error("Error loading web folders:", error);
      } finally {
        setIsLoading(false);
      }
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
    if (Platform.OS !== "web") {
      const saved = await getSelectedFolders();
      setSelectedFolderIds(saved);
    }
  }, []);

  useEffect(() => {
    loadFolders();
    loadSelectedFolders();
  }, [loadFolders, loadSelectedFolders]);

  const handleAddFolder = useCallback(async () => {
    if (Platform.OS !== "web") {
      return;
    }

    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      Alert.alert(
        "Browser Not Supported",
        "Your browser doesn't support folder selection. Please use Chrome, Edge, or another Chromium-based browser."
      );
      return;
    }

    setIsScanning(true);
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
      });
      
      const folderName = dirHandle.name;
      const folderId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const audioFiles = await scanDirectoryForAudio(dirHandle, folderName);
      
      if (audioFiles.length === 0) {
        Alert.alert(
          "No Audio Files Found",
          `The folder "${folderName}" doesn't contain any audio files (MP3, M4A, WAV, FLAC, AAC, OGG).`
        );
        setIsScanning(false);
        return;
      }

      const newWebFolder: WebFolderData = {
        id: folderId,
        name: folderName,
        path: folderName,
        songCount: audioFiles.length,
        songs: audioFiles.map((af, index) => ({
          id: `${folderId}_${index}`,
          title: af.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          filename: af.name,
          path: af.path,
          blobUrl: af.blobUrl,
        })),
      };

      const updatedWebFolders = [...webFolders, newWebFolder];
      setSessionWebFolders(updatedWebFolders);
      setWebFolders(updatedWebFolders);
      await setWebFolderData(updatedWebFolders);

      const newFolderInfo: FolderInfo = {
        id: folderId,
        title: folderName,
        assetCount: audioFiles.length,
        path: folderName,
      };
      setFolders(prev => [...prev, newFolderInfo]);
      setSelectedFolderIds(prev => [...prev, folderId]);

      if (setWebAudioFiles) {
        const allSongs = updatedWebFolders.flatMap(f => f.songs);
        setWebAudioFiles(allSongs);
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Error selecting folder:", error);
        Alert.alert("Error", "Failed to access the selected folder. Please try again.");
      }
    } finally {
      setIsScanning(false);
    }
  }, [webFolders, setWebAudioFiles]);

  const handleRemoveFolder = useCallback(async (folderId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedFolderIds(prev => prev.filter(id => id !== folderId));
      return;
    }

    const updatedWebFolders = webFolders.filter(f => f.id !== folderId);
    setSessionWebFolders(updatedWebFolders);
    setWebFolders(updatedWebFolders);
    await setWebFolderData(updatedWebFolders);
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setSelectedFolderIds(prev => prev.filter(id => id !== folderId));

    if (setWebAudioFiles) {
      const allSongs = updatedWebFolders.flatMap(f => f.songs);
      setWebAudioFiles(allSongs);
    }
  }, [webFolders, setWebAudioFiles]);

  const toggleFolder = useCallback((folderId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedFolderIds(prev => {
      if (prev.includes(folderId)) {
        return prev.filter(id => id !== folderId);
      }
      return [...prev, folderId];
    });
  }, []);

  const selectAll = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedFolderIds(folders.map(f => f.id));
  }, [folders]);

  const clearAll = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedFolderIds([]);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    if (Platform.OS === "web") {
      const selectedWebFolders = webFolders.filter(f => selectedFolderIds.includes(f.id));
      setSessionWebFolders(selectedWebFolders);
      await setWebFolderData(selectedWebFolders);
      setWebFolders(selectedWebFolders);
      
      if (setWebAudioFiles) {
        const allSongs = selectedWebFolders.flatMap(f => f.songs);
        setWebAudioFiles(allSongs);
      }
    } else {
      await saveSelectedFolders(selectedFolderIds);
      if (updateContextFolders) {
        updateContextFolders(selectedFolderIds);
      }
      await refreshSongs();
    }
    
    setIsSaving(false);
  }, [selectedFolderIds, refreshSongs, updateContextFolders, webFolders, setWebAudioFiles]);

  const totalSongsSelected = folders
    .filter(f => selectedFolderIds.includes(f.id))
    .reduce((sum, f) => sum + f.assetCount, 0);

  const renderWebContent = () => (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.surfaceContainerLow }]}>
        <Pressable
          onPress={handleAddFolder}
          disabled={isScanning}
          style={[styles.addButton, { backgroundColor: theme.primary, opacity: isScanning ? 0.7 : 1 }]}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="folder-plus" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: FluentSpacing.xs }}>
                Add Folder
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: FluentSpacing.m }}>
            Loading folders...
          </ThemedText>
        </View>
      ) : folders.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="folder-music-outline" size={80} color={theme.textTertiary} />
          <ThemedText type="h4" style={[styles.emptyTitle, { color: theme.text }]}>
            No Music Folders Added
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginBottom: FluentSpacing.xl }}>
            Click "Add Folder" to select a folder containing your music files
          </ThemedText>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <MaterialCommunityIcons name="numeric-1-circle" size={24} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: FluentSpacing.s, flex: 1 }}>
                Click the "Add Folder" button above
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <MaterialCommunityIcons name="numeric-2-circle" size={24} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: FluentSpacing.s, flex: 1 }}>
                Select a folder containing audio files (MP3, M4A, WAV, etc.)
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <MaterialCommunityIcons name="numeric-3-circle" size={24} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: FluentSpacing.s, flex: 1 }}>
                Your songs will appear in the library
              </ThemedText>
            </View>
          </View>
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
            {folders.length} folder{folders.length === 1 ? "" : "s"} added ({totalSongsSelected} songs total)
          </ThemedText>

          {folders.map((folder) => (
            <View
              key={folder.id}
              style={[
                styles.folderItem,
                { 
                  backgroundColor: theme.surfaceContainerLow,
                  borderColor: theme.primary,
                },
              ]}
            >
              <View style={styles.folderContent}>
                <View style={[styles.folderIcon, { backgroundColor: theme.primary + "20" }]}>
                  <MaterialCommunityIcons name="folder-music" size={24} color={theme.primary} />
                </View>
                <View style={styles.folderInfo}>
                  <ThemedText 
                    type="body" 
                    style={[styles.folderTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {folder.title}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {folder.assetCount} {folder.assetCount === 1 ? "song" : "songs"}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => handleRemoveFolder(folder.id)}
                  style={[styles.removeButton, { backgroundColor: theme.error + "15" }]}
                >
                  <MaterialCommunityIcons name="close" size={18} color={theme.error} />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {folders.length > 0 && (
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
                  Apply Changes
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      )}
    </ThemedView>
  );

  if (Platform.OS === "web") {
    return renderWebContent();
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: FluentSpacing.m,
    paddingHorizontal: FluentSpacing.xl,
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
    marginTop: FluentSpacing.l,
    marginBottom: FluentSpacing.s,
    fontWeight: "600",
  },
  instructionsList: {
    width: "100%",
    maxWidth: 300,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  folderItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.m,
    borderRadius: FluentControlRadius.dialog,
    marginBottom: FluentSpacing.s,
    borderWidth: 1,
  },
  folderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  folderIcon: {
    width: 48,
    height: 48,
    borderRadius: FluentControlRadius.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: FluentSpacing.m,
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
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
