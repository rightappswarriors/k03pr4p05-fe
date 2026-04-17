import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { styles } from '@/styles/settings';
import SettingItem from '@/components/dashboard/SettingItem';
import { StorageService } from '@/services/storageService';
import { useTransactionSync } from '@/hooks/useTransactionSync';
import eventBus from '@/utils/eventBus';
import { responsive } from '@/styles/desktopAndTablet';
import { useSegments } from 'expo-router';
import { router } from 'expo-router';
import { AuthService } from '@/services/authService';

export default React.memo(function SettingsScreen({
  outletId,
}: {
  outletId?: number | null;
}) {
  const {
    user,
    logout,
    setBiometricEnabled,
    isBiometricSupported,
    isBiometricEnabled,
  } = useAuth();
  const { theme, toggleTheme, colors } = useTheme();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const { setTransactions } = useTransactionSync({ refreshTrigger: 1 });
  const [assignment, setAssignment] = useState<{
    outletId: number;
    role: string;
    outletName: string;
  } | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(true);

  const segments = useSegments();
  const isInTabs = segments[0] === '(tabs)';
  const isInEmployee = segments[0] === '(employee)';
  useEffect(() => {
    checkBiometricSettings();

    AuthService.getMyOutletAssignment()
      .then(setAssignment)
      .finally(() => setAssignmentLoading(false));
  }, []);
  const { isDesktop, isTablet } = useResponsive();
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
        value
          ? 'Biometric login has been enabled'
          : 'Biometric login has been disabled',
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };
  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        try {
          await logout(Number(outletId));
        } catch (error) {
          //console.error('Logout Failed')
        }
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(Number(outletId)),
        },
      ]);
    }
  };

  const clearLocalData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will delete all locally stored orders and sync logs. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearAllData();
            setTransactions([]);
            eventBus.emit('transactionsCleared');
            Alert.alert('Success', 'All local data has been cleared');
          },
        },
      ],
    );
  };
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Settings
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Powered by Right Apps
        </Text>
      </View>
      <ScrollView
        style={[
          styles.content,
          isDesktop && responsive.padding,
          isTablet && responsive.tabletPadding,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
            <Image
              source={{
                uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop',
              }}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {user?.name}
              </Text>
              <Text
                style={[styles.profileEmail, { color: colors.textSecondary }]}
              >
                {user?.email}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text
                  style={[styles.roleText, { color: colors.textSecondary }]}
                >
                  {user?.role === 'OWNER' ? 'Owner' : 'Cashier'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security Settings */}
        {biometricSupported && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              Security
            </Text>
            <View
              style={[styles.settingsGroup, { backgroundColor: colors.card }]}
            >
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
        <View style={[styles.section]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            App Settings
          </Text>
          <View
            style={[styles.settingsGroup, { backgroundColor: colors.card }]}
          >
            <SettingItem
              icon={
                theme === 'light' ? (
                  <Moon size={20} color="#6366F1" />
                ) : (
                  <Sun size={20} color="#F59E0B" />
                )
              }
              title={'Theme'}
              subtitle={theme === 'light' ? 'Light Mode' : 'Dark Mode'}
              showChevron={false}
              rightComponent={
                <Switch
                  value={theme === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                  thumbColor={theme === 'dark' ? '#FFFFFF' : '#9CA3AF'}
                />
              }
            />

            <SettingItem
              icon={<Smartphone size={20} color="#6B7280" />}
              title={'App Version'}
              subtitle={'1.0.0'}
              showChevron={false}
            />
            <SettingItem
              style={'warning'}
              onPress={clearLocalData}
              icon={<Trash2 size={20} color="#6B7280" />}
              title={'Clear local data'}
              subtitle={'1.0.0'}
              showChevron={false}
            />
          </View>
        </View>

        {/* Attendance — hidden if already in /(employee) */}
        {!isInEmployee && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              Attendance
            </Text>
            <View
              style={[styles.settingsGroup, { backgroundColor: colors.card }]}
            >
              <SettingItem
                icon={<Store size={20} color="#EF4444" />}
                title="Attendance Management"
                subtitle="Manage your attendance and shifts"
                onPress={() => router.replace('/(employee)')}
              />
            </View>
          </View>
        )}

        {/* POS Terminal — only if assigned as CASHIER, hidden if already in /(tabs) */}
        {!assignmentLoading && assignment?.role === 'CASHIER' && !isInTabs && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              POS Terminal
            </Text>
            <View
              style={[styles.settingsGroup, { backgroundColor: colors.card }]}
            >
              <SettingItem
                icon={<Store size={20} color="#10B981" />}
                title={assignment.outletName}
                subtitle="Go to POS terminal"
                onPress={() => router.replace('/(tabs)')}
              />
            </View>
          </View>
        )}

        {/* ERP — only for OWNER and MANAGER, hidden if already in /(erp) */}
        {(user?.role === 'OWNER' || user?.role === 'MANAGER') &&
          segments[0] !== '(erp)' && (
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.textSecondary }]}
              >
                Management
              </Text>
              <View
                style={[styles.settingsGroup, { backgroundColor: colors.card }]}
              >
                <SettingItem
                  icon={<SettingsIcon size={20} color="#3B82F6" />}
                  title="Back to ERP"
                  subtitle="Go to business management"
                  onPress={() => router.replace('/(erp)')}
                />
              </View>
            </View>
          )}

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Support
          </Text>
          <View
            style={[styles.settingsGroup, { backgroundColor: colors.card }]}
          >
            <SettingItem
              icon={<SettingsIcon size={20} color="#6B7280" />}
              title={'Help & Support'}
              subtitle={'Get help and contact support'}
              onPress={() =>
                Alert.alert(
                  'Support',
                  'Contact support at support@techstore.com',
                )
              }
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.card }]}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#EF4444" />
            <Text
              style={[styles.logoutText, { color: colors.textSecondary }]}
              className="transition-all duration-400"
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});
