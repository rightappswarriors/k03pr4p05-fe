// components/ERPLayout.tsx

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
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
  Image,
} from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import {
  BarChart2,
  Bell,
  Boxes,
  Building2,
  Clock,
  CreditCard,
  History,
  Link2,
  LayoutDashboard,
  Lock,
  Menu,
  Moon,
  Package,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Star,
  Sun,
  Tag,
  Truck,
  Users,
  Wallet,
  Banknote,
  Settings,
  TagIcon,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { MasterFileProvider } from '@/contexts/MasterFileContext';
import PermissionDenied from '@/components/PermissionDenied';
import { SkeletonBox } from '@/components/LoadingSkeleton';
import { usePermissions } from '@/hooks/usePermissions';

// ─── DEV: Plan Toggle FAB ─────────────────────────────────────────────────────


function ThemeToggleButton() {
  const { colors, theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const Icon = isDark ? Sun : Moon;

  return (
    <TouchableOpacity
      style={{
        width: 38,
        height: 38,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.sidebarMuted,
        borderWidth: 1,
        borderColor: colors.border,
      }}
      onPress={toggleTheme}
      activeOpacity={0.78}
    >
      <Icon size={17} color={colors.text} strokeWidth={2.2} />
    </TouchableOpacity>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
// This union now matches the actual files under app/(supplier)/ exactly.
// Add a new member here (and to PATH_TO_ROUTE / ROUTE_TO_PATH / NAV_ICON_MAP /
// one of the nav section arrays below) whenever you add a new route file.
type SupplierRoute =
  | 'Dashboard' // index.tsx
  | 'PurchaseOrders' // po-inbox.tsx
  | 'Deliveries' // deliveries.tsx
  | 'OrderTimeline' // order-timeline.tsx
  | 'Products' // catalog.tsx
  | 'Pricing' // pricing.tsx
  | 'Categories'
  | 'Inventory' // inventory.tsx
  | 'Wallet' // wallet.tsx
  | 'Transactions' // transactions.tsx
  | 'Withdrawals' // withdrawals.tsx
  | 'PayoutMethods' // payout-methods.tsx
  | 'FeeHistory' // fee-history.tsx
  | 'Employees' // employees.tsx
  | 'Branches' // branches.tsx
  | 'SupplierLinks' // supplier-links.tsx
  | 'Notifications' // notifications.tsx
  | 'Analytics' // analytics.tsx
  | 'Verification' // verification.tsx
  | 'Security' // security.tsx
  | 'Settings'; // settings.tsx

interface NavItem {
  key: SupplierRoute;
  label: string;
}

const DRAWER_WIDTH = 264; // for mobile drawer
const SIDEBAR_WIDTH = 272; // for tablet/web persistent sidebar
const themeAwareShadow = (colors: any) => (colors.background === '#F4F7FB' ? 0.08 : 0.18);

// ─── Route → DB page.key map (for permission filtering) ───────────────────────
// NOTE: these key strings are a best guess based on your route names — swap in
// whatever `page.key` values actually exist in your permissions table.
const ROUTE_TO_PAGE_KEY: Partial<Record<SupplierRoute, string>> = {
  Dashboard: 'supplierDashboardPage',
  PurchaseOrders: 'supplierPurchaseOrderPage',
  Deliveries: 'supplierDeliveriesPage',
  OrderTimeline: 'supplierOrderTimelinePage',
  Products: 'supplierProductsPage',
  Categories: 'supplierCategoriesPage',
  Pricing: 'supplierPricingPage',
  Inventory: 'supplierInventoryPage',
  Wallet: 'supplierWalletPage',
  Transactions: 'supplierTransactionsPage',
  Withdrawals: 'supplierWithdrawalsPage',
  PayoutMethods: 'supplierPayoutMethodsPage',
  FeeHistory: 'supplierFeeHistoryPage',
  Employees: 'supplierEmployeesPage',
  Branches: 'supplierBranchesPage',
  SupplierLinks: 'supplierLinksPage',
  Notifications: 'supplierNotificationsPage',
  Analytics: 'supplierAnalyticsPage',
  Verification: 'verificationPage',
  Security: 'supplierSecurityPage',
  Settings: 'supplierSettingsPage',
};

const canViewSupplierRoute = (can: (pageKey: string, action: 'canView') => boolean, route: SupplierRoute) => {
  if (route === 'PurchaseOrders') {
    return can('supplierRFQPage', 'canView') || can('supplierPurchaseOrderPage', 'canView');
  }
  const pageKey = ROUTE_TO_PAGE_KEY[route];
  return Boolean(pageKey && can(pageKey, 'canView'));
};

// ─── URL path ↔ SupplierRoute maps ─────────────────────────────────────────────
// Expo Router strips the group segment "(supplier)" from the pathname, so
// usePathname() returns e.g. "/po-inbox", NOT "/(supplier)/po-inbox".
const PATH_TO_ROUTE: Record<string, SupplierRoute> = {
  '/': 'Dashboard',
  '/index': 'Dashboard',
  '/po-inbox': 'PurchaseOrders',
  '/deliveries': 'Deliveries',
  '/order-timeline': 'OrderTimeline',
  '/catalog': 'Products',
  '/categories': 'Categories',
  '/pricing': 'Pricing',
  '/inventory': 'Inventory',
  '/wallet': 'Wallet',
  '/transactions': 'Transactions',
  '/withdrawals': 'Withdrawals',
  '/payout-methods': 'PayoutMethods',
  '/fee-history': 'FeeHistory',
  '/employees': 'Employees',
  '/branches': 'Branches',
  '/supplier-links': 'SupplierLinks',
  '/notifications': 'Notifications',
  '/analytics': 'Analytics',
  '/verification': 'Verification',
  '/security': 'Security',
  '/settings': 'Settings',
};

const ROUTE_TO_PATH: Record<SupplierRoute, string> = {
  Dashboard: '/(supplier)',
  PurchaseOrders: '/(supplier)/po-inbox',
  Deliveries: '/(supplier)/deliveries',
  OrderTimeline: '/(supplier)/order-timeline',
  Products: '/(supplier)/catalog',
  Categories: '/(supplier)/categories',
  Pricing: '/(supplier)/pricing',
  Inventory: '/(supplier)/inventory',
  Wallet: '/(supplier)/wallet',
  Transactions: '/(supplier)/transactions',
  Withdrawals: '/(supplier)/withdrawals',
  PayoutMethods: '/(supplier)/payout-methods',
  FeeHistory: '/(supplier)/fee-history',
  Employees: '/(supplier)/employees',
  Branches: '/(supplier)/branches',
  SupplierLinks: '/(supplier)/supplier-links',
  Notifications: '/(supplier)/notifications',
  Analytics: '/(supplier)/analytics',
  Verification: '/(supplier)/verification',
  Security: '/(supplier)/security',
  Settings: '/(supplier)/settings',
};

// ─── Icon map ─────────────────────────────────────────────────────────────────
const NAV_ICON_MAP: Record<SupplierRoute, React.FC<{ size: number; color: string; strokeWidth?: number }>> = {
  Dashboard: LayoutDashboard,
  PurchaseOrders: ShoppingCart,
  Deliveries: Truck,
  OrderTimeline: Clock,
  Products: Package,
  Categories: TagIcon,
  Pricing: Tag,
  Inventory: Boxes,
  Wallet: Wallet,
  Transactions: Receipt,
  Withdrawals: Banknote,
  PayoutMethods: CreditCard,
  FeeHistory: History,
  Employees: Users,
  Branches: Building2,
  SupplierLinks: Link2,
  Notifications: Bell,
  Analytics: BarChart2,
  Verification: ShieldCheck,
  Security: Lock,
  Settings: Settings,
};

// ─── Nav structure ────────────────────────────────────────────────────────────
const PRIMARY_NAV: NavItem[] = [{ key: 'Dashboard', label: 'Dashboard' }];

const OPERATIONS_NAV: NavItem[] = [
  { key: 'PurchaseOrders', label: 'Purchase Orders' },
  { key: 'Deliveries', label: 'Deliveries' },
  { key: 'OrderTimeline', label: 'Order Timeline' },
];

const CATALOG_NAV: NavItem[] = [
  { key: 'Products', label: 'Products' },
  { key: 'Categories', label: 'Categories' },
  { key: 'Pricing', label: 'Pricing' },
  { key: 'Inventory', label: 'Inventory' },
];

const FINANCE_NAV: NavItem[] = [
  { key: 'Wallet', label: 'Wallet' },
  { key: 'Transactions', label: 'Transactions' },
  { key: 'Withdrawals', label: 'Withdrawals' },
  { key: 'PayoutMethods', label: 'Payout Methods' },
  { key: 'FeeHistory', label: 'Fee History' },
];

const ORGANIZATION_NAV: NavItem[] = [
  { key: 'Employees', label: 'Employees' },
  { key: 'Branches', label: 'Branches' },
  { key: 'SupplierLinks', label: 'Supplier Links' },
  { key: 'Notifications', label: 'Notifications' },
];

const ANALYTICS_NAV: NavItem[] = [
  { key: 'Analytics', label: 'Analytics' },
];

const ADMINISTRATION_NAV: NavItem[] = [
  { key: 'Verification', label: 'Verification' },
  { key: 'Security', label: 'Security' },
  { key: 'Settings', label: 'Settings' },
];

const ALL_NAV: NavItem[] = [
  ...PRIMARY_NAV,
  ...OPERATIONS_NAV,
  ...CATALOG_NAV,
  ...FINANCE_NAV,
  ...ORGANIZATION_NAV,
  ...ANALYTICS_NAV,
  ...ADMINISTRATION_NAV,
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (colors: any, isTablet: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.header,
      paddingHorizontal: isTablet ? 22 : 16,
      paddingVertical: isTablet ? 14 : 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
      elevation: 2,
      shadowColor: '#020617',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: themeAwareShadow(colors),
      shadowRadius: 18,
    },
    hamburger: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: colors.sidebarMuted,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 10,
    },
    headerTitle: {
      fontSize: isTablet ? 18 : 16,
      fontWeight: '800',
      color: colors.text,
    },
    headerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.accent,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 999,
    },
    headerBadgeTx: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    body: {
      flex: 1,
      flexDirection: isTablet ? 'row' : 'column',
      overflow: 'hidden',
    },
    sidebar: {
      width: SIDEBAR_WIDTH,
      backgroundColor: colors.sidebar,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingTop: 14,
      paddingHorizontal: 10,
      flexGrow: 0,
    },
    content: { flex: 1, overflow: 'hidden', backgroundColor: colors.background },
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
      backgroundColor: colors.sidebar,
      zIndex: 20,
      paddingTop: Platform.OS === 'ios' ? 48 : 24,
      paddingHorizontal: 10,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      shadowColor: '#020617',
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 12,
    },
    drawerHeader: {
      paddingHorizontal: 16,
      paddingBottom: 18,
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    drawerLogoIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    drawerLogo: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    drawerSubtitle: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 1,
      textTransform: 'uppercase',
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 13,
      marginBottom: 5,
      borderRadius: 14,
      gap: 11,
    },
    navItemActive: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
      elevation: 2,
    },
    navLabel: { fontSize: 14, fontWeight: '700', flex: 1 },
    navSectionLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
      marginTop: 10,
      marginBottom: 8,
      paddingHorizontal: 13,
      textTransform: 'uppercase',
    },
    navDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 10,
      marginHorizontal: 10,
    },
  });

// ─── Sidebar ──────────────────────────────────────────────────────────────────
interface SidebarProps {
  activeRoute: SupplierRoute;
  navigate: (route: SupplierRoute) => void;
  colors: any;
  styles: ReturnType<typeof makeStyles>;
}

const SidebarContent = memo(function SidebarContent({ activeRoute, navigate, colors, styles }: SidebarProps) {
  const { user } = useAuth();
  const { can } = usePermissions();

  if (!user) return null;

  const organizationName = user.org?.name || 'Right ERP';

  const canViewPage = (routeKey: SupplierRoute): boolean => {
    return canViewSupplierRoute(can, routeKey);
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = activeRoute === item.key;
    const Icon = NAV_ICON_MAP[item.key];

    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={() => navigate(item.key)}
        activeOpacity={0.75}
      >
        <Icon size={17} color={isActive ? '#fff' : colors.textSecondary} strokeWidth={isActive ? 2.6 : 2} />
        <Text style={[styles.navLabel, { color: isActive ? '#fff' : colors.text }]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  // Renders a section only if at least one item survives the permission filter,
  // so staff without access to a whole section don't see a dangling empty header.
  const renderSection = (label: string, items: NavItem[], withDivider = true) => {
    const visible = items.filter((item) => canViewPage(item.key));
    if (visible.length === 0) return null;
    return (
      <React.Fragment key={label}>
        {withDivider && <View style={styles.navDivider} />}
        <Text style={styles.navSectionLabel}>{label}</Text>
        {visible.map(renderNavItem)}
      </React.Fragment>
    );
  };

  return (
    <>
      <View style={styles.drawerHeader}>
        <View style={styles.drawerLogoIcon}>
          {user?.org?.profileImg ? (
            <Image source={{ uri: user?.org?.profileImg }} style={{ width: 36, height: 36, borderRadius: 10 }} resizeMode="cover" />
          ) : (
            <Building2 size={18} color="#fff" strokeWidth={2} />
          )}
        </View>
        <View>
          <Text style={styles.drawerLogo}>{organizationName}</Text>
          <Text style={styles.drawerSubtitle}>Enterprise Suite</Text>
        </View>
      </View>

      <Text style={styles.navSectionLabel}>Workspace</Text>
      {PRIMARY_NAV.filter((item) => canViewPage(item.key)).map(renderNavItem)}

      {renderSection('Operations', OPERATIONS_NAV)}
      {renderSection('Catalog', CATALOG_NAV)}
      {renderSection('Finance', FINANCE_NAV)}
      {renderSection('Organization', ORGANIZATION_NAV)}
      {renderSection('Analytics', ANALYTICS_NAV)}
      {renderSection('Administration', ADMINISTRATION_NAV)}
    </>
  );
});

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function ERPLayout({ children }: { children: React.ReactNode }) {
  const { colors, theme } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 1024;
  const router = useRouter();
  const pathname = usePathname();

  const { isAuthenticated, isLoading, user } = useAuth()
  const { can } = usePermissions();

  const { activeRole, roleLoaded } = useActiveRole()
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Auth / role guard — same behavior as before ────────────────────────────
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
      return
    }
    if (!isLoading && isAuthenticated && roleLoaded && activeRole !== 'SUPPLIER') {
      router.replace('/(erp)')
    }
  }, [isAuthenticated, isLoading, activeRole, roleLoaded, router])

  // Memoize styles — only recalculate when colors or isTablet changes
  const drawerAnim = useRef(new Animated.Value(0)).current;

  const styles = React.useMemo(() => makeStyles(colors, isTablet), [colors, isTablet]);

  // Keep Supplier Links highlighted while viewing a deep-linked relationship workspace.
  const activeRoute: SupplierRoute = pathname.startsWith('/supplier-links/') ? 'SupplierLinks' : (PATH_TO_ROUTE[pathname] ?? 'Dashboard');
  const routeAllowed = pathname === '/pending' || canViewSupplierRoute(can, activeRoute);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [drawerAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setDrawerOpen(false));
  }, [drawerAnim]);

  const navigate = useCallback(
    (route: SupplierRoute) => {
      const path = ROUTE_TO_PATH[route];
      if (path) router.push(path as any);
      if (!isTablet) closeDrawer();
    },
    [isTablet, closeDrawer, router],
  );

  const drawerTranslate = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_WIDTH, 0] });
  const overlayOpacity = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });

  const activeLabel = ALL_NAV.find((i) => i.key === activeRoute)?.label ?? 'Dashboard';
  const ActiveIcon = NAV_ICON_MAP[activeRoute];

  const sidebarProps: SidebarProps = { activeRoute, navigate, colors, styles };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.header} />

      <View style={styles.header}>
        {!isTablet && (
          <TouchableOpacity style={styles.hamburger} onPress={openDrawer} activeOpacity={0.7}>
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
        {isTablet && (
          <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
            <SidebarContent {...sidebarProps} />
          </ScrollView>
        )}

        {/* Render whatever Expo Router's <Stack> resolved, not an internal SCREEN_MAP */}
        <View style={styles.content}>
          {isLoading || !roleLoaded ? (
            <View style={{ padding: 24, gap: 12 }}>
              <SkeletonBox style={{ height: 40, width: '35%' }} />
              <SkeletonBox style={{ height: 180, width: '100%' }} />
            </View>
          ) : isAuthenticated && activeRole === 'SUPPLIER' && routeAllowed ? (
            <Slot />
          ) : isAuthenticated && activeRole === 'SUPPLIER' ? (
            <PermissionDenied />
          ) : null}
        </View>

        {!isTablet && drawerOpen && (
          <>
            <Animated.View style={[styles.drawerOverlay, { opacity: overlayOpacity }]} pointerEvents="auto">
              <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
            </Animated.View>
            <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerTranslate }] }]}>
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
