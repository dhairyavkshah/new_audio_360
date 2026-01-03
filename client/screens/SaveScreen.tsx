import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Image, Alert } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { addRecording, Recording } from "@/lib/storage";
import { mockSongs } from "@/lib/data";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;
type SaveRouteProp = RouteProp<CreateStackParamList, "Save">;

export default function SaveScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SaveRouteProp>();
  const { theme } = useThemeContext();

  const randomSong = mockSongs[Math.floor(Math.random() * mockSongs.length)];
  const [title, setTitle] = useState(`My Recording - ${randomSong.title}`);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Please enter a title for your recording");
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newRecording: Recording = {
      id: route.params.recordingId,
      title: title.trim(),
      songId: randomSong.id,
      songTitle: randomSong.title,
      artist: randomSong.artist,
      createdAt: new Date().toISOString(),
      duration: Math.floor(Math.random() * 180) + 60,
      voiceVolume: 100,
      musicVolume: 70,
      effect: "Studio Clean",
    };

    await addRecording(newRecording);

    setTimeout(() => {
      setIsSaving(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Saved!",
        "Your recording has been saved successfully.",
        [
          {
            text: "View Recordings",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "Create" }],
              });
            },
          },
          {
            text: "Create Another",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "Create" }],
              });
            },
          },
        ]
      );
    }, 1000);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.previewCard}>
          <View style={styles.previewContent}>
            <Image source={{ uri: randomSong.artwork }} style={styles.artwork} />
            <View style={styles.previewInfo}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Based on
              </ThemedText>
              <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
                {randomSong.title}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {randomSong.artist}
              </ThemedText>
            </View>
          </View>
        </GlassCard>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Recording Title
          </ThemedText>
          <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter a title..."
              placeholderTextColor={theme.textSecondary}
              maxLength={100}
            />
            {title.length > 0 ? (
              <Pressable onPress={() => setTitle("")}>
                <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <GlassCard style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="volume-high" size={18} color={theme.primary} />
              <ThemedText type="small" style={{ marginLeft: Spacing.sm }}>
                Standard Quality
              </ThemedText>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="folder" size={18} color={theme.primary} />
              <ThemedText type="small" style={{ marginLeft: Spacing.sm }}>
                Saved Locally
              </ThemedText>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.premiumCard}>
          <View style={styles.premiumContent}>
            <View style={[styles.premiumBadge, { backgroundColor: theme.primary + "20" }]}>
              <MaterialCommunityIcons name="star" size={20} color={theme.primary} />
            </View>
            <View style={styles.premiumText}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Upgrade to Premium
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Export in high quality and unlock all effects
              </ThemedText>
            </View>
          </View>
        </GlassCard>

        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={[
            styles.saveButton,
            { backgroundColor: theme.primary, opacity: isSaving ? 0.7 : 1 },
          ]}
        >
          {isSaving ? (
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              Saving...
            </ThemedText>
          ) : (
            <>
              <MaterialCommunityIcons name="content-save" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Save Recording
              </ThemedText>
            </>
          )}
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  previewCard: {
    marginBottom: Spacing.xl,
  },
  previewContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  artwork: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
  },
  previewInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.sm,
  },
  infoCard: {
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  premiumCard: {
    marginBottom: Spacing.xl,
  },
  premiumContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  premiumBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  premiumText: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
});
