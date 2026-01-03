import React, { useState } from "react";
import { View, StyleSheet, FlatList, TextInput, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SongCard } from "@/components/SongCard";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { mockSongs, Song } from "@/lib/data";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;

export default function CreateScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useThemeContext();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSongs = mockSongs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSongSelect = (song: Song) => {
    navigation.navigate("Recording", { songId: song.id });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <GlassCard style={styles.introCard}>
        <View style={styles.introContent}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
            <MaterialCommunityIcons name="microphone" size={24} color={theme.primary} />
          </View>
          <View style={styles.introText}>
            <ThemedText type="h4">Create Your Recording</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
              Select a song as your backing track and start singing
            </ThemedText>
          </View>
        </View>
      </GlassCard>

      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <MaterialCommunityIcons name="magnify" size={18} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search songs..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery("")}>
            <MaterialCommunityIcons name="close" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Choose a Song
      </ThemedText>
    </View>
  );

  const renderSong = ({ item }: { item: Song }) => (
    <SongCard
      song={item}
      onPress={() => handleSongSelect(item)}
      showDuration={true}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={filteredSongs}
        renderItem={renderSong}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="music" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              No songs found
            </ThemedText>
          </View>
        }
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
  },
  header: {
    marginBottom: Spacing.lg,
  },
  introCard: {
    marginBottom: Spacing.xl,
  },
  introContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  introText: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
});
