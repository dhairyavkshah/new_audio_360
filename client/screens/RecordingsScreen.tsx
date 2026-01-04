import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, Alert } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getRecordings, deleteRecording, Recording } from "@/lib/storage";
import { mockSongs } from "@/lib/data";

export default function RecordingsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeContext();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecordings = async () => {
    setIsLoading(true);
    const data = await getRecordings();
    setRecordings(data);
    setIsLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadRecordings();
    }, [])
  );

  const handleDelete = (recording: Recording) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Recording",
      `Are you sure you want to delete "${recording.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteRecording(recording.id);
            loadRecordings();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleShare = (recording: Recording) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Share Recording",
      "Sharing will be available in a future update. Your recording is saved locally.",
      [{ text: "OK" }]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getArtwork = (songId: string) => {
    const song = mockSongs.find((s) => s.id === songId);
    return song?.artwork || "https://picsum.photos/seed/default/400/400";
  };

  const renderRecording = ({ item }: { item: Recording }) => (
    <GlassCard style={styles.recordingCard}>
      <View style={styles.recordingContent}>
        <Image source={{ uri: getArtwork(item.songId) }} style={styles.artwork} />
        <View style={styles.recordingInfo}>
          <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "600" }}>
            {item.title}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
            {item.songTitle} - {item.artist}
          </ThemedText>
          <View style={styles.recordingMeta}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {formatDate(item.createdAt)}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {formatDuration(item.duration)}
            </ThemedText>
          </View>
        </View>
      </View>
      <View style={styles.recordingActions}>
        <Pressable
          onPress={() => handleShare(item)}
          style={[styles.actionButton, { backgroundColor: theme.primary + "20" }]}
        >
          <MaterialCommunityIcons name="share-variant" size={18} color={theme.primary} />
        </Pressable>
        <Pressable
          onPress={() => handleDelete(item)}
          style={[styles.actionButton, { backgroundColor: theme.error + "20" }]}
        >
          <MaterialCommunityIcons name="delete-outline" size={18} color={theme.error} />
        </Pressable>
      </View>
    </GlassCard>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "20" }]}>
        <MaterialCommunityIcons name="microphone-off" size={48} color={theme.primary} />
      </View>
      <ThemedText type="h4" style={styles.emptyTitle}>
        No Recordings Yet
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyDesc, { color: theme.textSecondary }]}>
        Create your first recording by selecting a song in the Create tab
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={recordings}
        renderItem={renderRecording}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        ListEmptyComponent={isLoading ? null : renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  recordingCard: {
    marginBottom: Spacing.md,
  },
  recordingContent: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  artwork: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
  },
  recordingInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: "center",
  },
  recordingMeta: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  recordingActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptyDesc: {
    textAlign: "center",
  },
});
