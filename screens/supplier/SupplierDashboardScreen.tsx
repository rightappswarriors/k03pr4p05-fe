import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, useWindowDimensions } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { fetchSupplierDashboard, type SupplierDashboardStats } from '@/services/supplierService'
import RoleSwitcher from '@/components/RoleSwitcher'

const BREAKPOINTS = { tablet: 768, desktop: 1100 }

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

function KpiCard({
  label,
  value,
  color,
  icon,
  widthPct,
}: {
  label: string
  value: string | number
  color: string
  icon: string
  widthPct: string
}) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        width: widthPct,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: color,
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{label}</Text>
    </View>
  )
}

export default function SupplierDashboardScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { width } = useWindowDimensions()
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SupplierDashboardStats>({ newPOs: 0, pendingDeliveries: 0, fulfilledToday: 0, duePayments: 0 })

  const isTablet = width >= BREAKPOINTS.tablet
  const isDesktop = width >= BREAKPOINTS.desktop

  // Mobile: cards stack/wrap naturally. Tablet+: force a clean 2x2 grid.
  const cardWidthPct = isTablet ? '48.5%' : '100%'
  const gap = isTablet ? 16 : 12
  const horizontalPadding = isDesktop ? 32 : isTablet ? 24 : 16
  const contentMaxWidth = isDesktop ? 960 : undefined

  const load = async () => {
    if (!user?.orgId) return
    try {
      const data = await fetchSupplierDashboard(user.orgId)
      setStats(data)
    } catch (e) {
      if (__DEV__) console.error('supplierDashboard error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.orgId])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: horizontalPadding,
        paddingVertical: isTablet ? 24 : 16,
        gap: isTablet ? 20 : 16,
        width: '100%',
        maxWidth: contentMaxWidth,
        alignSelf: 'center',
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={{ gap: 4, marginBottom: 4 }}>
        <Text style={{ fontSize: isDesktop ? 28 : 22, fontWeight: '800', color: colors.text }}>Supplier Dashboard</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Overview of your supplier operations</Text>
      </View>

      <RoleSwitcher />

      {loading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={{ width: cardWidthPct, height: 90, backgroundColor: colors.surface, borderRadius: 12, opacity: 0.4 }} />
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
          <KpiCard label="New Purchase Orders" value={stats.newPOs} color="#3B82F6" icon="📋" widthPct={cardWidthPct} />
          <KpiCard label="Pending Deliveries" value={stats.pendingDeliveries} color="#F59E0B" icon="🚚" widthPct={cardWidthPct} />
          <KpiCard label="Fulfilled Today" value={stats.fulfilledToday} color="#22C55E" icon="✅" widthPct={cardWidthPct} />
          <KpiCard label="Due Payments" value={formatPHP(stats.duePayments)} color="#EF4444" icon="₱" widthPct={cardWidthPct} />
        </View>
      )}

      {!loading && stats.newPOs === 0 && stats.pendingDeliveries === 0 && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 20, alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Text style={{ fontSize: 32 }}>📦</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>No recent activity</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
            Purchase orders from your buyers will appear here once they start ordering.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}