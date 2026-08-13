// screens/admin/AdminLayout.tsx
// Super Admin panel — manages global ItemCategories and ItemGroups.
// Responsive: sidebar on web/tablet, drawer on mobile.

import React, { memo, useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  Layers,
  Menu,
  Settings,
  Shield,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import AdminDashboardScreen from '@/screens/admin/AdminDashboardScreen';
import GlobalCategoriesScreen from '@/screens/admin/GlobalCategoriesScreen';
import UserManagementScreen from '@/screens/admin/users/UserManagementScreen';
import SubscriptionManagementScreen from '@/screens/admin/SubscriptionManagementScreen';
import SettingsScreen from '@/components/Settings';
// ─── Routes ───────────────────────────────────────────────────────────────────

type AdminRoute =
  | 'Dashboard'
  | 'GlobalCategories'
  | 'GlobalGroups'
  | 'Subscriptions'
  | 'Settings'
  | 'UserManagement';

const DRAWER_WIDTH = 250;   // ← matches ERP sidebar
const SIDEBAR_WIDTH = 250;  // ← same value, persistent on tablet

// ─── Placeholder ─────────────────────────────────────────────────────────────

function PlaceholderScreen({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{title}</Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6 }}>Coming soon</Text>
    </View>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  key: AdminRoute;
  label: string;
  icon: React.FC<{ size: number; color: string; strokeWidth?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'GlobalCategories', label: 'Item Categories', icon: FolderOpen },
  { key: 'UserManagement', label: 'User Management', icon: Users },
  { key: 'GlobalGroups', label: 'Item Groups', icon: Layers },
  { key: 'Subscriptions', label: 'Subscriptions', icon: CreditCard },
  { key: 'Settings', label: 'Settings', icon: Settings },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: any, isTablet: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    hamburger: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 12,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
    adminBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#7C3AED',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    adminBadgeTx: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

    // Body
    body: { flex: 1, flexDirection: isTablet ? 'row' : 'column', overflow: 'hidden' },

    // ↓ KEY FIX: flexGrow:0 + flexShrink:0 keeps the sidebar from collapsing
    sidebar: {
      width: SIDEBAR_WIDTH,
      flexGrow: 0,
      flexShrink: 0,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingTop: 8,
    },

    content: { flex: 1, overflow: 'hidden' },

    // Drawer (mobile)
    drawerOverlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#000',
      zIndex: 10,
    },
    drawer: {
      position: 'absolute',
      top: 0, left: 0, bottom: 0,
      width: DRAWER_WIDTH,
      backgroundColor: colors.surface,
      zIndex: 20,
      paddingTop: Platform.OS === 'ios' ? 48 : 24,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 12,
    },

    // Sidebar internals
    drawerHeader: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    drawerLogoIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#7C3AED',
      alignItems: 'center',
      justifyContent: 'center',
    },
    drawerLogo: { fontSize: 16, fontWeight: '800', color: '#7C3AED', letterSpacing: -0.5 },
    drawerSubtitle: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 1,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: colors.textSecondary,
      paddingHorizontal: 22,
      paddingTop: 16,
      paddingBottom: 4,
      textTransform: 'uppercase',
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginHorizontal: 8,
      marginBottom: 2,
      borderRadius: 8,
      gap: 10,
    },
    navItemActive: { backgroundColor: '#7C3AED' },
    navLabel: { fontSize: 14, fontWeight: '600', letterSpacing: 0.1, flex: 1 },
  });

// ─── Sidebar content ──────────────────────────────────────────────────────────

interface SidebarProps {
  activeRoute: AdminRoute;
  navigate: (route: AdminRoute) => void;
  colors: any;
  styles: ReturnType<typeof makeStyles>;
}

const SidebarContent = memo(function SidebarContent({
  activeRoute,
  navigate,
  colors,
  styles,
}: SidebarProps) {
  return (
    <>
      <View style={styles.drawerHeader}>
        <View style={styles.drawerLogoIcon}>
          <Shield size={18} color="#fff" strokeWidth={2} />
        </View>
        <View>
          <Text style={styles.drawerLogo}>Admin</Text>
          <Text style={styles.drawerSubtitle}>Super Admin Panel</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Navigation</Text>

      {NAV_ITEMS.map((item) => {
        const isActive = activeRoute === item.key;
        const Icon = item.icon;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, isActive && styles.navItemActive]}
            onPress={() => navigate(item.key)}
            activeOpacity={0.75}
          >
            <Icon
              size={17}
              color={isActive ? '#fff' : colors.textSecondary}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <Text style={[styles.navLabel, { color: isActive ? '#fff' : colors.text }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </>
  );
});

// ─── Screen map ───────────────────────────────────────────────────────────────

function buildScreenMap(): Record<AdminRoute, React.ReactElement> {
  return {
    Dashboard: <AdminDashboardScreen />,
    GlobalCategories: <GlobalCategoriesScreen />,
    UserManagement: <UserManagementScreen />,
    GlobalGroups: <PlaceholderScreen title="Item Groups" />,
    Subscriptions: <SubscriptionManagementScreen />,
    Settings: <SettingsScreen />,
  };
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function AdminLayout() {
  const { colors, theme } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const [activeRoute, setActiveRoute] = useState<AdminRoute>('Dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawerAnim = useRef(new Animated.Value(0)).current;

  const styles = React.useMemo(() => makeStyles(colors, isTablet), [colors, isTablet]);
  const SCREEN_MAP = React.useMemo(() => buildScreenMap(), []);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [drawerAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(
      () => setDrawerOpen(false),
    );
  }, [drawerAnim]);

  const navigate = useCallback(
    (route: AdminRoute) => {
      setActiveRoute(route);
      if (!isTablet) closeDrawer();
    },
    [isTablet, closeDrawer],
  );

  const drawerTranslate = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });
  const overlayOpacity = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const activeNav = NAV_ITEMS.find((i) => i.key === activeRoute)!;
  const ActiveIcon = activeNav.icon;
  const sidebarProps: SidebarProps = { activeRoute, navigate, colors, styles };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />

      {/* Header */}
      <View style={styles.header}>
        {!isTablet && (
          <TouchableOpacity style={styles.hamburger} onPress={openDrawer} activeOpacity={0.7}>
            <Menu size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        )}
        <View style={styles.headerLeft}>
          <ActiveIcon size={18} color="#7C3AED" strokeWidth={2.5} />
          <Text style={styles.headerTitle}>{activeNav.label}</Text>
        </View>
        <View style={styles.adminBadge}>
          <Shield size={12} color="#fff" strokeWidth={2} />
          <Text style={styles.adminBadgeTx}>SUPER ADMIN</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Tablet: persistent sidebar */}
        {isTablet && (
          <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
            <SidebarContent {...sidebarProps} />
          </ScrollView>
        )}

        {/* Main content */}
        <View style={styles.content}>{SCREEN_MAP[activeRoute]}</View>

        {/* Mobile: animated drawer */}
        {!isTablet && drawerOpen && (
          <>
            <Animated.View
              style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
              pointerEvents="auto"
            >
              <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
            </Animated.View>
            <Animated.View
              style={[styles.drawer, { transform: [{ translateX: drawerTranslate }] }]}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <SidebarContent {...sidebarProps} />
              </ScrollView>
            </Animated.View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}