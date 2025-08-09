import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  Image,
  Platform,
} from 'react-native';
import {
  User,
  Shield,
  Bell,
  Smartphone,
  LogOut,
  Fingerprint,
  Store,
  Users,
  Settings as SettingsIcon,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext'

import { styles } from '@/styles/settings'
import SettingItem from '@/components/dashboard/SettingItem'

export default function SettingsScreen() {
  const { user, logout, setBiometricEnabled, isBiometricSupported, isBiometricEnabled } = useAuth();
  const { theme, toggleTheme, colors } = useTheme()
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    checkBiometricSettings();
  }, []);

  const checkBiometricSettings = async () => {
    const supported = await isBiometricSupported();
    const enabled = await isBiometricEnabled();
    setBiometricSupported(supported);
    setBiometricEnabledState(enabled);
  };

  const handleBiometricToggle = async (value: boolean) => {
    try {
      await setBiometricEnabled(value);
      setBiometricEnabledState(value);
      Alert.alert(
        'Biometric Authentication',
        value ? 'Biometric login has been enabled' : 'Biometric login has been disabled'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?')
      if (confirmed) {
        try {
          await logout()
        } catch (error) {
          console.error('Logout Failed')
        }
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: logout
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} >
      <View style={[styles.header, {backgroundColor : colors.surface, borderBottomColor:colors.border}]}>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Settings</Text>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} >
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={[styles.profileCard, {backgroundColor: colors.card}]} >
            <Image
              source={{ uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop' }}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo} >
              <Text style={[styles.profileName, {color: colors.text}]} >{user?.name}</Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary}]} >{user?.email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: colors.background }]} >
                <Text style={[styles.roleText, { color: colors.textSecondary}]} >
                  {user?.role === 'owner' ? 'Owner' : 'Cashier'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section} >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.card }]} >
            <SettingItem
              icon={<User size={20} color="#3B82F6" />}
              title="Profile Information"
              subtitle="Update your personal details"
              onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available soon')}
            />
            <SettingItem
              icon={<Shield size={20} color="#10B981" />}
              title="Change Password"
              subtitle="Update your account password"
              onPress={() => Alert.alert('Coming Soon', 'Password change will be available soon')}
            />
          </View>
        </View>
        {/* Security Settings */}
        {biometricSupported && (
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security</Text>
          <View style={[styles.settingsGroup,  { backgroundColor: colors.card }]}>
            
              <SettingItem
                icon={<Fingerprint size={20} color="#8B5CF6" />}
                title="Biometric Login"
                subtitle="Use fingerprint or face recognition"
                showChevron={false}
                rightComponent={
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                    thumbColor={biometricEnabled ? '#FFFFFF' : '#9CA3AF'}
                  />
                }
              />
            
          </View>
        </View>
        )}

        {/* App Settings */}
        <View style={[styles.section,]}>
          <Text style={[styles.sectionTitle,  { color: colors.textSecondary }]} >App Settings</Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.card }]} >
            <SettingItem
              icon={theme === 'light'
                ? <Moon size={20} color='#6366F1' />
                : <Sun size={20} color='#F59E0B' />}
              title={"Theme"}
              subtitle={theme === 'light' ? 'Light Mode' : 'Dark Mode'}
              showChevron={false}
              rightComponent={
                <Switch
                  value={theme === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                  thumbColor={ theme === 'dark' ? '#FFFFFF' : '#9CA3AF'}
              />
            }
            />
            <SettingItem
              icon={<Bell size={20} color="#F59E0B" />}
              title={"Notifications"}
              subtitle={"Manage notification preferences"}
              showChevron={false}
              rightComponent={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                  thumbColor={notificationsEnabled ? '#FFFFFF' : '#9CA3AF'}
                />
              }
            />
            <SettingItem
              icon={<Smartphone size={20} color="#6B7280" />}
              title={"App Version"}
              subtitle={"1.0.0"}
              showChevron={false}
            />
          </View>
        </View>

        {/* Owner-only Settings */}
        {user?.role === 'owner' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle,   { color: colors.textSecondary }]} >Business Management</Text>
            <View style={[styles.settingsGroup,  { backgroundColor: colors.card }]} >
              <SettingItem
                icon={<Store size={20} color="#EF4444" />}
                title={"Store Management"}
                subtitle={"Manage your stores and locations"}
                onPress={() => Alert.alert('Coming Soon', 'Store management will be available soon')}
              />
              <SettingItem
                icon={<Users size={20} color="#EC4899" />}
                title={"Staff Management"}
                subtitle={"Manage cashiers and permissions"}
                onPress={() => Alert.alert('Coming Soon', 'Staff management will be available soon')}
              />
            </View>
          </View>
        )}

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} >Support</Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.card }]} >
            <SettingItem
              icon={<SettingsIcon size={20} color="#6B7280" />}
              title={"Help & Support"}
              subtitle={"Get help and contact support"}
              onPress={() => Alert.alert('Support', 'Contact support at support@techstore.com')}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section} >
          <TouchableOpacity  style={[styles.logoutButton,  { backgroundColor: colors.card }]} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={[styles.logoutText, { color: colors.textSecondary }]} className='transition-all duration-400'>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
