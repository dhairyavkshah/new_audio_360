import React from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFluent2Theme } from '@/contexts/Fluent2ThemeContext';
import { FluentText } from './FluentText';

interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

interface FluentTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

export function FluentTabBar({
  tabs,
  activeTab,
  onTabPress,
}: FluentTabBarProps) {
  const { colors, spacing, elevation } = useFluent2Theme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background.primary,
          paddingBottom: insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.stroke.secondary,
          ...elevation.level1,
        },
      ]}
    >
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabPress(tab.key)}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  isActive && {
                    backgroundColor: colors.brand.background,
                    borderRadius: 16,
                  },
                ]}
              >
                {isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
              </View>
              <FluentText
                variant="caption1"
                color={isActive ? 'brand' : 'secondary'}
                weight={isActive ? 'medium' : 'regular'}
                style={{ marginTop: spacing.xxs }}
              >
                {tab.label}
              </FluentText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
});
