import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { fetchSupplierAnalytics, type SupplierAnalytics } from '@/services/supplierService'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

type Period = '7d' | '30d' | '90d'
const PERIODS: Array<{ label: string; value: Period }> = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
]

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, minWidth: 150, backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 6, borderTopWidth: 3, borderTopColor: color }}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{label}</Text>
    </View>
  )
}

export default function SupplierAnalyticsScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const [period, setPeriod] = useState<Period>('30d')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<SupplierAnalytics>({
    totalRevenue: 0,
    ordersFulfilled: 0,
    averageOrderValue: 0,
    topOutlets: [],
  })

  const load = async () => {
    if (!user?.orgId) return
    try {
      const data = await fetchSupplierAnalytics(user.orgId)
      setAnalytics(data)
    } catch (e) {
      console.error('fetchSupplierAnalytics error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.orgId, period])

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Analytics</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Supplier performance overview</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.value} onPress={() => setPeriod(p.value)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: period === p.value ? colors.primary : colors.surface, borderWidth: 1, borderColor: period === p.value ? colors.primary : colors.border }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: period === p.value ? '#fff' : colors.textSecondary }}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[0, 1, 2, 3].map(i => <View key={i} style={{ flex: 1, minWidth: 150, height: 90, backgroundColor: colors.surface, borderRadius: 12, opacity: 0.4 }} />)}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <StatCard icon="₱" label="Total Revenue" value={formatPHP(analytics.totalRevenue)} color="#22C55E" />
          <StatCard icon="📋" label="Orders Fulfilled" value={String(analytics.ordersFulfilled)} color="#3B82F6" />
          <StatCard icon="📊" label="Avg Order Value" value={formatPHP(analytics.averageOrderValue)} color="#8B5CF6" />
        </View>
      )}

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Top Outlets</Text>
        {loading ? (
          <View style={{ height: 60, opacity: 0.4, backgroundColor: colors.background, borderRadius: 8 }} />
        ) : analytics.topOutlets.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 24, gap: 8 }}>
            <Text style={{ fontSize: 28 }}>🏪</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>No fulfilled orders in this period yet.</Text>
          </View>
        ) : (
          analytics.topOutlets.map((outlet, idx) => (
            <View key={outlet.outletName}>
              {idx > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 10 }} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{idx + 1}. {outlet.outletName}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{outlet.orderCount} {outlet.orderCount === 1 ? 'order' : 'orders'}</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{formatPHP(outlet.totalAmount)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 28 }}>📈</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Revenue chart coming soon</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>Visual trend charts will be available once you have fulfilled orders.</Text>
      </View>
    </ScrollView>
  )
}
