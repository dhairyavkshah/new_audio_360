import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMessage } from '../context/MessageContext';

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

const SettingItem = ({ icon, title, subtitle, onPress, rightElement }: SettingItemProps) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress && !rightElement}>
    <Text style={styles.settingIcon}>{icon}</Text>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || (onPress && <Text style={styles.chevron}>›</Text>)}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const { showMessage } = useMessage();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>General</Text>
        <View style={styles.section}>
          <SettingItem
            icon="🎨"
            title="Appearance"
            subtitle="Dark mode"
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={val => {
                  setDarkMode(val);
                  showMessage(`Dark mode ${val ? 'enabled' : 'disabled'}`, 'info');
                }}
                trackColor={{ false: '#3e3e5e', true: '#6366f1' }}
                thumbColor="#fff"
              />
            }
          />
          <SettingItem
            icon="🔔"
            title="Notifications"
            subtitle="Enable alerts"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={val => {
                  setNotifications(val);
                  showMessage(`Notifications ${val ? 'enabled' : 'disabled'}`, 'info');
                }}
                trackColor={{ false: '#3e3e5e', true: '#6366f1' }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        <Text style={styles.sectionTitle}>Audio</Text>
        <View style={styles.section}>
          <SettingItem
            icon="🎛️"
            title="Equalizer"
            subtitle="Customize sound profile"
            onPress={() => showMessage('Equalizer settings', 'info')}
          />
          <SettingItem
            icon="🔊"
            title="Playback Quality"
            subtitle="High quality"
            onPress={() => showMessage('Quality settings', 'info')}
          />
          <SettingItem
            icon="⏱️"
            title="Sleep Timer"
            subtitle="Off"
            onPress={() => showMessage('Sleep timer settings', 'info')}
          />
        </View>

        <Text style={styles.sectionTitle}>Storage</Text>
        <View style={styles.section}>
          <SettingItem
            icon="📁"
            title="Music Folders"
            subtitle="Manage scan locations"
            onPress={() => showMessage('Folder settings', 'info')}
          />
          <SettingItem
            icon="🗑️"
            title="Clear Cache"
            subtitle="Free up space"
            onPress={() => showMessage('Cache cleared!', 'success')}
          />
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <SettingItem
            icon="ℹ️"
            title="Version"
            subtitle="1.0.0"
          />
          <SettingItem
            icon="📜"
            title="Licenses"
            onPress={() => showMessage('Open source licenses', 'info')}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New Audio 360</Text>
          <Text style={styles.footerSubtext}>Premium Offline Music Player</Text>
        </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  settingIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: '#6b7280',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  footerSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
});
