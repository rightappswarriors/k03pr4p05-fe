// app/(supplier)/_layout.tsx
// Supplier shell rebuilt to match the ERPLayout pattern:
//   - Tablet/desktop: persistent left sidebar
//   - Mobile: animated slide-in drawer + hamburger
//   - StyleSheet built once outside the component
//   - Sidebar extracted as a memoized component (no remount on every tap)
//   - Routing still goes through expo-router (Slot), nav items just call router.push

import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { Slot, router, usePathname } from 'expo-router'
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Truck,
  BarChart3,
  Settings,
  Menu,
  Building2,
} from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveRole } from '@/contexts/ActiveRoleContext'

// ─── Types ────────────────────────────────────────────────────────────────────

type SupplierRoute =
  | 'index'
  | 'po-inbox'
  | 'catalog'
  | 'deliveries'
  | 'analytics'
  | 'settings'

const DRAWER_WIDTH = 240 // mobile slide-in drawer
const SIDEBAR_WIDTH = 240 // tablet/desktop persistent sidebar

// ─── Nav structure — outside component, stable reference ──────────────────────

interface NavItem {
  key: SupplierRoute
  label: string
  icon: React.FC<{ size: number; color: string; strokeWidth?: number }>
}

const SUPPLIER_NAV: NavItem[] = [
  { key: 'index', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'po-inbox', label: 'PO Inbox', icon: ClipboardList },
  { key: 'catalog', label: 'Catalog', icon: Package },
  { key: 'deliveries', label: 'Deliveries', icon: Truck },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
]

// Maps a pathname's last segment back to a SupplierRoute key for highlighting.
function routeKeyFromPathname(pathname: string): SupplierRoute {
  const last = pathname.split('/').filter(Boolean).pop()
  const match = SUPPLIER_NAV.find((n) => n.key === last)
  return match ? match.key : 'index'
}

// ─── StyleSheet outside the component (built once per colors/isTablet pair) ──

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
      flexGrow: 0,
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
  })

// ─── Sidebar content — extracted + memoized ───────────────────────────────────
// Defining this inline inside the layout would create a new function identity
// on every render and remount the whole nav tree on each tap. memo + extract
// keeps it stable.

interface SidebarProps {
  activeKey: SupplierRoute
  navigate: (route: SupplierRoute) => void
  colors: any
  styles: ReturnType<typeof makeStyles>
  organizationName: string
  orgImageUri?: string | null
}

const SidebarContent = memo(function SidebarContent({
  activeKey,
  navigate,
  colors,
  styles,
  organizationName,
}: SidebarProps) {
  return (
    <>
      <View style={styles.drawerHeader}>
        <View style={styles.drawerLogoIcon}>
          <Building2 size={18} color="#fff" strokeWidth={2} />
        </View>
        <View>
          <Text style={styles.drawerLogo}>{organizationName}</Text>
          <Text style={styles.drawerSubtitle}>Supplier Portal</Text>
        </View>
      </View>

      {SUPPLIER_NAV.map((item) => {
        const isActive = activeKey === item.key
        const Icon = item.icon
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
        )
      })}
    </>
  )
})

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function SupplierTabLayout() {
  const { colors, theme } = useTheme()
  const { width } = useWindowDimensions()
  const isTablet = width >= 768

  const { isAuthenticated, isLoading, user } = useAuth()
  const { activeRole } = useActiveRole()
  const pathname = usePathname()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerAnim = useRef(new Animated.Value(0)).current

  // ── Auth / role guard — same behavior as before ────────────────────────────
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
      return
    }
    if (!isLoading && isAuthenticated && activeRole !== 'SUPPLIER') {
      router.replace('/(erp)')
    }
  }, [isAuthenticated, isLoading, activeRole])

  // Memoize styles — only recalculate when colors or isTablet changes
  const styles = React.useMemo(
    () => makeStyles(colors, isTablet),
    [colors, isTablet],
  )

  const activeKey = routeKeyFromPathname(pathname)
  const activeItem = SUPPLIER_NAV.find((n) => n.key === activeKey) ?? SUPPLIER_NAV[0]
  const ActiveIcon = activeItem.icon

  // ── Drawer open/close ────────────────────────────────────────────────────────
  const openDrawer = useCallback(() => {
    setDrawerOpen(true)
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start()
  }, [drawerAnim])

  const closeDrawer = useCallback(() => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false))
  }, [drawerAnim])

  // ── Navigation ───────────────────────────────────────────────────────────────
  const navigate = useCallback(
    (route: SupplierRoute) => {
      router.push(route === 'index' ? '/' : `/${route}` as any)
      if (!isTablet) closeDrawer()
    },
    [isTablet, closeDrawer],
  )

  const drawerTranslate = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  })
  const overlayOpacity = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  })

  const organizationName = user?.org?.name || 'Supplier Portal'

  const sidebarProps: SidebarProps = {
    activeKey,
    navigate,
    colors,
    styles,
    organizationName,
  }

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
          <Text style={styles.headerTitle}>{activeItem.label}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Building2 size={12} color="#fff" strokeWidth={2} />
        </View>
      </View>

      <View style={styles.body}>
        {/* Tablet / desktop persistent sidebar */}
        {isTablet && (
          <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
            <SidebarContent {...sidebarProps} />
          </ScrollView>
        )}

        {/* Routed screen content (index, po-inbox, catalog, deliveries, analytics, settings) */}
        <View style={styles.content}>
          <Slot />
        </View>

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
  )
}