import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';

interface SettingItem {
  title: string;
  subtitle?: string;
  type: 'toggle' | 'navigation' | 'action';
  value?: boolean;
  onPress?: () => void;
  destructive?: boolean;
}

export default function SettingsScreen() {
  const { isSignedIn, userId, signOut } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [reminderTime, setReminderTime] = useState('8:00 AM');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        },
      ]
    );
  };

  const toggleSetting = (setter: (value: boolean) => void, value: boolean) => {
    Haptics.selectionAsync();
    setter(!value);
  };

  const settings: SettingItem[] = [
    {
      title: 'Push Notifications',
      subtitle: 'Workout reminders and updates',
      type: 'toggle',
      value: notifications,
    },
    {
      title: 'Reminder Time',
      subtitle: reminderTime,
      type: 'navigation',
      onPress: () => Alert.alert('Coming Soon', 'Time picker will be implemented'),
    },
    {
      title: 'Sound Effects',
      subtitle: 'Timer and completion sounds',
      type: 'toggle',
      value: soundEnabled,
    },
    {
      title: 'Haptic Feedback',
      subtitle: 'Vibration on interactions',
      type: 'toggle',
      value: hapticEnabled,
    },
    {
      title: 'Offline Mode',
      subtitle: 'Download workouts for offline use',
      type: 'toggle',
      value: offlineMode,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>BM</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Beastmode User</Text>
            <Text style={styles.profileEmail}>{userId || 'user@example.com'}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          <View style={styles.settingsCard}>
            {settings.slice(0, 2).map((setting, index) => (
              <View key={index}>
                <TouchableOpacity 
                  style={styles.settingItem}
                  onPress={setting.onPress}
                  disabled={setting.type !== 'toggle'}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>{setting.title}</Text>
                    {setting.subtitle && (
                      <Text style={styles.settingSubtitle}>{setting.subtitle}</Text>
                    )}
                  </View>
                  {setting.type === 'toggle' && (
                    <Switch
                      value={setting.value}
                      onValueChange={() => toggleSetting(setNotifications, notifications)}
                      trackColor={{ false: '#0f3460', true: '#4a90d9' }}
                      thumbColor="#fff"
                    />
                  )}
                  {setting.type === 'navigation' && (
                    <Text style={styles.chevron}>›</Text>
                  )}
                </TouchableOpacity>
                {index < 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP SETTINGS</Text>
          <View style={styles.settingsCard}>
            {settings.slice(2).map((setting, index) => (
              <View key={index}>
                <TouchableOpacity style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>{setting.title}</Text>
                    {setting.subtitle && (
                      <Text style={styles.settingSubtitle}>{setting.subtitle}</Text>
                    )}
                  </View>
                  <Switch
                    value={setting.value}
                    onValueChange={() => {
                      if (setting.title === 'Sound Effects') toggleSetting(setSoundEnabled, soundEnabled);
                      if (setting.title === 'Haptic Feedback') toggleSetting(setHapticEnabled, hapticEnabled);
                      if (setting.title === 'Offline Mode') toggleSetting(setOfflineMode, offlineMode);
                    }}
                    trackColor={{ false: '#0f3460', true: '#4a90d9' }}
                    thumbColor="#fff"
                  />
                </TouchableOpacity>
                {index < 2 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingTitle}>Sync Status</Text>
              <View style={styles.syncStatus}>
                <View style={styles.syncDot} />
                <Text style={styles.syncText}>Synced</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingTitle}>Clear Cache</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingTitle}>Help Center</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingTitle}>Privacy Policy</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingTitle}>Terms of Service</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.version}>Habithletics v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 25,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4a90d9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 15,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4a90d9',
  },
  editButtonText: {
    color: '#4a90d9',
    fontWeight: '600',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 10,
    marginLeft: 5,
    letterSpacing: 1,
  },
  settingsCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#0f3460',
    marginLeft: 16,
  },
  chevron: {
    fontSize: 24,
    color: '#7f8c8d',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  syncText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  signOutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e94560',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  signOutText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: 12,
    marginTop: 30,
    marginBottom: 40,
  },
});