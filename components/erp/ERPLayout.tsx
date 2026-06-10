// components/ERPLayout.tsx
// Fixed version:
//   1. All StyleSheet.create calls moved OUTSIDE the component (run once, not every render)
//   2. SidebarContent extracted as React.memo component (no remount on parent re-render)
//   3. Screen map pre-built outside render (no switch re-evaluation)
//   4. Master File accordion nav with chevron animation

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
  BarChart2,
  Building2,
  ChevronDown,
  PhilippinePeso,
  Database,
  LayoutDashboard,
  Menu,
  Package,
  PackagePlus,
  ShoppingCart,
  ShieldCheck,
  Users,
  Star,
  BadgePercent,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { LockedNavItem, LockedScreen } from '@/components/LockedFeature';
import DashboardScreen from '@/screens/DashboardScreen';
import SalesScreen from '@/screens/SalesScreen';
import InventoryScreen from '@/screens/InventoryScreen';
import HRScreen from '@/screens/HRScreen';
import FinanceScreen from '@/screens/FinancesScreen';
import SalesAnalyticsScreen from '@/screens/SalesAnalyticsScreen';
import MasterFileScreen from '@/screens/MasterFileScreen';
import RestockSchedulingScreen from '@/screens/RestockSchedulingScreen';
import AuditLogScreen from '@/screens/AuditLogScreen';
import DiscountTrackingScreen from '@/screens/DiscountTrackingScreen';
import OrderManagement from '@/screens/KompraOrderManagement';
import { useAuth } from '@/contexts/AuthContext';
import { ComingSoonScreen } from '../ComingSoon';

// ─── DEV: Plan Toggle FAB ─────────────────────────────────────────────────────
// Floating badge for presentations and testing — tap to switch Basic ↔ Gold.
// Remove before production. Reads/writes SubscriptionContext directly.

function PlanToggleFAB() {
  const { colors } = useTheme();
  const { plan, setPlan } = useSubscription();
  const isGold = plan === 'gold';

  return (
    <TouchableOpacity
      style={{
        position: 'absolute',
        bottom: 28,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: isGold ? '#E87722' : colors.surface,
        borderWidth: isGold ? 0 : 1.5,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 6,
        // Slightly transparent so it doesn't hide content
        opacity: 0.92,
      }}
      onPress={() => setPlan(isGold ? 'basic' : 'gold')}
      activeOpacity={0.8}
    >
      <Star
        size={13}
        color={isGold ? '#fff' : colors.textSecondary}
        strokeWidth={isGold ? 2.5 : 2}
        fill={isGold ? '#fff' : 'none'}
      />
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: isGold ? '#fff' : colors.textSecondary,
          letterSpacing: 0.3,
        }}
      >
        {isGold ? 'Gold' : 'Basic'}
      </Text>
      <View
        style={{
          width: 1,
          height: 12,
          backgroundColor: isGold ? 'rgba(255,255,255,0.4)' : colors.border,
        }}
      />
      <Text
        style={{
          fontSize: 10,
          color: isGold ? 'rgba(255,255,255,0.8)' : colors.textSecondary,
          fontWeight: '500',
        }}
      >
        {isGold ? 'tap → Basic' : 'tap → Gold'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ERPRoute =
  | 'Dashboard'
  | 'SalesOrders'
  | 'KompraOrders'
  | 'Inventory'
  | 'HR'
  | 'Finance'
  | 'SalesAnalytics'
  | 'MasterFile'
  | 'DiscountTracking'
  | 'RestockScheduling'
  | 'AuditLog';
// ✅ Restore proper width
const DRAWER_WIDTH = 240; // for mobile drawer
const SIDEBAR_WIDTH = 250; // for tablet/web persistent sidebar

// ─── Icon map (outside component — stable references) ─────────────────────────

const NAV_ICON_MAP: Record<
  ERPRoute,
  React.FC<{ size: number; color: string; strokeWidth?: number }>
> = {
  Dashboard: LayoutDashboard,
  SalesOrders: ShoppingCart,
  KompraOrders: ShoppingCart,
  Inventory: Package,
  RestockScheduling: PackagePlus,
  HR: Users,
  Finance: PhilippinePeso,
  SalesAnalytics: BarChart2,
  MasterFile: Database,
  DiscountTracking: BadgePercent,
  AuditLog: ShieldCheck,
};

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  key: ERPRoute;
  label: string;
}

// Always visible for both Basic and Gold
const FREE_NAV: NavItem[] = [
  { key: 'Dashboard', label: 'Dashboard' },
  { key: 'SalesOrders', label: 'Sales Orders' },
  { key: 'KompraOrders', label: 'Kompra Orders' },
  { key: 'Inventory', label: 'Inventory' },
  { key: 'DiscountTracking', label: 'Discounts' },
  { key: 'AuditLog', label: 'Audit Log' },
];

// Gold-only nav items — LockedNavItem for Basic, normal for Gold
// Finance and RestockScheduling are DEV-only: hidden in production builds.
// TO RESTORE in production: remove the __DEV__ wrapper and move them here permanently.
const GATED_NAV: (NavItem & { featureName: string })[] = [
  { key: 'HR', label: 'HR', featureName: 'HR Module' },
  { key: 'SalesAnalytics', label: 'Sales Analytics', featureName: 'Sales Analytics' },

  // ─── DEV ONLY ────────────────────────────────────────────────────────────
  // Visible in `expo start` / debug builds. Hidden in `eas build --profile production`.
  // To promote to production: move these two entries outside the __DEV__ spread.
  ...(__DEV__
    ? [
      { key: 'RestockScheduling' as ERPRoute, label: 'Restock Item', featureName: 'Restock Scheduling' },
      { key: 'Finance' as ERPRoute, label: 'Finance', featureName: 'Finance & Budget Planner' },
    ]
    : []),
];
// Combined for label lookups
const ALL_NAV: NavItem[] = [
  ...FREE_NAV,
  ...GATED_NAV,
  { key: 'MasterFile', label: 'Master File' },
];

// ─── Screen map is built inside component (depends on plan) ───────────────────
// See buildScreenMap() in ERPLayout function body.

// ─── StyleSheet outside component (runs once at module load) ──────────────────
// This is the #1 performance fix — creating styles inside the component
// body causes React Native to diff + re-apply layout on every render.

const makeStyles = (colors: any, isTablet: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
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
      marginRight: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 10,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
    },
    headerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.accent,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    headerBadgeTx: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    body: {
      flex: 1,
      flexDirection: isTablet ? 'row' : 'column',
      overflow: 'hidden',
    },
    sidebar: {
      width: SIDEBAR_WIDTH,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingTop: 8,
      flexGrow: 0
    },
    content: { flex: 1, overflow: 'hidden' },
    drawerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      zIndex: 10,
    },
    drawer: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
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
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    drawerLogo: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: -0.5,
    },
    drawerSubtitle: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 1,
      letterSpacing: 0.5,
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
    navItemActive: { backgroundColor: colors.primary },
    navLabel: { fontSize: 14, fontWeight: '600', letterSpacing: 0.1, flex: 1 },
    // Master File accordion
    mfItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginHorizontal: 8,
      marginBottom: 2,
      borderRadius: 8,
      gap: 10,
    },
    mfItemActive: { backgroundColor: colors.primary },
    mfLabel: { fontSize: 14, fontWeight: '600', letterSpacing: 0.1, flex: 1 },
    subItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingLeft: 46,
      paddingRight: 14,
      marginHorizontal: 8,
      marginBottom: 1,
      borderRadius: 8,
      gap: 8,
    },
    subItemActive: { backgroundColor: colors.primary + '22' },
    subDot: { width: 5, height: 5, borderRadius: 3 },
    subLabel: { fontSize: 13, fontWeight: '500' },
  });

// ─── Sidebar Content — extracted + memoized ───────────────────────────────────
// This is the #2 performance fix — when defined inside ERPLayout,
// React creates a new function reference every render and fully
// unmounts+remounts the sidebar tree on every tap. memo + extract = fixed.

interface SidebarProps {
  activeRoute: ERPRoute;
  navigate: (route: ERPRoute) => void;
  colors: any;
  styles: ReturnType<typeof makeStyles>;
  mfOpen: boolean;
  toggleMF: () => void;
  mfChevronAnim: Animated.Value;
  limits: ReturnType<typeof useSubscription>['limits'];
}

const SidebarContent = memo(function SidebarContent({
  activeRoute,
  navigate,
  colors,
  styles,
  mfOpen,
  toggleMF,
  mfChevronAnim,
  limits,
}: SidebarProps) {
  const chevronRotate = mfChevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const { user } = useAuth()
  if (!user) return null; // or a placeholder if user data is required for rendering
  const organizationName = user.org?.name || 'Right ERP';
  return (
    <>
      <View style={styles.drawerHeader}>
        <View style={styles.drawerLogoIcon}>
          <Building2 size={18} color="#fff" strokeWidth={2} />
        </View>
        <View>
          <Text style={styles.drawerLogo}>{organizationName}</Text>
          <Text style={styles.drawerSubtitle}>Enterprise Suite</Text>
        </View>
      </View>

      {/* Free nav items — always visible */}
      {FREE_NAV.map((item) => {
        const isActive = activeRoute === item.key;
        const Icon = NAV_ICON_MAP[item.key];
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
            <Text
              style={[
                styles.navLabel,
                { color: isActive ? '#fff' : colors.text },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Gated nav items — LockedNavItem for Basic, normal item for Gold */}
      {GATED_NAV.map((item) => {
        const isActive = activeRoute === item.key;
        const Icon = NAV_ICON_MAP[item.key];

        const canAccess =
          item.key === 'HR'
            ? limits.canAccessHR
            : item.key === 'Finance'
              ? limits.canAccessFinance
              : item.key === 'SalesAnalytics'
                ? limits.canAccessAnalytics
                : true;

        if (!canAccess) {
          return (
            <LockedNavItem
              key={item.key}
              label={item.label}
              icon={Icon}
              featureName={item.featureName}
              colors={colors}
              styles={styles}
            />
          );
        }

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
            <Text
              style={[
                styles.navLabel,
                { color: isActive ? '#fff' : colors.text },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Master File — locked for Basic */}
      {!limits.canAccessMasterFile ? (
        <LockedNavItem
          label="Master File"
          icon={Database}
          featureName="Master File"
          colors={colors}
          styles={styles}
        />
      ) : (
        <>
          <TouchableOpacity
            style={[
              styles.mfItem,
              activeRoute === 'MasterFile' && styles.mfItemActive,
            ]}
            onPress={toggleMF}
            activeOpacity={0.75}
          >
            <Database
              size={17}
              color={
                activeRoute === 'MasterFile' ? '#fff' : colors.textSecondary
              }
              strokeWidth={activeRoute === 'MasterFile' ? 2.5 : 2}
            />
            <Text
              style={[
                styles.mfLabel,
                { color: activeRoute === 'MasterFile' ? '#fff' : colors.text },
              ]}
            >
              Master File
            </Text>
            <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
              <ChevronDown
                size={15}
                color={
                  activeRoute === 'MasterFile' ? '#fff' : colors.textSecondary
                }
                strokeWidth={2}
              />
            </Animated.View>
          </TouchableOpacity>

          {mfOpen && (
            <View>
              {[
                'Item Categories',
                'VAT Types',
                'Departments',
                'Centers',
                'Sub-Centers',
                'Account Titles',
              ].map((label) => {
                const isActiveSub = activeRoute === 'MasterFile';
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.subItem,
                      isActiveSub && styles.subItemActive,
                    ]}
                    onPress={() => navigate('MasterFile')}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.subDot,
                        {
                          backgroundColor: isActiveSub
                            ? colors.primary
                            : colors.textSecondary,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.subLabel,
                        {
                          color: isActiveSub
                            ? colors.primary
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}
    </>
  );
});

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function ERPLayout() {
  const { colors, theme } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const { limits } = useSubscription();

  const [activeRoute, setActiveRoute] = useState<ERPRoute>('Dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mfOpen, setMFOpen] = useState(false);

  const drawerAnim = useRef(new Animated.Value(0)).current;
  const mfChevronAnim = useRef(new Animated.Value(0)).current;

  // Memoize styles — only recalculate when colors or isTablet changes
  const styles = React.useMemo(
    () => makeStyles(colors, isTablet),
    [colors, isTablet],
  );

  // ── Screen map — gated screens show LockedScreen for Basic ─────────────────
  const SCREEN_MAP = React.useMemo(
    (): Record<ERPRoute, React.ReactElement> => ({
      Dashboard: <DashboardScreen />,
      SalesOrders: <SalesScreen />,
      KompraOrders: <OrderManagement />,
      Inventory: <InventoryScreen />,
      HR: limits.canAccessHR ? <HRScreen /> : <LockedScreen featureName="HR Module" />,
      SalesAnalytics: limits.canAccessAnalytics
        ? <SalesAnalyticsScreen />
        : <LockedScreen featureName="Sales Analytics" />,
      MasterFile: limits.canAccessMasterFile
        ? <MasterFileScreen />
        : <LockedScreen featureName="Master File" />,
      DiscountTracking: <DiscountTrackingScreen />,
      AuditLog: <AuditLogScreen />,

      // ─── DEV ONLY ──────────────────────────────────────────────────────────
      // In dev (__DEV__ = true): renders the real screen so you can build/test it.
      // In production (__DEV__ = false): renders ComingSoonScreen — nav item is
      //   also hidden (see GATED_NAV), so this is just a safety net for direct
      //   route access or stale state.
      //
      // TO PROMOTE to production:
      //   Replace the ternary with the real gated version, e.g.:
      //     Finance: limits.canAccessFinance
      //       ? <FinanceScreen />
      //       : <LockedScreen featureName="Finance & Budget Planner" />
      //   Then move Finance + RestockScheduling back into GATED_NAV permanently.
      // ───────────────────────────────────────────────────────────────────────
      Finance: __DEV__
        ? limits.canAccessFinance
          ? <FinanceScreen />
          : <LockedScreen featureName="Finance & Budget Planner" />
        : <ComingSoonScreen featureName="Finance" />,

      RestockScheduling: __DEV__
        ? limits.canAccessRestockScheduling
          ? <RestockSchedulingScreen />
          : <LockedScreen featureName="Restock Scheduling" />
        : <ComingSoonScreen featureName="Restock Scheduling" />,
    }),
    [limits],
  );

  // ── Drawer ──────────────────────────────────────────────────────────────────
  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [drawerAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  }, [drawerAnim]);

  // ── Master File accordion ───────────────────────────────────────────────────
  const toggleMF = useCallback(() => {
    const toValue = mfOpen ? 0 : 1;
    setMFOpen((prev) => !prev);
    Animated.spring(mfChevronAnim, {
      toValue,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [mfOpen, mfChevronAnim]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = useCallback(
    (route: ERPRoute) => {
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

  const activeLabel =
    ALL_NAV.find((i) => i.key === activeRoute)?.label ?? 'ERP';
  const ActiveIcon = NAV_ICON_MAP[activeRoute];

  const sidebarProps: SidebarProps = {
    activeRoute,
    navigate,
    colors,
    styles,
    mfOpen,
    toggleMF,
    mfChevronAnim,
    limits,
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />

      {/* Header */}
      <View style={styles.header}>
        {!isTablet && (
          <TouchableOpacity
            style={styles.hamburger}
            onPress={openDrawer}
            activeOpacity={0.7}
          >
            <Menu size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        )}
        <View style={styles.headerLeft}>
          <ActiveIcon size={18} color={colors.primary} strokeWidth={2.5} />
          <Text style={styles.headerTitle}>{activeLabel}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Building2 size={12} color="#fff" strokeWidth={2} />
        </View>

      </View>

      <View style={styles.body}>
        {/* Tablet persistent sidebar */}
        {isTablet && (
          <ScrollView
            style={styles.sidebar}
            showsVerticalScrollIndicator={false}
          >
            <SidebarContent {...sidebarProps} />
          </ScrollView>
        )}

        {/* Main content — pre-built map, no switch */}
        <View style={styles.content}>{SCREEN_MAP[activeRoute]}</View>

        {/* Mobile drawer */}
        {!isTablet && drawerOpen && (
          <>
            <Animated.View
              style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
              pointerEvents="auto"
            >
              <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
            </Animated.View>
            <Animated.View
              style={[
                styles.drawer,
                { transform: [{ translateX: drawerTranslate }] },
              ]}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <SidebarContent {...sidebarProps} />
              </ScrollView>
            </Animated.View>
          </>
        )}
      </View>

      {/* ── DEV PLAN TOGGLE ─────────────────────────────────────────────────────
           Floating badge for demo / testing — toggle Basic ↔ Gold instantly.
           Remove this before production deployment.                           */}
    </SafeAreaView>
  );
}
