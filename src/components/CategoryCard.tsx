import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

interface CategoryCardProps {
  name: string;
  icon: string;
  count: number;
  onPress: () => void;
}

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 48 - 12) / 2;

export default function CategoryCard({ name, icon, count, onPress }: CategoryCardProps) {
  return (
    <TouchableOpacity style={[styles.container, { width: cardWidth }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.count}>{count} items</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  count: {
    fontSize: 13,
    color: '#9ca3af',
  },
});
