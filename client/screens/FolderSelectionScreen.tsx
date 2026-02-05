import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import { FluentScreenLayout, FluentText, FluentSectionHeader } from "@/components/fluent";
import { useThemeContext, useThemedColors } from "@/contexts/ThemeContext";
import { useMediaLibraryContext } from "@/contexts/MediaLibraryContext";
import { 
  FluentSpacing, 
  FluentControlRadius, 
  FluentRadius, 
  FluentTouchTarget, 
  FluentIconSize, 
  FluentControlHeight,
  getShadowStyle 
} from "@/constants/fluent2";
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
  const tabBarHeight = useSafeTabBarHeight();
  const { isDark } = useThemeContext();
  const colors = useThemedColors();
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

  const renderFolderItem = (folder: FolderInfo, isWeb: boolean = false) => {
    const isSelected = selectedFolderIds.includes(folder.id);
    
    return (
      <Pressable
        key={folder.id}
        onPress={() => isWeb ? undefined : toggleFolder(folder.id)}
        style={[
          styles.folderItem,
          getShadowStyle('shadow2', isDark),
          { backgroundColor: colors.colorNeutralBackground2 },
        ]}
      >
        <View style={[styles.folderIconContainer, { backgroundColor: colors.colorBrandBackground + "20" }]}>
          <MaterialCommunityIcons 
            name="folder-music" 
            size={FluentIconSize.medium} 
            color={colors.colorBrandForeground1} 
          />
        </View>
        <View style={styles.folderTextContainer}>
          <FluentText 
            variant="body1Strong" 
            numberOfLines={1}
            style={{ color: colors.colorNeutralForeground1 }}
          >
            {folder.title}
          </FluentText>
          <FluentText variant="caption1" color="tertiary" numberOfLines={1}>
            {folder.assetCount} {folder.assetCount === 1 ? "song" : "songs"}
          </FluentText>
        </View>
        {isWeb ? (
          <Pressable
            onPress={() => handleRemoveFolder(folder.id)}
            style={[styles.removeButton, { backgroundColor: colors.colorPaletteRedForeground1 + "15" }]}
          >
            <MaterialCommunityIcons name="close" size={FluentIconSize.regular} color={colors.colorPaletteRedForeground1} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => toggleFolder(folder.id)}
            style={[
              styles.checkboxCircle,
              { 
                backgroundColor: isSelected ? colors.colorBrandBackground : "transparent",
                borderColor: isSelected ? colors.colorBrandBackground : colors.colorNeutralStroke1,
              },
            ]}
          >
            {isSelected && (
              <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
            )}
          </Pressable>
        )}
      </Pressable>
    );
  };

  const renderWebContent = () => (
    <FluentScreenLayout hasBottomNavigation={false} isNestedScreen={true}>
      <View style={[styles.header, { backgroundColor: colors.colorNeutralBackground1 }]}>
        <Pressable
          onPress={handleAddFolder}
          disabled={isScanning}
          style={[
            styles.addButton, 
            { 
              backgroundColor: colors.colorBrandBackground, 
              opacity: isScanning ? 0.7 : 1 
            }
          ]}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="folder-plus" size={FluentIconSize.regular} color="#FFFFFF" />
              <FluentText variant="body1Strong" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s }}>
                Add Folder
              </FluentText>
            </>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
          <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.m }}>
            Loading folders...
          </FluentText>
        </View>
      ) : folders.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="folder-music-outline" size={80} color={colors.colorNeutralForeground3} />
          <FluentText variant="title3" style={[styles.emptyTitle, { color: colors.colorNeutralForeground1 }]}>
            No Music Folders Added
          </FluentText>
          <FluentText variant="body1" color="secondary" style={{ textAlign: "center", marginBottom: FluentSpacing.xl }}>
            Click "Add Folder" to select a folder containing your music files
          </FluentText>
          <View style={[styles.instructionsCard, getShadowStyle('shadow4', isDark), { backgroundColor: colors.colorNeutralBackground2 }]}>
            <FluentSectionHeader icon="help-circle-outline" title="How to Get Started" />
            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <MaterialCommunityIcons name="numeric-1-circle" size={24} color={colors.colorBrandForeground1} />
                <FluentText variant="body2" color="secondary" style={{ marginLeft: FluentSpacing.s, flex: 1 }}>
                  Click the "Add Folder" button above
                </FluentText>
              </View>
              <View style={styles.instructionItem}>
                <MaterialCommunityIcons name="numeric-2-circle" size={24} color={colors.colorBrandForeground1} />
                <FluentText variant="body2" color="secondary" style={{ marginLeft: FluentSpacing.s, flex: 1 }}>
                  Select a folder containing audio files (MP3, M4A, WAV, etc.)
                </FluentText>
              </View>
              <View style={styles.instructionItem}>
                <MaterialCommunityIcons name="numeric-3-circle" size={24} color={colors.colorBrandForeground1} />
                <FluentText variant="body2" color="secondary" style={{ marginLeft: FluentSpacing.s, flex: 1 }}>
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

          <FluentSectionHeader icon="folder-multiple" title="Added Folders" style={{ marginHorizontal: FluentSpacing.l }} />
          
          <View style={styles.foldersList}>
            {folders.map((folder) => renderFolderItem(folder, true))}
          </View>
        </ScrollView>
      )}

      {folders.length > 0 && (
        <View style={[
          styles.footer, 
          getShadowStyle('shadow8', isDark),
          { 
            backgroundColor: colors.colorNeutralBackground1, 
            paddingBottom: insets.bottom + FluentSpacing.m,
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
                <FluentText variant="body1Strong" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s }}>
                  Apply Changes
                </FluentText>
              </>
            )}
          </Pressable>
        </View>
      )}

      {successMessage ? (
        <View style={[styles.successToast, getShadowStyle('shadow8', isDark), { backgroundColor: colors.colorPaletteGreenForeground1 }]}>
          <MaterialCommunityIcons name="check-circle" size={FluentIconSize.regular} color="#FFFFFF" />
          <FluentText variant="body2" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s, flex: 1 }}>
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
      <View style={[styles.header, { backgroundColor: colors.colorNeutralBackground1 }]}>
        <View style={styles.headerButtonsRow}>
          <Pressable
            onPress={selectAll}
            style={[styles.headerButton, { backgroundColor: colors.colorBrandBackground }]}
          >
            <MaterialCommunityIcons name="checkbox-multiple-marked" size={FluentIconSize.regular} color="#FFFFFF" />
            <FluentText variant="body2Strong" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s }}>
              Select All
            </FluentText>
          </Pressable>
          <Pressable
            onPress={clearAll}
            style={[styles.headerButton, { backgroundColor: colors.colorNeutralBackground3, borderWidth: 1, borderColor: colors.colorNeutralStroke1 }]}
          >
            <MaterialCommunityIcons name="checkbox-multiple-blank-outline" size={FluentIconSize.regular} color={colors.colorNeutralForeground1} />
            <FluentText variant="body2Strong" style={{ color: colors.colorNeutralForeground1, marginLeft: FluentSpacing.s }}>
              Clear
            </FluentText>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.colorBrandForeground1} />
          <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.m }}>
            Scanning folders...
          </FluentText>
        </View>
      ) : folders.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="folder-music" size={64} color={colors.colorNeutralForeground2} />
          <FluentText variant="body1" color="secondary" style={styles.emptyTitle}>
            No Music Folders Found
          </FluentText>
          <FluentText variant="body1" color="secondary" style={{ textAlign: "center" }}>
            Add music to your device to see folders here
          </FluentText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <FluentText variant="caption1" color="secondary" style={styles.infoText}>
            {selectedFolderIds.length === 0 
              ? "No folders selected - showing all songs"
              : `${selectedFolderIds.length} folder${selectedFolderIds.length === 1 ? "" : "s"} selected (${totalSongsSelected} songs)`
            }
          </FluentText>

          <FluentSectionHeader icon="folder-multiple" title="Available Folders" style={{ marginHorizontal: FluentSpacing.l }} />
          
          <View style={styles.foldersList}>
            {folders.map((folder) => renderFolderItem(folder, false))}
          </View>
        </ScrollView>
      )}

      <View style={[
        styles.footer, 
        getShadowStyle('shadow8', isDark),
        { 
          backgroundColor: colors.colorNeutralBackground1, 
          paddingBottom: Platform.OS === 'android' ? tabBarHeight + FluentSpacing.m : insets.bottom + FluentSpacing.m,
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
              <FluentText variant="body1Strong" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s }}>
                Save Selection
              </FluentText>
            </>
          )}
        </Pressable>
      </View>

      {successMessage ? (
        <View style={[styles.successToast, getShadowStyle('shadow8', isDark), { backgroundColor: colors.colorPaletteGreenForeground1 }]}>
          <MaterialCommunityIcons name="check-circle" size={FluentIconSize.regular} color="#FFFFFF" />
          <FluentText variant="body2" style={{ color: "#FFFFFF", marginLeft: FluentSpacing.s, flex: 1 }}>
            {successMessage}
          </FluentText>
        </View>
      ) : null}
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
  },
  headerButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: FluentSpacing.m,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: FluentControlHeight.large,
    paddingHorizontal: FluentSpacing.l,
    borderRadius: FluentControlRadius.button,
    minWidth: 120,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: FluentControlHeight.large,
    paddingHorizontal: FluentSpacing.xl,
    borderRadius: FluentControlRadius.button,
    alignSelf: "center",
  },
  content: {
    paddingTop: FluentSpacing.s,
  },
  infoText: {
    textAlign: "center",
    marginBottom: FluentSpacing.l,
    paddingHorizontal: FluentSpacing.l,
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
  },
  instructionsCard: {
    borderRadius: FluentControlRadius.card,
    padding: FluentSpacing.l,
    width: "100%",
    maxWidth: 360,
  },
  instructionsList: {
    width: "100%",
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: FluentSpacing.m,
  },
  foldersList: {
    paddingHorizontal: FluentSpacing.l,
    gap: FluentSpacing.s,
  },
  folderItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: FluentSpacing.l,
    borderRadius: FluentControlRadius.card,
    minHeight: 56,
  },
  folderIconContainer: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.card,
    alignItems: "center",
    justifyContent: "center",
  },
  folderTextContainer: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    gap: FluentSpacing.xxs,
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    width: FluentTouchTarget.minimum,
    height: FluentTouchTarget.minimum,
    borderRadius: FluentControlRadius.button,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: FluentSpacing.l,
    paddingTop: FluentSpacing.m,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: FluentControlHeight.xlarge,
    borderRadius: FluentControlRadius.button,
  },
  successToast: {
    position: "absolute",
    bottom: 120,
    left: FluentSpacing.l,
    right: FluentSpacing.l,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentRadius.large,
  },
});
