import React, { useCallback, useState } from 'react';
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
  Menu,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  CircleDollarSign,
  BarChart2,
  Building2,
} from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';

import DashboardScreen from '@/screens/DashboardScreen';
import SalesScreen from '@/screens/SalesScreen';
import InventoryScreen from '@/screens/InventoryScreen';
import HRScreen from '@/screens/HRScreen';
import FinanceScreen from '@/screens/FinancesScreen';
import SalesAnalyticsScreen from '@/screens/SalaryAnalyticsScreen';
import ERPUnlockOverlay from './ErpunlockOverlay';

type ERPRoute = 'Dashboard' | 'Sales' | 'Inventory' | 'HR' | 'Finance' | 'SalesAnalytics';

// Lucide icon component map — avoids string-based icon lookups
const NAV_ICON_MAP: Record<ERPRoute, React.FC<{ size: number; color: string; strokeWidth?: number }>> = {
  Dashboard: LayoutDashboard,
  Sales: ShoppingCart,
  Inventory: Package,
  HR: Users,
  Finance: CircleDollarSign,
  SalesAnalytics: BarChart2,
};

const NAV_ITEMS: { key: ERPRoute; label: string }[] = [
  { key: 'Dashboard', label: 'Dashboard' },
  { key: 'Sales', label: 'Sales' },
  { key: 'Inventory', label: 'Inventory' },
  { key: 'HR', label: 'HR' },
  { key: 'Finance', label: 'Finance' },
  { key: 'SalesAnalytics', label: 'Sales Analytics' },
];

const DRAWER_WIDTH = 240;

export default function ERPLayout() {
  const { colors, theme } = useTheme();
  const [activeRoute, setActiveRoute] = useState<ERPRoute>('Dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const drawerAnim = useState(new Animated.Value(0))[0];

  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [drawerAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  }, [drawerAnim]);

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

  const renderScreen = () => {
    switch (activeRoute) {
      case 'Dashboard':       return <DashboardScreen />;
      case 'Sales':           return <SalesScreen />;
      case 'Inventory':       return <InventoryScreen />;
      case 'HR':              return <HRScreen />;
      case 'Finance':         return <FinanceScreen />;
      case 'SalesAnalytics':  return <SalesAnalyticsScreen />;
      default:                return <DashboardScreen />;
    }
  };

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 3,
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
    headerBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    body: {
      flex: 1,
      flexDirection: isTablet ? 'row' : 'column',
    },
    sidebarPersistent: {
      width: DRAWER_WIDTH,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingTop: 16,
    },
    content: {
      flex: 1,
    },
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
      paddingBottom: 20,
      marginBottom: 8,
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
      paddingVertical: 11,
      paddingHorizontal: 16,
      marginHorizontal: 8,
      marginBottom: 2,
      borderRadius: 8,
      gap: 12,
    },
    navItemActive: {
      backgroundColor: colors.primary,
    },
    navLabel: {
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.1,
    },
  });

  const SidebarContent = () => (
    <>
      <View style={styles.drawerHeader}>
        <View style={styles.drawerLogoIcon}>
          <Building2 size={18} color="#fff" strokeWidth={2} />
        </View>
        <View>
          <Text style={styles.drawerLogo}>Right ERP</Text>
          <Text style={styles.drawerSubtitle}>Enterprise Suite</Text>
        </View>
      </View>
      {NAV_ITEMS.map((item) => {
        const isActive = activeRoute === item.key;
        const IconComponent = NAV_ICON_MAP[item.key];
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, isActive && styles.navItemActive]}
            onPress={() => navigate(item.key)}
            activeOpacity={0.75}
          >
            <IconComponent
              size={18}
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

  const activeLabel = NAV_ITEMS.find((i) => i.key === activeRoute)?.label ?? 'ERP';
  const ActiveIcon = NAV_ICON_MAP[activeRoute];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />

      {/* ERP Unlock Overlay */}
      <ERPUnlockOverlay visible={!unlocked} onUnlock={() => setUnlocked(true)} />

      {/* Top Header */}
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
          <Text style={styles.headerBadgeText}>ERP</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Persistent Sidebar (tablet/desktop) */}
        {isTablet && (
          <ScrollView style={styles.sidebarPersistent} showsVerticalScrollIndicator={false}>
            <SidebarContent />
          </ScrollView>
        )}

        {/* Main Content */}
        <View style={styles.content}>{renderScreen()}</View>

        {/* Drawer Overlay (mobile) */}
        {!isTablet && drawerOpen && (
          <>
            <Animated.View
              style={[styles.drawerOverlay, { opacity: overlayOpacity }]}
              pointerEvents="auto"
            >
              <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
            </Animated.View>
            <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerTranslate }] }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <SidebarContent />
              </ScrollView>
            </Animated.View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}