import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Image, Platform } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { Dialog } from "@/components/Dialog";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useStudioContext } from "@/contexts/StudioContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { addRecording, Recording } from "@/lib/storage";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";
import { studioAudioEngine } from "@/services/StudioAudioEngine";
import { AudioMixerModule } from "../../modules/audio-effects";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;
type SaveRouteProp = RouteProp<CreateStackParamList, "Save">;

export default function SaveScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SaveRouteProp>();
  const { theme } = useThemeContext();
  const { currentProject, selectedReverb, noiseReduction } = useStudioContext();

  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (currentProject) {
      setTitle(`${currentProject.name} - Recording`);
    }
  }, [currentProject]);

  const mapReverbToNative = (reverb: string): string => {
    const mapping: Record<string, string> = {
      'None': 'none',
      'Small Studio': 'small_studio',
      'Medium Studio': 'medium_studio',
      'Large Studio': 'large_studio',
      'Open Theatre': 'open_theatre',
      'Auditorium': 'auditorium',
    };
    return mapping[reverb] || 'none';
  };

  const mapNoiseToNative = (noise: string): string => {
    const mapping: Record<string, string> = {
      'Off': 'off',
      'Light': 'light',
      'Medium': 'medium',
      'Strong': 'strong',
    };
    return mapping[noise] || 'off';
  };

  const handleSave = async () => {
    if (!title.trim()) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setErrorMessage("Please enter a title for your recording");
      setShowErrorDialog(true);
      return;
    }

    setIsSaving(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const voiceUri = studioAudioEngine.getRecordedUri();
      const backingTrackUri = currentProject?.backgroundTrackUri;
      
      let exportResult;
      
      if (Platform.OS === 'android' && AudioMixerModule.isAvailable()) {
        setSaveProgress("Processing audio...");
        
        if (backingTrackUri && voiceUri) {
          setSaveProgress("Mixing tracks with effects...");
          exportResult = await AudioMixerModule.mixAndExport(
            backingTrackUri,
            voiceUri,
            title.trim(),
            currentProject?.musicVolume || 70,
            currentProject?.voiceVolume || 100,
            0,
            mapReverbToNative(selectedReverb) as any,
            mapNoiseToNative(noiseReduction) as any
          );
        } else if (voiceUri) {
          setSaveProgress("Saving voice recording...");
          exportResult = await AudioMixerModule.copyVoiceRecording(voiceUri, title.trim());
        } else {
          throw new Error("No recording available to save");
        }
        
        if (!exportResult.success) {
          throw new Error(exportResult.error || "Failed to export recording");
        }
        
        setSaveProgress("Saving metadata...");
      } else {
        setSaveProgress("Saving recording metadata...");
        exportResult = {
          success: true,
          uri: voiceUri || undefined,
          duration: studioAudioEngine.getDuration(),
          fileSize: 0,
        };
      }

      const newRecording: Recording = {
        id: route.params.recordingId,
        title: title.trim(),
        songId: currentProject?.id || "unknown",
        songTitle: currentProject?.backgroundTrackTitle || "Unknown Track",
        artist: "You",
        createdAt: new Date().toISOString(),
        duration: Math.floor((exportResult.duration || studioAudioEngine.getDuration()) / 1000),
        voiceVolume: currentProject?.voiceVolume || 100,
        musicVolume: currentProject?.musicVolume || 70,
        effect: `${selectedReverb} / ${noiseReduction}`,
        fileUri: exportResult.uri,
        backingTrackUri: backingTrackUri || undefined,
        voiceTrackUri: voiceUri || undefined,
        reverbPreset: selectedReverb,
        noiseReduction: noiseReduction,
        fileSize: exportResult.fileSize,
      };

      await addRecording(newRecording);

      setIsSaving(false);
      setSaveProgress("");
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Save error:", error);
      setIsSaving(false);
      setSaveProgress("");
      setErrorMessage(error instanceof Error ? error.message : "Failed to save recording");
      setShowErrorDialog(true);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    navigation.reset({
      index: 0,
      routes: [{ name: "Create" }],
    });
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
        {currentProject?.backgroundTrackTitle ? (
          <GlassCard style={styles.previewCard}>
            <View style={styles.previewContent}>
              <View style={[styles.artworkPlaceholder, { backgroundColor: theme.primary + "30" }]}>
                <MaterialCommunityIcons name="music" size={32} color={theme.primary} />
              </View>
              <View style={styles.previewInfo}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Based on
                </ThemedText>
                <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
                  {currentProject.backgroundTrackTitle}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Karaoke Recording
                </ThemedText>
              </View>
            </View>
          </GlassCard>
        ) : null}

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
              <MaterialCommunityIcons name="waveform" size={18} color={theme.primary} />
              <ThemedText type="small" style={{ marginLeft: Spacing.sm }}>
                {selectedReverb}
              </ThemedText>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="volume-off" size={18} color={theme.primary} />
              <ThemedText type="small" style={{ marginLeft: Spacing.sm }}>
                Noise: {noiseReduction}
              </ThemedText>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.qualityCard}>
          <View style={styles.qualityContent}>
            <MaterialCommunityIcons name="quality-high" size={24} color={theme.primary} />
            <View style={styles.qualityText}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                High Quality Export
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                320kbps AAC • Saved to device
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
            <View style={styles.savingContent}>
              <MaterialCommunityIcons name="loading" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
                {saveProgress || "Saving..."}
              </ThemedText>
            </View>
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

      <Dialog
        visible={showSuccessDialog}
        title="Recording Saved!"
        message="Your recording has been saved successfully to your device."
        actions={[
          { label: "Done", onPress: handleSuccessClose, variant: "secondary" }
        ]}
        onDismiss={handleSuccessClose}
      />

      <Dialog
        visible={showErrorDialog}
        title="Save Failed"
        message={errorMessage}
        actions={[
          { label: "OK", onPress: () => setShowErrorDialog(false), variant: "default" }
        ]}
        onDismiss={() => setShowErrorDialog(false)}
      />
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
  artworkPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
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
  qualityCard: {
    marginBottom: Spacing.xl,
  },
  qualityContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  qualityText: {
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
  savingContent: {
    flexDirection: "row",
    alignItems: "center",
  },
});
