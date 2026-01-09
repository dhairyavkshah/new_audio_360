import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, Alert } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FluentScreenLayout, FluentText } from "@/components/fluent";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { getRecordings, deleteRecording, Recording } from "@/lib/storage";
import { mockSongs } from "@/lib/data";

export default function RecordingsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
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
          <FluentText variant="body1Strong" numberOfLines={1}>
            {item.title}
          </FluentText>
          <FluentText variant="body1" color="secondary" numberOfLines={1}>
            {item.songTitle} - {item.artist}
          </FluentText>
          <View style={styles.recordingMeta}>
            <FluentText variant="caption1" color="secondary">
              {formatDate(item.createdAt)}
            </FluentText>
            <FluentText variant="caption1" color="secondary">
              {formatDuration(item.duration)}
            </FluentText>
          </View>
        </View>
      </View>
      <View style={styles.recordingActions}>
        <Pressable
          onPress={() => handleShare(item)}
          style={[styles.actionButton, { backgroundColor: colors.colorBrandBackground + "20" }]}
        >
          <MaterialCommunityIcons name="share-variant" size={FluentIconSize.regular} color={colors.colorBrandForeground1} />
        </Pressable>
        <Pressable
          onPress={() => handleDelete(item)}
          style={[styles.actionButton, { backgroundColor: colors.colorPaletteRedBackground1 }]}
        >
          <MaterialCommunityIcons name="delete-outline" size={FluentIconSize.regular} color={colors.colorPaletteRedForeground1} />
        </Pressable>
      </View>
    </GlassCard>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.colorBrandBackground + "20" }]}>
        <MaterialCommunityIcons name="microphone-off" size={FluentIconSize.xxlarge} color={colors.colorBrandForeground1} />
      </View>
      <FluentText variant="subtitle1" style={styles.emptyTitle}>
        No Recordings Yet
      </FluentText>
      <FluentText variant="body1" color="secondary" style={styles.emptyDesc}>
        Create your first recording by selecting a song in the Create tab
      </FluentText>
    </View>
  );

  return (
    <FluentScreenLayout edges={[]} hasBottomNavigation={false}>
      <FlatList
        data={recordings}
        renderItem={renderRecording}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerHeight + FluentSpacing.xxl, paddingBottom: insets.bottom + FluentSpacing.xxl },
        ]}
        ListEmptyComponent={isLoading ? null : renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </FluentScreenLayout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: FluentSpacing.l,
    flexGrow: 1,
  },
  recordingCard: {
    marginBottom: FluentSpacing.m,
  },
  recordingContent: {
    flexDirection: "row",
    marginBottom: FluentSpacing.m,
  },
  artwork: {
    width: 64,
    height: 64,
    borderRadius: FluentControlRadius.card,
  },
  recordingInfo: {
    flex: 1,
    marginLeft: FluentSpacing.m,
    justifyContent: "center",
  },
  recordingMeta: {
    flexDirection: "row",
    gap: FluentSpacing.m,
    marginTop: FluentSpacing.xs,
  },
  recordingActions: {
    flexDirection: "row",
    gap: FluentSpacing.s,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.card,
    gap: FluentSpacing.s,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.xxl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: FluentControlRadius.avatar,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: FluentSpacing.xxl,
  },
  emptyTitle: {
    marginBottom: FluentSpacing.s,
    textAlign: "center",
  },
  emptyDesc: {
    textAlign: "center",
  },
});
