import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  type DimensionValue,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Box,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  DollarSign,
  Package,
  PackageOpen,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { fetchSupplierDashboard, type SupplierDashboardStats } from '@/services/supplierService/supplierService'
import RoleSwitcher from '@/components/RoleSwitcher'

const BREAKPOINTS = { tablet: 768, desktop: 1100, wide: 1440 }
const CARD_RADIUS = 18

type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

export function getKpiColumns(width: number) {
  if (width >= BREAKPOINTS.desktop) return 4
  if (width >= BREAKPOINTS.tablet) return 2
  return 1
}

export function getUtilityColumns(width: number) {
  if (width >= BREAKPOINTS.wide) return 6
  if (width >= BREAKPOINTS.desktop) return 3
  if (width >= BREAKPOINTS.tablet) return 2
  return 1
}

export function getCardWidthPct(columns: number) {
  if (columns === 1) return '100%'
  return `${(100 / columns - 1.25).toFixed(2)}%`
}

function withAlpha(hex: string, alpha: string) {
  if (!hex?.startsWith('#') || hex.length !== 7) return hex
  return `${hex}${alpha}`
}

function FadeInView({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(10)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 360,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 360,
        delay,
        useNativeDriver: true,
      }),
    ]).start()
  }, [delay, opacity, translateY])

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>
}

function PressableScale({
  onPress,
  disabled,
  children,
  style,
}: {
  onPress?: () => void
  disabled?: boolean
  children: React.ReactNode
  style?: any
}) {
  const scale = useRef(new Animated.Value(1)).current

  const animate = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start()
  }

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animate(0.985)}
        onPressOut={() => animate(1)}
        style={{ flex: 1 }}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}

function DashboardCard({
  children,
  style,
}: {
  children: React.ReactNode
  style?: any
}) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: CARD_RADIUS,
          padding: 18,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.07,
          shadowRadius: 24,
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}) {
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 13, color: colors.textSecondary }}>{subtitle}</Text>}
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.75}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: withAlpha(colors.primary, '12'),
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>{actionLabel}</Text>
          <ArrowUpRight size={13} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>
  )
}

export function StatCard({
  title,
  value,
  subtitle,
  accent,
  icon: Icon,
  widthPct,
  onPress,
}: {
  title: string
  value: string | number
  subtitle?: string
  accent: string
  icon: IconComponent
  widthPct: string | number
  onPress?: () => void
}) {
  const { colors } = useTheme()

  const { width } = useWindowDimensions()

  const isTablet = width >= 768
  const isDesktop = width >= 1100

  const titleSize = isDesktop ? 13 : isTablet ? 12 : 11
  const valueSize = isDesktop ? 28 : isTablet ? 24 : 15
  const subtitleSize = isDesktop ? 12 : 11

  const iconBox = isDesktop ? 42 : isTablet ? 38 : 34
  const iconSize = isDesktop ? 21 : isTablet ? 19 : 17

  return (
    <PressableScale onPress={onPress} style={{ width: widthPct }}>
      <DashboardCard style={{ minHeight: 128, overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: accent,
          }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={{ fontSize: titleSize, fontWeight: '600', color: colors.textSecondary }}>{title}</Text>
            <Text style={{ fontSize: valueSize, fontWeight: '400', color: colors.text }}>{value}</Text>
            {subtitle && <Text style={{ fontSize: subtitleSize, fontWeight: '600', color: colors.textSecondary }}>{subtitle}</Text>}
          </View>
          <View
            style={{
              width: iconBox,
              height: iconBox,
              borderRadius: iconBox / 3,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: withAlpha(accent, '18'),
            }}
          >
            <Icon size={iconSize} color={accent} strokeWidth={2.4} />
          </View>
        </View>
      </DashboardCard>
    </PressableScale>
  )
}

export function SkeletonCard({ widthPct, height = 132 }: { widthPct: string; height?: number }) {
  const { colors } = useTheme()
  const opacity = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 780, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 780, useNativeDriver: true }),
      ]),
    ).start()
  }, [opacity])

  return (
    <Animated.View
      style={{
        width: widthPct as DimensionValue,
        height,
        opacity,
        backgroundColor: colors.surface,
        borderRadius: CARD_RADIUS,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
        gap: 14,
      }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.background }} />
      <View style={{ width: '54%', height: 18, borderRadius: 999, backgroundColor: colors.background }} />
      <View style={{ width: '78%', height: 12, borderRadius: 999, backgroundColor: colors.background }} />
    </Animated.View>
  )
}

function EmptyStateCard({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: IconComponent
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}) {
  const { colors } = useTheme()
  return (
    <DashboardCard style={{ alignItems: 'center', paddingVertical: 26, gap: 12 }}>
      <View
        style={{
          width: 76,
          height: 54,
          borderRadius: 18,
          backgroundColor: withAlpha(colors.primary, '10'),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Icon size={21} color={colors.primary} strokeWidth={2.3} />
        </View>
      </View>
      <View style={{ gap: 5, alignItems: 'center', maxWidth: 460 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'center' }}>{title}</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19, textAlign: 'center' }}>{message}</Text>
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          style={{
            marginTop: 2,
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>{actionLabel}</Text>
          <ChevronRight size={15} color="#FFFFFF" strokeWidth={2.6} />
        </TouchableOpacity>
      )}
    </DashboardCard>
  )
}

function WalletHero({
  organizationName,
  stats,
  loading,
  isDesktop,
}: {
  organizationName: string
  stats: SupplierDashboardStats
  loading: boolean
  isDesktop: boolean
}) {
  const { colors } = useTheme()
  return (
    <DashboardCard
      style={{
        padding: isDesktop ? 24 : 20,
        flexDirection: isDesktop ? 'row' : 'column',
        alignItems: isDesktop ? 'center' : 'stretch',
        justifyContent: 'space-between',
        gap: 22,
      }}
    >
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary }}>Welcome back,</Text>
        <Text style={{ fontSize: isDesktop ? 34 : 28, fontWeight: '900', color: colors.text }}>{organizationName}</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>Today's overview of your supplier business</Text>
      </View>

      <View
        style={{
          minWidth: isDesktop ? 330 : undefined,
          borderRadius: 18,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 18,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              backgroundColor: withAlpha(colors.success, '18'),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wallet size={19} color={colors.success} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textSecondary }}>Current Wallet Balance</Text>
            {loading ? (
              <View style={{ width: 160, height: 28, borderRadius: 999, backgroundColor: colors.surface, marginTop: 6 }} />
            ) : (
              <Text style={{ fontSize: 30, fontWeight: '900', color: colors.text }}>{formatPHP(stats.walletBalance)}</Text>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Held Balance</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{formatPHP(stats.walletHeldBalance)}</Text>
          </View>
          <TouchableOpacity
            disabled
            style={{
              opacity: 0.58,
              backgroundColor: colors.primary,
              borderRadius: 13,
              paddingVertical: 11,
              paddingHorizontal: 18,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>
    </DashboardCard>
  )
}

function QuickActionButton({
  label,
  icon: Icon,
  onPress,
  accent,
  widthPct,
}: {
  label: string
  icon: IconComponent
  onPress: () => void
  accent: string
  widthPct: string
}) {
  const { colors } = useTheme()
  return (
    <PressableScale onPress={onPress} style={{ width: widthPct }}>
      <DashboardCard style={{ padding: 14, minHeight: 78 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              backgroundColor: withAlpha(accent, '16'),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={19} color={accent} strokeWidth={2.4} />
          </View>
          <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '800' }}>{label}</Text>
          <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2.4} />
        </View>
      </DashboardCard>
    </PressableScale>
  )
}

function WalletSection({ stats }: { stats: SupplierDashboardStats }) {
  const { colors } = useTheme()
  return (
    <DashboardCard style={{ gap: 18 }}>
      <SectionHeader title="Wallet" subtitle="Balances and supplier payouts" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 190, gap: 4 }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Available Balance</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text }}>{formatPHP(stats.walletBalance)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 190, gap: 4 }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Held Balance</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text }}>{formatPHP(stats.walletHeldBalance)}</Text>
        </View>
        <TouchableOpacity
          disabled
          style={{
            opacity: 0.58,
            alignSelf: 'center',
            backgroundColor: colors.primary,
            borderRadius: 13,
            paddingVertical: 12,
            paddingHorizontal: 18,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>Withdraw</Text>
        </TouchableOpacity>
      </View>
      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <DollarSign size={19} color={colors.textSecondary} strokeWidth={2.3} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Recent payment summary</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Wallet credits and payout activity will appear here.</Text>
        </View>
      </View>
    </DashboardCard>
  )
}

function CatalogHealthCard({ count, onManage }: { count: number; onManage: () => void }) {
  const { colors } = useTheme()
  return (
    <DashboardCard style={{ gap: 16 }}>
      <SectionHeader title="Catalog Health" subtitle="Keep your sellable items ready for demand" />
      {count > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 17,
              backgroundColor: withAlpha('#0EA5E9', '18'),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box size={25} color="#0EA5E9" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, minWidth: 180 }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Active Items</Text>
            <Text style={{ fontSize: 32, fontWeight: '900', color: colors.text }}>{count}</Text>
          </View>
          <TouchableOpacity
            onPress={onManage}
            activeOpacity={0.8}
            style={{ backgroundColor: colors.primary, borderRadius: 13, paddingVertical: 11, paddingHorizontal: 16 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>Manage Catalog</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <EmptyStateCard
          icon={PackageOpen}
          title="Your catalog is empty."
          message="Add products to begin receiving purchase orders and mandate matches."
          actionLabel="Manage Catalog"
          onAction={onManage}
        />
      )}
    </DashboardCard>
  )
}

function ActivityTimeline() {
  const { colors } = useTheme()
  const items = ['Purchase orders', 'Deliveries', 'Wallet credits', 'Mandate offers', 'Catalog updates']
  return (
    <DashboardCard style={{ gap: 16 }}>
      <SectionHeader title="Activity Timeline" subtitle="No recent supplier activity" />
      <View style={{ gap: 12 }}>
        {items.map((item, index) => (
          <View key={item} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: index === 0 ? withAlpha(colors.primary, '16') : colors.background,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Clock3 size={14} color={index === 0 ? colors.primary : colors.textSecondary} strokeWidth={2.3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{item}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Future events will be tracked here.</Text>
            </View>
          </View>
        ))}
      </View>
    </DashboardCard>
  )
}

function AnalyticsPlaceholder() {
  const { colors } = useTheme()
  const metrics = ['Revenue', 'Orders', 'Fulfillment Rate', 'Average Order Value']
  return (
    <DashboardCard style={{ gap: 16 }}>
      <SectionHeader title="Analytics Preview" subtitle="Coming Soon" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {metrics.map((metric) => (
          <View
            key={metric}
            style={{
              flexGrow: 1,
              flexBasis: 160,
              borderRadius: 14,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 13,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{metric}</Text>
            <View style={{ height: 10, width: '70%', borderRadius: 999, backgroundColor: colors.border }} />
            <View style={{ height: 10, width: '44%', borderRadius: 999, backgroundColor: colors.border }} />
          </View>
        ))}
      </View>
    </DashboardCard>
  )
}

function NotificationsPanel() {
  return (
    <EmptyStateCard
      icon={Bell}
      title="No notifications"
      message="Supplier alerts, order updates, and payout messages will appear here."
    />
  )
}

const DEFAULT_STATS: SupplierDashboardStats = {
  newPOs: 0,
  pendingDeliveries: 0,
  fulfilledToday: 0,
  duePayments: 0,
  openMandatesCount: 0,
  myPendingMandateOffers: 0,
  myAcceptedMandateOffers: 0,
  catalogItemCount: 0,
  walletBalance: 0,
  walletHeldBalance: 0,
}

export default function SupplierDashboardScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SupplierDashboardStats>(DEFAULT_STATS)

  const kpiColumns = getKpiColumns(width)
  const utilityColumns = getUtilityColumns(width)
  const kpiWidthPct = getCardWidthPct(kpiColumns)
  const utilityWidthPct = getCardWidthPct(utilityColumns)
  const gap = width >= BREAKPOINTS.tablet ? 16 : 12
  const horizontalPadding = width >= BREAKPOINTS.desktop ? 32 : width >= BREAKPOINTS.tablet ? 24 : 16
  const contentMaxWidth = width >= BREAKPOINTS.desktop ? 1680 : undefined
  const isDesktop = width >= BREAKPOINTS.desktop
  const organizationName = user?.org?.name || user?.name || 'Supplier Portal'

  const load = useCallback(async () => {
    if (!user?.orgId) return
    try {
      const data = await fetchSupplierDashboard(user.orgId)
      setStats(data)
    } catch {
      // Keep the last successful dashboard snapshot visible if refresh fails.
    } finally {
      setLoading(false)
    }
  }, [user?.orgId])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const quickActions = useMemo(
    () => [
      { label: 'Browse Mandates', icon: Sparkles, accent: '#8B5CF6', onPress: () => router.push('/supplier/mandates' as any) },
      { label: 'Purchase Orders', icon: ClipboardList, accent: '#2563EB', onPress: () => router.push('/po-inbox' as any) },
      { label: 'Manage Catalog', icon: Package, accent: '#0EA5E9', onPress: () => router.push('/catalog' as any) },
      { label: 'Deliveries', icon: Truck, accent: '#F59E0B', onPress: () => router.push('/deliveries' as any) },
      { label: 'Analytics', icon: BarChart3, accent: '#10B981', onPress: () => router.push('/analytics' as any) },
      { label: 'Settings', icon: Settings, accent: '#64748B', onPress: () => router.push('/settings' as any) },
    ],
    [router],
  )

  const hasPurchaseOrderActivity =
    stats.newPOs > 0 || stats.pendingDeliveries > 0 || stats.fulfilledToday > 0 || stats.duePayments > 0
  const hasMandateActivity =
    stats.openMandatesCount > 0 || stats.myPendingMandateOffers > 0 || stats.myAcceptedMandateOffers > 0

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: horizontalPadding,
        paddingVertical: width >= BREAKPOINTS.tablet ? 26 : 18,
        gap: 24,
        width: '100%',
        maxWidth: contentMaxWidth,
        alignSelf: 'center',
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <FadeInView>
        <WalletHero organizationName={organizationName} stats={stats} loading={loading} isDesktop={isDesktop} />
      </FadeInView>

      <RoleSwitcher />

      <FadeInView delay={40}>
        {loading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} widthPct={kpiWidthPct} />)}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
            <StatCard
              title="Wallet"
              value={formatPHP(stats.walletBalance)}
              subtitle="Available"
              accent={colors.success}
              icon={Wallet}
              widthPct={kpiWidthPct}
            />
            <StatCard
              title="Purchase Orders"
              value={stats.newPOs}
              subtitle="Awaiting Response"
              accent="#2563EB"
              icon={ShoppingCart}
              widthPct={kpiWidthPct}
              onPress={() => router.push('/po-inbox' as any)}
            />
            <StatCard
              title="Open Mandates"
              value={stats.openMandatesCount}
              subtitle="Available Opportunities"
              accent="#8B5CF6"
              icon={Store}
              widthPct={kpiWidthPct}
              onPress={() => router.push('/supplier/mandates' as any)}
            />
            <StatCard
              title="Catalog"
              value={stats.catalogItemCount}
              subtitle="Active Items"
              accent="#0EA5E9"
              icon={Box}
              widthPct={kpiWidthPct}
              onPress={() => router.push('/catalog' as any)}
            />
          </View>
        )}
      </FadeInView>

      <FadeInView delay={80}>
        <View style={{ gap: 12 }}>
          <SectionHeader title="Quick Actions" subtitle="Move through common supplier workflows" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
            {quickActions.map((action) => (
              <QuickActionButton key={action.label} widthPct={utilityWidthPct} {...action} />
            ))}
          </View>
        </View>
      </FadeInView>

      <FadeInView delay={120}>
        <View style={{ gap: 12 }}>
          <SectionHeader
            title="Purchase Orders"
            subtitle="New orders, delivery work, and receivables"
            actionLabel="View POs"
            onAction={() => router.push('/po-inbox' as any)}
          />
          {loading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
              {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} widthPct={kpiWidthPct} height={124} />)}
            </View>
          ) : hasPurchaseOrderActivity ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
              <StatCard title="New Purchase Orders" value={stats.newPOs} subtitle="Awaiting response" accent="#2563EB" icon={ClipboardList} widthPct={kpiWidthPct} />
              <StatCard title="Pending Deliveries" value={stats.pendingDeliveries} subtitle="To schedule or fulfill" accent="#F59E0B" icon={Truck} widthPct={kpiWidthPct} />
              <StatCard title="Due Payments" value={formatPHP(stats.duePayments)} subtitle="Expected receivables" accent={colors.error} icon={DollarSign} widthPct={kpiWidthPct} />
              <StatCard title="Fulfilled Today" value={stats.fulfilledToday} subtitle="Completed orders" accent={colors.success} icon={CheckCircle2} widthPct={kpiWidthPct} />
            </View>
          ) : (
            <EmptyStateCard
              icon={PackageOpen}
              title="No purchase order activity"
              message="New purchase orders, pending deliveries, due payments, and fulfilled orders will appear here."
            />
          )}
        </View>
      </FadeInView>

      <FadeInView delay={160}>
        <View style={{ gap: 12 }}>
          <SectionHeader
            title="Mandate Marketplace"
            subtitle="Opportunities from active mandate demand"
            actionLabel="Browse"
            onAction={() => router.push('/supplier/mandates' as any)}
          />
          {loading ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
              {[0, 1, 2].map((i) => <SkeletonCard key={i} widthPct={utilityWidthPct} height={124} />)}
            </View>
          ) : hasMandateActivity ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
              <StatCard title="Open Mandates" value={stats.openMandatesCount} subtitle="Available opportunities" accent="#8B5CF6" icon={Store} widthPct={utilityWidthPct} />
              <StatCard title="Pending Offers" value={stats.myPendingMandateOffers} subtitle="Awaiting buyer decision" accent="#F59E0B" icon={Clock3} widthPct={utilityWidthPct} />
              <StatCard title="Accepted Offers" value={stats.myAcceptedMandateOffers} subtitle="Ready for next steps" accent={colors.success} icon={CheckCircle2} widthPct={utilityWidthPct} />
            </View>
          ) : (
            <EmptyStateCard
              icon={Store}
              title="No mandate activity yet"
              message="Open mandate requests matching your catalog will appear here once opportunities are available."
              actionLabel="Browse Mandates"
              onAction={() => router.push('/supplier/mandates' as any)}
            />
          )}
        </View>
      </FadeInView>

      <FadeInView delay={200}>
        <WalletSection stats={stats} />
      </FadeInView>

      <FadeInView delay={240}>
        <CatalogHealthCard count={stats.catalogItemCount} onManage={() => router.push('/catalog' as any)} />
      </FadeInView>

      <FadeInView delay={280}>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap }}>
          <View style={{ flex: 1 }}>
            <ActivityTimeline />
          </View>
          <View style={{ flex: 1 }}>
            <AnalyticsPlaceholder />
          </View>
        </View>
      </FadeInView>

      <FadeInView delay={320}>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap }}>
          <View style={{ flex: 1 }}>
            <DashboardCard style={{ gap: 14 }}>
              <SectionHeader title="Performance Signals" subtitle="A light preview of supplier momentum" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 15,
                    backgroundColor: withAlpha(colors.success, '16'),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUp size={21} color={colors.success} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>Coming Soon</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Revenue, order health, fulfillment, and average order value insights are being prepared.
                  </Text>
                </View>
              </View>
            </DashboardCard>
          </View>
          <View style={{ flex: 1 }}>
            <NotificationsPanel />
          </View>
        </View>
      </FadeInView>
    </ScrollView>
  )
}
