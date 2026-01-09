import React, { useState } from "react";
import { View, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SongCard } from "@/components/SongCard";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize, FluentTypography } from "@/constants/fluent2";
import { mockSongs, Song } from "@/lib/data";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;

export default function CreateScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useSafeTabBarHeight();
  const insets = useSafeAreaInsets();
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
            <MaterialCommunityIcons name="microphone" size={FluentIconSize.medium} color={theme.primary} />
          </View>
          <View style={styles.introText}>
            <ThemedText type="h4">Create Your Recording</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: FluentSpacing.xs }}>
              Select a song as your backing track and start singing
            </ThemedText>
          </View>
        </View>
      </GlassCard>

      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <MaterialCommunityIcons name="magnify" size={FluentIconSize.small} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search songs..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery("")}>
            <MaterialCommunityIcons name="close" size={FluentIconSize.small} color={theme.textSecondary} />
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          data={filteredSongs}
          renderItem={renderSong}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: headerHeight + FluentSpacing.xl, paddingBottom: tabBarHeight + FluentSpacing.xl },
          ]}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="music" size={FluentIconSize.xxlarge} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: FluentSpacing.m }}>
                No songs found
              </ThemedText>
            </View>
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: FluentSpacing.l,
  },
  header: {
    marginBottom: FluentSpacing.l,
  },
  introCard: {
    marginBottom: FluentSpacing.xl,
  },
  introContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: FluentControlRadius.avatar,
    justifyContent: "center",
    alignItems: "center",
  },
  introText: {
    flex: 1,
    marginLeft: FluentSpacing.l,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: FluentSpacing.l,
    paddingVertical: FluentSpacing.m,
    borderRadius: FluentControlRadius.input,
    marginBottom: FluentSpacing.xl,
  },
  searchInput: {
    flex: 1,
    marginLeft: FluentSpacing.s,
    ...FluentTypography.body2,
  },
  sectionTitle: {
    marginBottom: FluentSpacing.m,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: FluentSpacing.xxxl,
  },
});
