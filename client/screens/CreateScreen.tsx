import React, { useState } from "react";
import { View, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSafeTabBarHeight } from "@/hooks/useSafeTabBarHeight";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FluentText, FluentSurface } from "@/components/fluent";
import { SongCard } from "@/components/SongCard";
import { GlassCard } from "@/components/GlassCard";
import { useThemeContext } from "@/contexts/ThemeContext";
import { FluentSpacing, FluentControlRadius, FluentIconSize, FluentTypography, FluentLightColors, FluentDarkColors } from "@/constants/fluent2";
import { mockSongs, Song } from "@/lib/data";
import { CreateStackParamList } from "@/navigation/CreateStackNavigator";

type NavigationProp = NativeStackNavigationProp<CreateStackParamList>;

export default function CreateScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useSafeTabBarHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useThemeContext();
  const colors = isDark ? FluentDarkColors : FluentLightColors;
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
          <View style={[styles.iconCircle, { backgroundColor: colors.colorBrandForeground1 + "20" }]}>
            <MaterialCommunityIcons name="microphone" size={FluentIconSize.medium} color={colors.colorBrandForeground1} />
          </View>
          <View style={styles.introText}>
            <FluentText variant="subtitle1">Create Your Recording</FluentText>
            <FluentText variant="body2" color="secondary" style={{ marginTop: FluentSpacing.xs }}>
              Select a song as your backing track and start singing
            </FluentText>
          </View>
        </View>
      </GlassCard>

      <View style={[styles.searchContainer, { backgroundColor: colors.colorNeutralBackground2 }]}>
        <MaterialCommunityIcons name="magnify" size={FluentIconSize.small} color={colors.colorNeutralForeground2} />
        <TextInput
          style={[styles.searchInput, { color: colors.colorNeutralForeground1 }]}
          placeholder="Search songs..."
          placeholderTextColor={colors.colorNeutralForeground2}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery("")}>
            <MaterialCommunityIcons name="close" size={FluentIconSize.small} color={colors.colorNeutralForeground2} />
          </Pressable>
        ) : null}
      </View>

      <FluentText variant="subtitle1" style={styles.sectionTitle}>
        Choose a Song
      </FluentText>
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
    <FluentSurface style={styles.container} background="neutral1">
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
              <MaterialCommunityIcons name="music" size={FluentIconSize.xxlarge} color={colors.colorNeutralForeground2} />
              <FluentText variant="body1" color="secondary" style={{ marginTop: FluentSpacing.m }}>
                No songs found
              </FluentText>
            </View>
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </FluentSurface>
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
