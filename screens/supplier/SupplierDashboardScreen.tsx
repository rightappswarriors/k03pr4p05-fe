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
import Svg, { Circle, Defs, LinearGradient, Line as SvgLine, Path, Stop } from 'react-native-svg'
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Box,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Cloud,
  DollarSign,
  Moon,
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
import { SkeletonBox } from '@/components/LoadingSkeleton'

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

/** Maps a domain status string (PO / delivery status, any casing/underscores) to a semantic color. */
function getStatusColor(status: string | undefined, colors: any) {
  const s = (status ?? '').toUpperCase()
  if (['COMPLETED', 'DELIVERED', 'PAID', 'FULFILLED', 'SUCCESS'].includes(s)) return colors.success
  if (['ACCEPTED', 'SCHEDULED', 'CONFIRMED', 'IN_TRANSIT'].includes(s)) return '#2563EB'
  if (['PENDING', 'AWAITING_RESPONSE', 'IN_PROGRESS', 'PROCESSING', 'NEW'].includes(s)) return '#F59E0B'
  if (['CANCELLED', 'CANCELED', 'REJECTED', 'DECLINED', 'FAILED'].includes(s)) return colors.error
  return colors.textSecondary
}

function StatusBadge({ status }: { status: string }) {
  const { colors } = useTheme()
  const color = getStatusColor(status, colors)
  const label = status.replaceAll('_', ' ')
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        backgroundColor: withAlpha(color, '18'),
        borderRadius: 999,
        paddingVertical: 3,
        paddingHorizontal: 9,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 11, fontWeight: '800', color, textTransform: 'capitalize' }}>{label.toLowerCase()}</Text>
    </View>
  )
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

export function DashboardCard({
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

/**
 * Hero banner. Previously this rendered as two bare icon squares with no
 * backdrop — it now carries an actual illustration (skyline + moon + clouds)
 * so the card reads as designed rather than empty, plus a short supplier
 * note on wider screens to fill the space the way the reference layout does.
 */
function BusinessHero({
  organizationName,
  isDesktop,
}: {
  organizationName: string
  isDesktop: boolean
}) {
  const { colors } = useTheme()
  return (
    <DashboardCard
      style={{
        padding: 0,
        minHeight: isDesktop ? 176 : 138,
        overflow: 'hidden',
        backgroundColor: '#0B1220',
        borderColor: withAlpha(colors.primary, '30'),
      }}
    >
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: isDesktop ? 'center' : 'stretch',
          justifyContent: 'space-between',
          flex: 1,
        }}
      >
        <View style={{ flex: 1, gap: isDesktop ? 8 : 5, padding: isDesktop ? 26 : 20, zIndex: 3 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: 'rgba(226,232,240,0.75)' }}>Good evening,</Text>
          <Text style={{ fontSize: isDesktop ? 34 : 26, fontWeight: '900', color: '#FFFFFF' }}>{organizationName} 👋</Text>
          <Text style={{ fontSize: 14, color: 'rgba(226,232,240,0.75)' }}>Here's what's happening with your business today.</Text>
        </View>

        {/* Illustration: night skyline with moon, clouds, and delivery motif */}
        <View
          style={{
            width: isDesktop ? 420 : '100%',
            height: isDesktop ? '100%' : 96,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <View style={{ position: 'absolute', top: isDesktop ? 24 : 10, right: isDesktop ? 60 : 30, width: isDesktop ? 46 : 30, height: isDesktop ? 46 : 30, borderRadius: 999, backgroundColor: '#FDE68A', shadowColor: '#FDE68A', shadowOpacity: 0.9, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } }} />
          <View style={{ position: 'absolute', top: isDesktop ? 40 : 24, right: isDesktop ? 150 : 90, width: isDesktop ? 54 : 32, height: isDesktop ? 18 : 11, borderRadius: 999, backgroundColor: 'rgba(226,232,240,0.18)' }} />
          <View style={{ position: 'absolute', top: isDesktop ? 60 : 8, right: isDesktop ? 220 : 130, width: isDesktop ? 34 : 20, height: isDesktop ? 12 : 8, borderRadius: 999, backgroundColor: 'rgba(226,232,240,0.14)' }} />

          {/* rolling hills, back to front */}
          <View style={{ position: 'absolute', bottom: -30, left: -30, right: -40, height: isDesktop ? 130 : 70, borderRadius: 999, backgroundColor: withAlpha(colors.success, '22') }} />
          <View style={{ position: 'absolute', bottom: -46, left: -60, right: -10, height: isDesktop ? 110 : 60, borderRadius: 999, backgroundColor: withAlpha(colors.success, '30') }} />

          <View style={{ position: 'absolute', bottom: isDesktop ? 22 : 12, left: isDesktop ? 40 : 14, flexDirection: 'row', alignItems: 'flex-end', gap: 10, zIndex: 2 }}>
            <View
              style={{
                width: isDesktop ? 60 : 34,
                height: isDesktop ? 60 : 34,
                borderRadius: isDesktop ? 18 : 11,
                backgroundColor: withAlpha('#0EA5E9', '38'),
                borderWidth: 1,
                borderColor: withAlpha('#7DD3FC', '40'),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={isDesktop ? 28 : 17} color="#7DD3FC" strokeWidth={2.3} />
            </View>
            <View
              style={{
                width: isDesktop ? 76 : 44,
                height: isDesktop ? 60 : 34,
                borderRadius: isDesktop ? 18 : 11,
                backgroundColor: withAlpha('#2563EB', '42'),
                borderWidth: 1,
                borderColor: withAlpha('#93C5FD', '40'),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={isDesktop ? 28 : 17} color="#93C5FD" strokeWidth={2.3} />
            </View>
          </View>

          {isDesktop && (
            <View
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                width: 190,
                borderRadius: 14,
                backgroundColor: 'rgba(15,23,42,0.55)',
                borderWidth: 1,
                borderColor: 'rgba(226,232,240,0.14)',
                padding: 12,
                gap: 6,
                zIndex: 3,
              }}
            >
              <Text style={{ color: '#E2E8F0', fontSize: 12, fontStyle: 'italic', lineHeight: 17 }}>
                "Reliable suppliers build a stronger tomorrow."
              </Text>
              <Text style={{ color: 'rgba(226,232,240,0.6)', fontSize: 10, fontWeight: '700' }}>
                Thank you for being part of our marketplace.
              </Text>
            </View>
          )}
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

function WalletSection({ stats, onView }: { stats: SupplierDashboardStats; onView: () => void }) {
  const { colors } = useTheme()
  return (
    <DashboardCard style={{ gap: 18 }}>
      <SectionHeader title="Wallet Summary" subtitle="Balances and supplier payouts" actionLabel="View Wallet" onAction={onView} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 190, gap: 4 }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Available Balance</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text }}>{formatPHP(stats.walletBalance)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 190, gap: 4 }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Held Balance</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text }}>{formatPHP(stats.walletHeldBalance)}</Text>
        </View>
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
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Finance actions stay in Wallet</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>View wallet activity and withdrawal options in Finance.</Text>
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
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>No recent supplier activity.</Text>
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

/**
 * Real SVG line chart (two smoothed lines + gradient area fill + point
 * markers) instead of the previous vertical-bar approximation. Uses a fixed
 * viewBox so it scales to any container width without needing onLayout.
 */
function OrderActivityChart({ stats, periodLabel, onPeriodChange }: { stats: SupplierDashboardStats; periodLabel: string; onPeriodChange: () => void }) {
  const { colors } = useTheme()
  const points = stats.orderActivity
  const CHART_HEIGHT = 148
  const VIEW_W = 640
  const VIEW_H = 160
  const PAD_X = 6
  const PAD_TOP = 8
  const PAD_BOTTOM = 8
  const plotW = VIEW_W - PAD_X * 2
  const plotH = VIEW_H - PAD_TOP - PAD_BOTTOM

  const rawMax = Math.max(1, ...points.flatMap((p) => [p.orderCount, p.deliveryCount]))
  // Round the axis ceiling up to a friendlier number so the top tick isn't an odd value like 13.
  const magnitude = Math.pow(10, Math.max(0, Math.floor(Math.log10(rawMax)) ))
  const max = Math.ceil(rawMax / magnitude) * magnitude || rawMax
  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((f) => Math.round(max * f))
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0

  const coordsFor = (key: 'orderCount' | 'deliveryCount') =>
    points.map((p, i) => ({
      x: PAD_X + i * stepX,
      y: PAD_TOP + plotH - (p[key] / max) * plotH,
    }))

  const linePath = (coords: { x: number; y: number }[]) =>
    coords.length === 0 ? '' : coords.reduce((acc, c, i) => acc + `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)} `, '')

  const areaPath = (coords: { x: number; y: number }[]) => {
    if (coords.length === 0) return ''
    const base = PAD_TOP + plotH
    return `${linePath(coords)} L ${coords[coords.length - 1].x.toFixed(1)} ${base} L ${coords[0].x.toFixed(1)} ${base} Z`
  }

  const orderCoords = coordsFor('orderCount')
  const deliveryCoords = coordsFor('deliveryCount')
  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  return (
    <DashboardCard style={{ gap: 16 }}>
      <SectionHeader title="Order Activity" subtitle="Purchase orders and deliveries over time" actionLabel={periodLabel} onAction={onPeriodChange} />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 14 }}>
        <Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '700' }}>● Purchase Orders</Text>
        <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>● Deliveries</Text>
      </View>

      {points.length === 0 ? (
        <View style={{ height: 154, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>No activity in this period yet.</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Y-axis scale — without this the chart shape has no numeric meaning */}
          <View style={{ height: CHART_HEIGHT, width: 26, justifyContent: 'space-between', paddingVertical: 1 }}>
            {yTicks.map((t) => (
              <Text key={t} style={{ color: colors.textSecondary, fontSize: 10, textAlign: 'right' }}>
                {t}
              </Text>
            ))}
          </View>

          <View style={{ flex: 1 }}>
          <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#2563EB" stopOpacity={0.28} />
                <Stop offset="1" stopColor="#2563EB" stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id="deliveriesFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#F59E0B" stopOpacity={0.22} />
                <Stop offset="1" stopColor="#F59E0B" stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {gridLines.map((g) => {
              const y = PAD_TOP + plotH * g
              return (
                <SvgLine
                  key={g}
                  x1={PAD_X}
                  x2={VIEW_W - PAD_X}
                  y1={y}
                  y2={y}
                  stroke={colors.border}
                  strokeWidth={1}
                  strokeDasharray={g === 1 ? undefined : '3,4'}
                />
              )
            })}

            <Path d={areaPath(deliveryCoords)} fill="url(#deliveriesFill)" />
            <Path d={areaPath(orderCoords)} fill="url(#ordersFill)" />

            <Path d={linePath(deliveryCoords)} stroke="#F59E0B" strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            <Path d={linePath(orderCoords)} stroke="#2563EB" strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />

            {orderCoords.map((c, i) => (
              <Circle key={`o-${i}`} cx={c.x} cy={c.y} r={3.2} fill="#2563EB" stroke={colors.surface} strokeWidth={1.5} />
            ))}
            {deliveryCoords.map((c, i) => (
              <Circle key={`d-${i}`} cx={c.x} cy={c.y} r={3.2} fill="#F59E0B" stroke={colors.surface} strokeWidth={1.5} />
            ))}
          </Svg>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            {points.map((p, i) => (
              <Text
                key={p.period}
                numberOfLines={1}
                style={{
                  color: colors.textSecondary,
                  fontSize: 9,
                  flex: 1,
                  textAlign: i === 0 ? 'left' : i === points.length - 1 ? 'right' : 'center',
                }}
              >
                {p.period}
              </Text>
            ))}
          </View>
          </View>
        </View>
      )}
    </DashboardCard>
  )
}

/**
 * Catalog donut, now drawn as an actual segmented ring (active vs. inactive
 * share of the circumference) instead of a single flat-colored border.
 */
function CatalogStatusCard({ stats, onManage }: { stats: SupplierDashboardStats; onManage: () => void }) {
  const { colors } = useTheme()
  const total = stats.activeCatalogItemCount + stats.inactiveCatalogItemCount
  const rows = [
    { label: 'Active', count: stats.activeCatalogItemCount, color: colors.success },
    { label: 'Inactive', count: stats.inactiveCatalogItemCount, color: colors.textSecondary },
  ]

  const SIZE = 94
  const STROKE = 12
  const R = (SIZE - STROKE) / 2
  const CENTER = SIZE / 2
  const CIRC = 2 * Math.PI * R

  let offsetSoFar = 0
  const segments = rows
    .filter((r) => r.count > 0)
    .map((r) => {
      const fraction = total > 0 ? r.count / total : 0
      const length = fraction * CIRC
      const seg = { ...r, length, offset: offsetSoFar }
      offsetSoFar += length
      return seg
    })

  return (
    <DashboardCard style={{ gap: 16 }}>
      <SectionHeader title="Catalog Status" subtitle="Your product catalog at a glance" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <View style={{ width: SIZE, height: SIZE }}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Circle cx={CENTER} cy={CENTER} r={R} stroke={colors.border} strokeWidth={STROKE} fill="none" />
            {segments.length > 0 ? (
              segments.map((seg) => (
                <Circle
                  key={seg.label}
                  cx={CENTER}
                  cy={CENTER}
                  r={R}
                  stroke={seg.color}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeDasharray={`${seg.length} ${CIRC - seg.length}`}
                  strokeDashoffset={-seg.offset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${CENTER} ${CENTER})`}
                />
              ))
            ) : null}
          </Svg>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 24 }}>{total}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Items</Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 9 }}>
          {rows.map(({ label, count, color }) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
              </View>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{count}</Text>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity onPress={onManage} style={{ alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 13 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>Manage Catalog</Text>
      </TouchableOpacity>
    </DashboardCard>
  )
}

function RecentOrderList({ stats, onViewAll }: { stats: SupplierDashboardStats; onViewAll: () => void }) {
  const { colors } = useTheme()
  if (!stats.recentPurchaseOrders.length) {
    return (
      <EmptyStateCard
        icon={PackageOpen}
        title="No purchase orders yet."
        message="New purchase orders from buyers will appear here."
        actionLabel="Browse Opportunities"
        onAction={onViewAll}
      />
    )
  }
  return (
    <DashboardCard style={{ gap: 13 }}>
      <SectionHeader title="Recent Purchase Orders" subtitle="Your latest purchase orders" actionLabel="View All" onAction={onViewAll} />
      {stats.recentPurchaseOrders.map((order) => (
        <View key={order.id} style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 11, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{order.poNumber}</Text>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{formatPHP(order.totalAmount)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{order.buyerName}</Text>
            <StatusBadge status={order.status} />
          </View>
        </View>
      ))}
    </DashboardCard>
  )
}

function RecentDeliveryList({ stats, onViewAll }: { stats: SupplierDashboardStats; onViewAll: () => void }) {
  const { colors } = useTheme()
  if (!stats.recentDeliveries.length) {
    return (
      <EmptyStateCard
        icon={Truck}
        title="No deliveries yet."
        message="Delivery activity will appear here once you start fulfilling purchase orders."
        actionLabel="View Purchase Orders"
        onAction={onViewAll}
      />
    )
  }
  return (
    <DashboardCard style={{ gap: 13 }}>
      <SectionHeader title="Recent Deliveries" subtitle="Your latest delivery updates" actionLabel="View All" onAction={onViewAll} />
      {stats.recentDeliveries.map((delivery) => (
        <View key={delivery.id} style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 11, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{delivery.poNumber}</Text>
            <StatusBadge status={delivery.status} />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            {delivery.buyerName} · {new Date(delivery.scheduledDate).toLocaleDateString('en-PH')}
          </Text>
        </View>
      ))}
    </DashboardCard>
  )
}

function DashboardNotifications({ stats }: { stats: SupplierDashboardStats }) {
  const { colors } = useTheme()
  if (!stats.notifications.length) return <NotificationsPanel />
  return <DashboardCard style={{ gap: 13 }}><SectionHeader title="Notifications" subtitle="Recent supplier alerts" />{stats.notifications.map((notification) => <View key={notification.id} style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, gap: 2 }}><Text style={{ color: colors.text, fontWeight: notification.isRead ? '700' : '900', fontSize: 13 }}>{notification.title}</Text><Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 12 }}>{notification.message}</Text></View>)}</DashboardCard>
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
  totalRevenue: 0,
  purchaseOrderCount: 0,
  purchaseOrdersInProgress: 0,
  deliveryCount: 0,
  deliveriesInProgress: 0,
  activeCatalogItemCount: 0,
  inactiveCatalogItemCount: 0,
  orderActivity: [],
  recentPurchaseOrders: [],
  recentDeliveries: [],
  notifications: [],
}

export default function SupplierDashboardScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState<'30D' | '3M' | '6M' | '12M'>('6M')
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
    if (__DEV__) console.info('[DASH-2] auth user', { id: user?.id, orgId: user?.orgId, role: user?.role })
    if (!user?.orgId) {
      setLoading(false)
      return
    }
    try {
      setError(false)
      const data = await fetchSupplierDashboard(period)
      setStats(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [period, user?.orgId])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const cyclePeriod = () => setPeriod((current) => current === '30D' ? '3M' : current === '3M' ? '6M' : current === '6M' ? '12M' : '30D')
  const periodLabel = period === '30D' ? 'Last 30 Days' : period === '3M' ? 'Last 3 Months' : period === '6M' ? 'Last 6 Months' : 'Last 12 Months'

  const quickActions = useMemo(
    () => [
      { label: 'Manage Catalog', icon: Package, accent: '#0EA5E9', onPress: () => router.push('/catalog' as any) },
      { label: 'Purchase Orders', icon: ClipboardList, accent: '#2563EB', onPress: () => router.push('/po-inbox' as any) },
      { label: 'Deliveries', icon: Truck, accent: '#F59E0B', onPress: () => router.push('/deliveries' as any) },
      { label: 'Update Pricing', icon: DollarSign, accent: '#10B981', onPress: () => router.push('/pricing' as any) },
      { label: 'Browse Mandates', icon: Sparkles, accent: '#8B5CF6', onPress: () => router.push('/supplier/mandates' as any) },
    ],
    [router],
  )

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
        <BusinessHero organizationName={organizationName} isDesktop={isDesktop} />
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
              title="Total Revenue"
              value={formatPHP(stats.totalRevenue)}
              subtitle="Settled supplier earnings"
              accent={colors.success}
              icon={DollarSign}
              widthPct={kpiWidthPct}
            />
            <StatCard
              title="Purchase Orders"
              value={stats.purchaseOrderCount}
              subtitle={`${stats.newPOs} awaiting response`}
              accent="#2563EB"
              icon={ShoppingCart}
              widthPct={kpiWidthPct}
              onPress={() => router.push('/po-inbox' as any)}
            />
            <StatCard
              title="Deliveries"
              value={stats.deliveryCount}
              subtitle={`${stats.deliveriesInProgress} in progress`}
              accent="#F59E0B"
              icon={Truck}
              widthPct={kpiWidthPct}
              onPress={() => router.push('/deliveries' as any)}
            />
            <StatCard
              title="Catalog Items"
              value={stats.activeCatalogItemCount}
              subtitle="Active Items"
              accent="#0EA5E9"
              icon={Box}
              widthPct={kpiWidthPct}
              onPress={() => router.push('/catalog' as any)}
            />
          </View>
        )}
      </FadeInView>

      {error && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: withAlpha(colors.error, '45'), backgroundColor: withAlpha(colors.error, '10'), borderRadius: 14, padding: 12 }}><Bell size={18} color={colors.error} /><Text style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' }}>Some dashboard data couldn't be loaded.</Text><TouchableOpacity onPress={load} style={{ paddingVertical: 7, paddingHorizontal: 10, borderRadius: 9, backgroundColor: colors.surface }}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '900' }}>Retry</Text></TouchableOpacity></View>}

      <FadeInView delay={120}>
        {loading ? <SkeletonBox style={{ height: 250, width: '100%' }} /> : <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap }}><View style={{ flex: 2 }}><OrderActivityChart stats={stats} periodLabel={periodLabel} onPeriodChange={cyclePeriod} /></View><View style={{ flex: 1 }}><CatalogStatusCard stats={stats} onManage={() => router.push('/catalog' as any)} /></View></View>}
      </FadeInView>

      <FadeInView delay={160}>
        {loading ? <SkeletonBox style={{ height: 230, width: '100%' }} /> : <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap }}><View style={{ flex: 1 }}><RecentOrderList stats={stats} onViewAll={() => router.push('/po-inbox' as any)} /></View><View style={{ flex: 1 }}><RecentDeliveryList stats={stats} onViewAll={() => router.push('/deliveries' as any)} /></View></View>}
      </FadeInView>

      <FadeInView delay={200}>
        <View style={{ gap: 12 }}>
          <SectionHeader title="Quick Actions" subtitle="Jump to the supplier work you need" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
            {quickActions.map((action) => <QuickActionButton key={action.label} widthPct={utilityWidthPct} {...action} />)}
          </View>
        </View>
      </FadeInView>

      <FadeInView delay={240}>
        <WalletSection stats={stats} onView={() => router.push('/finance/wallet' as any)} />
      </FadeInView>

      <FadeInView delay={280}>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap }}>
          <View style={{ flex: 1 }}><DashboardNotifications stats={stats} /></View>
          <View style={{ flex: 1 }}><DashboardCard style={{ gap: 10 }}><SectionHeader title="Tips & Announcements" subtitle="Practical supplier guidance" /><Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>Keep your catalog updated</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Complete product and delivery details before dispatch to keep operations moving smoothly.</Text></DashboardCard></View>
        </View>
      </FadeInView>
    </ScrollView>
  )
}