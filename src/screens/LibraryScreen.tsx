import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CategoryCard from '../components/CategoryCard';

const CATEGORIES = [
  { id: 'liked', name: 'Liked', icon: '❤️', count: 42 },
  { id: 'recent', name: 'Recent', icon: '🕐', count: 15 },
  { id: 'top', name: 'Top Played', icon: '📈', count: 25 },
  { id: 'songs', name: 'Songs', icon: '🎵', count: 156 },
  { id: 'albums', name: 'Albums', icon: '💿', count: 23 },
  { id: 'artists', name: 'Artists', icon: '👤', count: 18 },
  { id: 'playlists', name: 'Playlists', icon: '📋', count: 8 },
];

const FILTERS = ['All', 'Music', 'Recordings', 'Favorites'];

export default function LibraryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Library</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterMenu(!showFilterMenu)}
          >
            <Text style={styles.filterText}>{selectedFilter}</Text>
            <Text style={styles.filterIcon}>▼</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search your library..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {showFilterMenu && (
        <View style={styles.filterMenu}>
          {FILTERS.map(filter => (
            <TouchableOpacity
              key={filter}
              style={styles.filterOption}
              onPress={() => {
                setSelectedFilter(filter);
                setShowFilterMenu(false);
              }}
            >
              <Text style={[styles.filterOptionText, selectedFilter === filter && styles.filterOptionActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map(category => (
          <CategoryCard
            key={category.id}
            name={category.name}
            icon={category.icon}
            count={category.count}
            onPress={() => {}}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 36,
    gap: 6,
  },
  filterText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  filterIcon: {
    color: '#9ca3af',
    fontSize: 10,
  },
  filterMenu: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 4,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  filterOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  filterOptionText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  filterOptionActive: {
    color: '#6366f1',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 100,
    gap: 12,
  },
});
