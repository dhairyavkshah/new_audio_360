import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { FluentSpacing, FluentRadius, FluentLightColors, FluentDarkColors, FluentTouchTarget, FluentIconSize, FluentControlHeight, getShadowStyle } from "@/constants/fluent2";
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

const FOLDER_ITEM_HEIGHT = 56;
const CHECKBOX_SIZE = 24;
const CHECKBOX_BORDER_RADIUS = FluentRadius.medium;
const BUTTON_HEIGHT = FluentControlHeight.large;
const BUTTON_BORDER_RADIUS = BUTTON_HEIGHT / 2;

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
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
  const { refreshSongs, setSelectedFolders: updateContextFolders, setWebAudioFiles } = useMediaLibraryContext();
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [webFolders, setWebFolders] = useState<WebFolderData[]>(getSessionWebFolders());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setSuccessMessage("Folder selection saved successfully");
    setTimeout(() => setSuccessMessage(null), 3000);
  }, [selectedFolderIds, refreshSongs, updateContextFolders, webFolders, setWebAudioFiles]);

  const totalSongsSelected = folders
    .filter(f => selectedFolderIds.includes(f.id))
    .reduce((sum, f) => sum + f.assetCount, 0);

  const renderWebContent = () => (
    <FluentScreenLayout hasBottomNavigation={false} isNestedScreen={true}>
      <View style={[styles.header, { backgroundColor: colors.colorNeutralBackground2 }]}>
        <Pressable
          onPress={handleAddFolder}
          disabled={isScanning}
          style={[styles.addButton, { backgroundColor: colors.colorBrandBackground, opacity: isScanning ? 0.7 : 1 }]}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="folder-plus" size={FluentIconSize.regular} color="#FFFFFF" />
              <FluentText variant="body2Strong" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.m }}>
                Add Folder
              </FluentText>
            </>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
          <FluentText variant="body2" color="secondary" style={{ marginTop: FluentSpacing.m }}>
            Loading folders...
          </FluentText>
        </View>
      ) : folders.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="folder-music-outline" size={80} color={colors.colorNeutralForeground3} />
          <FluentText variant="title3" style={[styles.emptyTitle, { color: colors.colorNeutralForeground1 }]}>
            No Music Folders Added
          </FluentText>
          <FluentText variant="body2" color="secondary" style={{ textAlign: "center", marginBottom: FluentSpacing.xl }}>
            Click "Add Folder" to select a folder containing your music files
          </FluentText>
          <View style={[styles.sectionCard, { backgroundColor: colors.colorNeutralBackground2 }]}>
            <FluentText variant="subtitle1" style={{ color: colors.colorNeutralForeground1, marginBottom: FluentSpacing.m }}>
              How to Get Started
            </FluentText>
            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <MaterialCommunityIcons name="numeric-1-circle" size={FluentIconSize.medium} color={colors.colorBrandForeground1} />
                <FluentText variant="body2" color="secondary" style={{ marginLeft: FluentSpacing.m, flex: 1 }}>
                  Click the "Add Folder" button above
                </FluentText>
              </View>
              <View style={styles.instructionItem}>
                <MaterialCommunityIcons name="numeric-2-circle" size={FluentIconSize.medium} color={colors.colorBrandForeground1} />
                <FluentText variant="body2" color="secondary" style={{ marginLeft: FluentSpacing.m, flex: 1 }}>
                  Select a folder containing audio files (MP3, M4A, WAV, etc.)
                </FluentText>
              </View>
              <View style={styles.instructionItem}>
                <MaterialCommunityIcons name="numeric-3-circle" size={FluentIconSize.medium} color={colors.colorBrandForeground1} />
                <FluentText variant="body2" color="secondary" style={{ marginLeft: FluentSpacing.m, flex: 1 }}>
                  Your songs will appear in the library
                </FluentText>
              </View>
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
          <FluentText variant="caption1" color="secondary" style={styles.infoText}>
            {folders.length} folder{folders.length === 1 ? "" : "s"} added ({totalSongsSelected} songs total)
          </FluentText>

          <View style={styles.sectionHeaderContainer}>
            <FluentText variant="caption1" style={[styles.sectionHeader, { color: colors.colorNeutralForeground3 }]}>
              ADDED FOLDERS
            </FluentText>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.colorNeutralBackground2 }]}>
            {folders.map((folder) => (
              <View
                key={folder.id}
                style={[
                  styles.folderItem,
                  { 
                    backgroundColor: colors.colorBrandForeground1 + "1A",
                  },
                ]}
              >
                <View style={styles.folderContent}>
                  <MaterialCommunityIcons name="folder-music" size={FluentIconSize.medium} color={colors.colorBrandForeground1} />
                  <View style={styles.folderInfo}>
                    <FluentText 
                      variant="body2" 
                      style={{ color: colors.colorNeutralForeground1 }}
                      numberOfLines={1}
                    >
                      {folder.title}
                    </FluentText>
                    <FluentText variant="caption1" color="secondary">
                      {folder.assetCount} {folder.assetCount === 1 ? "song" : "songs"}
                    </FluentText>
                  </View>
                  <Pressable
                    onPress={() => handleRemoveFolder(folder.id)}
                    style={[styles.removeButton, { backgroundColor: colors.colorPaletteRedForeground1 + "15" }]}
                  >
                    <MaterialCommunityIcons name="close" size={FluentIconSize.regular} color={colors.colorPaletteRedForeground1} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {folders.length > 0 && (
        <View style={[
          styles.footer, 
          { 
            backgroundColor: colors.colorNeutralBackground1, 
            paddingBottom: insets.bottom + FluentSpacing.l,
            borderTopColor: colors.colorNeutralStroke2,
          }
        ]}>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={[
              styles.saveButton, 
              { 
                backgroundColor: colors.colorBrandBackground,
                opacity: isSaving ? 0.7 : 1,
              }
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save" size={FluentIconSize.regular} color="#FFFFFF" />
                <FluentText variant="body2Strong" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.m }}>
                  Apply Changes
                </FluentText>
              </>
            )}
          </Pressable>
        </View>
      )}

      {successMessage ? (
        <View style={[styles.successToast, { backgroundColor: colors.colorPaletteGreenForeground1 }]}>
          <MaterialCommunityIcons name="check-circle" size={FluentIconSize.regular} color="#FFFFFF" />
          <FluentText variant="caption1" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s, flex: 1 }}>
            {successMessage}
          </FluentText>
        </View>
      ) : null}
    </FluentScreenLayout>
  );

  if (Platform.OS === "web") {
    return renderWebContent();
  }

  return (
    <FluentScreenLayout hasBottomNavigation={true} isNestedScreen={true}>
      <View style={[styles.header, { backgroundColor: colors.colorNeutralBackground2 }]}>
        <Pressable
          onPress={selectAll}
          style={[styles.headerButton, { backgroundColor: colors.colorBrandBackground }]}
        >
          <MaterialCommunityIcons name="checkbox-multiple-marked" size={FluentIconSize.regular} color="#FFFFFF" />
          <FluentText variant="caption1Strong" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s }}>
            Select All
          </FluentText>
        </Pressable>
        <Pressable
          onPress={clearAll}
          style={[styles.headerButton, { backgroundColor: colors.colorNeutralBackground3 }]}
        >
          <MaterialCommunityIcons name="checkbox-multiple-blank-outline" size={FluentIconSize.regular} color={colors.colorNeutralForeground1} />
          <FluentText variant="caption1Strong" style={{ color: colors.colorNeutralForeground1, marginLeft: FluentSpacing.s }}>
            Clear
          </FluentText>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
          <FluentText variant="body2" color="secondary" style={{ marginTop: FluentSpacing.m }}>
            Scanning folders...
          </FluentText>
        </View>
      ) : folders.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="folder-music" size={64} color={colors.colorNeutralForeground2} />
          <FluentText variant="body2" color="secondary" style={styles.emptyTitle}>
            No Music Folders Found
          </FluentText>
          <FluentText variant="body2" color="secondary" style={{ textAlign: "center" }}>
            Add music to your device to see folders here
          </FluentText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <FluentText variant="caption1" color="secondary" style={styles.infoText}>
            {selectedFolderIds.length === 0 
              ? "No folders selected - showing all songs"
              : `${selectedFolderIds.length} folder${selectedFolderIds.length === 1 ? "" : "s"} selected (${totalSongsSelected} songs)`
            }
          </FluentText>

          <View style={styles.sectionHeaderContainer}>
            <FluentText variant="caption1" style={[styles.sectionHeader, { color: colors.colorNeutralForeground3 }]}>
              AVAILABLE FOLDERS
            </FluentText>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: colors.colorNeutralBackground2 }]}>
            {folders.map((folder) => {
              const isSelected = selectedFolderIds.includes(folder.id);
              return (
                <Pressable
                  key={folder.id}
                  onPress={() => toggleFolder(folder.id)}
                  style={[
                    styles.folderItem,
                    { 
                      backgroundColor: isSelected ? colors.colorBrandForeground1 + "1A" : "transparent",
                    },
                  ]}
                >
                  <View style={styles.folderContent}>
                    <MaterialCommunityIcons 
                      name="folder-music" 
                      size={FluentIconSize.medium} 
                      color={isSelected ? colors.colorBrandForeground1 : colors.colorNeutralForeground2} 
                    />
                    <View style={styles.folderInfo}>
                      <FluentText 
                        variant="body2" 
                        style={{ color: colors.colorNeutralForeground1 }}
                        numberOfLines={1}
                      >
                        {folder.title}
                      </FluentText>
                      <FluentText variant="caption1" color="secondary">
                        {folder.assetCount} {folder.assetCount === 1 ? "song" : "songs"}
                      </FluentText>
                    </View>
                    <View style={styles.checkboxTouchTarget}>
                      <View style={[
                        styles.checkbox,
                        { 
                          backgroundColor: isSelected ? colors.colorBrandBackground : colors.colorNeutralBackground3,
                          borderColor: isSelected ? colors.colorBrandForeground1 : colors.colorNeutralStroke2,
                        },
                      ]}>
                        {isSelected && (
                          <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                        )}
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View style={[
        styles.footer, 
        { 
          backgroundColor: colors.colorNeutralBackground1, 
          paddingBottom: Platform.OS === 'android' ? tabBarHeight + FluentSpacing.l : insets.bottom + FluentSpacing.l,
          borderTopColor: colors.colorNeutralStroke2,
        }
      ]}>
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={[
            styles.saveButton, 
            { 
              backgroundColor: colors.colorBrandBackground,
              opacity: isSaving ? 0.7 : 1,
            }
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save" size={FluentIconSize.regular} color="#FFFFFF" />
              <FluentText variant="body2Strong" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.m }}>
                Save Selection
              </FluentText>
            </>
          )}
        </Pressable>
      </View>

      {successMessage ? (
        <View style={[styles.successToast, { backgroundColor: colors.colorPaletteGreenForeground1 }]}>
          <MaterialCommunityIcons name="check-circle" size={FluentIconSize.regular} color="#FFFFFF" />
          <FluentText variant="caption1" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s, flex: 1 }}>
            {successMessage}
          </FluentText>
        </View>
      ) : null}
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "center",
    gap: FluentSpacing.m,
    padding: FluentSpacing.l,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    height: BUTTON_HEIGHT,
    paddingHorizontal: FluentSpacing.l,
    borderRadius: BUTTON_BORDER_RADIUS,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    height: BUTTON_HEIGHT,
    paddingHorizontal: FluentSpacing.xl,
    borderRadius: BUTTON_BORDER_RADIUS,
  },
  content: {
    paddingHorizontal: FluentSpacing.l,
    paddingTop: FluentSpacing.s,
  },
  infoText: {
    textAlign: "center",
    marginBottom: FluentSpacing.m,
  },
  sectionHeaderContainer: {
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.s,
  },
  sectionHeader: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  sectionCard: {
    borderRadius: FluentRadius.xLarge,
    overflow: "hidden",
    marginBottom: FluentSpacing.m,
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
    height: FOLDER_ITEM_HEIGHT,
    paddingLeft: FluentSpacing.l,
    paddingRight: FluentSpacing.l,
  },
  folderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  folderInfo: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    justifyContent: "center",
  },
  checkboxTouchTarget: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    justifyContent: "center",
    alignItems: "center",
  },
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: CHECKBOX_BORDER_RADIUS,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: BUTTON_BORDER_RADIUS,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: FluentSpacing.l,
    paddingTop: FluentSpacing.l,
    borderTopWidth: 1,
    gap: FluentSpacing.m,
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_BORDER_RADIUS,
  },
  successToast: {
    position: "absolute",
    bottom: 100,
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.l,
    borderRadius: FluentRadius.large,
    ...getShadowStyle('shadow4'),
  },
});
