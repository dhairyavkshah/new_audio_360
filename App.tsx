import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AudioProvider } from './src/context/AudioContext';
import { MessageProvider } from './src/context/MessageContext';
import ListenScreen from './src/screens/ListenScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import StudioScreen from './src/screens/StudioScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
    <Text style={[styles.tabIconText, focused && styles.tabIconTextFocused]}>
      {name === 'Listen' ? '🎵' : name === 'Library' ? '📚' : name === 'Studio' ? '🎤' : '⚙️'}
    </Text>
  </View>
);

export default function App() {
  return (
    <SafeAreaProvider>
      <AudioProvider>
        <MessageProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: '#6366f1',
                tabBarInactiveTintColor: '#9ca3af',
                tabBarLabelStyle: styles.tabBarLabel,
              }}
            >
              <Tab.Screen 
                name="Listen" 
                component={ListenScreen}
                options={{
                  tabBarIcon: ({ focused }) => <TabIcon name="Listen" focused={focused} />
                }}
              />
              <Tab.Screen 
                name="Library" 
                component={LibraryScreen}
                options={{
                  tabBarIcon: ({ focused }) => <TabIcon name="Library" focused={focused} />
                }}
              />
              <Tab.Screen 
                name="Studio" 
                component={StudioScreen}
                options={{
                  tabBarIcon: ({ focused }) => <TabIcon name="Studio" focused={focused} />
                }}
              />
              <Tab.Screen 
                name="Settings" 
                component={SettingsScreen}
                options={{
                  tabBarIcon: ({ focused }) => <TabIcon name="Settings" focused={focused} />
                }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </MessageProvider>
      </AudioProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1a1a2e',
    borderTopColor: '#2d2d44',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconFocused: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  tabIconText: {
    fontSize: 16,
  },
  tabIconTextFocused: {
    fontSize: 18,
  },
});
