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
  Building2,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { styles } from '@/styles/settings';
import SettingItem from '@/components/dashboard/SettingItem';
import { StorageService } from '@/services/storageService';
import eventBus from '@/utils/eventBus';
import { responsive } from '@/styles/desktopAndTablet';
import { useSegments } from 'expo-router';
import { router } from 'expo-router';
import { AuthService } from '@/services/authService';
import UserProfileModal from '@/components/UserProfileModal';
import OrganizationProfileModal from '@/components/OrganizationProfileModal';

export default function SettingsScreen({
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

  const [userProfileVisible, setUserProfileVisible] = useState(false);
  const [orgProfileVisible, setOrgProfileVisible] = useState(false);
  const [assignment, setAssignment] = useState<{
    outletId: number;
    role: string;
    outletName: string;
  } | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(true);

  // ── Modal visibility state ──────────────────────────────────

  const segments = useSegments();
  const isInTabs = segments[0] === '(tabs)';
  const isInEmployee = segments[0] === '(employee)';
  const { isDesktop, isTablet } = useResponsive();

  const isOwner = user?.role === 'OWNER';

  useEffect(() => {
    // ✅ These are async functions from context, not hooks — safe to call inside useEffect
    const init = async () => {
      const supported = await isBiometricSupported();
      const enabled = await isBiometricEnabled();
      setBiometricSupported(supported);
      setBiometricEnabledState(enabled);
    };
    init();

    AuthService.getMyOutletAssignment()
      .then(setAssignment)
      .finally(() => setAssignmentLoading(false));
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
        } catch (error) { }
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
  console.log('segments:', segments);
  const clearLocalData = async () => {
    try {
      const orders = await StorageService.getOfflineOrders();
      const unsynced = orders.filter(
        (order) => order.status === 'PENDING' || order.status === 'FAILED',
      );
      if (unsynced.length > 0) {
        Alert.alert(
          'Cannot Clear Local Data',
          'There are unsynced transactions in history. Please sync or retry them before clearing local data.',
        );
        return;
      }
    } catch (error) {
      console.error('Failed to check transaction status before clearing data:', error);
    }

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
            eventBus.emit('transactionsCleared');
            Alert.alert('Success', 'All local data has been cleared');
          },
        },
      ],
    );
  };

  // ── Guard: only OWNER can open the org modal ────────────────
  const handleOrgProfilePress = () => {
    if (!isOwner) {
      Alert.alert(
        'Access Restricted',
        'Only the organization owner can edit the organization profile.',
      );
      return;
    }
    setOrgProfileVisible(true);
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
              defaultSource={require('@/assets/images/placeholder.png')}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {user?.name}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                {user?.email}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: colors.background }]}>
                <Text style={[styles.roleText, { color: colors.textSecondary }]}>
                  {user?.role === 'OWNER' ? 'Owner' : 'Cashier'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Section — User Profile & Org Profile */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Account
          </Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>

            {/* Any logged-in user can view/edit their own profile */}
            <SettingItem
              icon={<User size={20} color={colors.primary} />}
              title="My Profile"
              subtitle="Edit your personal information"
              onPress={() => setUserProfileVisible(true)}
            />

            {/* Org profile — tappable for all, but guarded inside handler */}
            <SettingItem
              icon={<Building2 size={20} color={isOwner ? colors.accent : colors.textSecondary} />}
              title="Organization Profile"
              subtitle={isOwner ? 'Edit your organization details' : 'Owner access required'}
              onPress={handleOrgProfilePress}
            />

          </View>
        </View>

        {/* Security Settings */}
        {biometricSupported && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Security
            </Text>
            <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
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
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            App Settings
          </Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
            <SettingItem
              icon={
                theme === 'light'
                  ? <Moon size={20} color="#6366F1" />
                  : <Sun size={20} color="#F59E0B" />
              }
              title="Theme"
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
              title="App Version"
              subtitle="1.0.0"
              showChevron={false}
            />
            <SettingItem
              style="warning"
              onPress={clearLocalData}
              icon={<Trash2 size={20} color="#6B7280" />}
              title="Clear local data"
              subtitle="Remove all offline orders and sync logs"
              showChevron={false}
            />
          </View>
        </View>

        {/* Attendance — hidden if already in /(employee) */}
        {!isInEmployee && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Attendance
            </Text>
            <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
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
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              POS Terminal
            </Text>
            <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
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
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Management
              </Text>
              <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
                <SettingItem
                  icon={<SettingsIcon size={20} color="#3B82F6" />}
                  title="Back to ERP"
                  subtitle="Go to business management"
                  onPress={() => router.replace('/(erp)')}
                />
              </View>
            </View>
          )}

        {/* Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Support
          </Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
            <SettingItem
              icon={<SettingsIcon size={20} color="#6B7280" />}
              title="Help & Support"
              subtitle="Get help and contact support"
              onPress={() =>
                Alert.alert('Support', 'Contact support at support@techstore.com')
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
            <Text style={[styles.logoutText, { color: colors.textSecondary }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Modals ───────────────────────────────────────────── */}
      {__DEV__ && (<UserProfileModal
        visible={userProfileVisible}
        onClose={() => setUserProfileVisible(false)}
        onUpdated={() => {
          // Optionally refresh user data here, e.g. refetchUser()
        }}
      />)}

      {/* Only mount the org modal if the user is owner to avoid
          unnecessary service calls for non-owners */}
      {isOwner && (
        <OrganizationProfileModal
          visible={orgProfileVisible}
          onClose={() => setOrgProfileVisible(false)}
          organizationId={user?.orgId}
          onUpdated={() => {
            // Optionally refresh org data here
          }}
        />
      )}
    </SafeAreaView>
  );
};