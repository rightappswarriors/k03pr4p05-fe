import React, { useCallback, useEffect, useState } from 'react'
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { RefreshCw } from 'lucide-react-native'
import { useRouter } from 'expo-router'

import { EmptyState } from '@/components/DataTable'
import { OrderCardSkeletonList } from '@/components/LoadingSkeleton'
import { Pagination } from '@/components/supplier/catalog/CatalogPagination'
import { DataRecordCard, ResponsiveDataView } from '@/components/ResponsiveDataView'
import { useTheme } from '@/contexts/ThemeContext'
import { getRetailerPurchaseOrders, type RetailerPurchaseOrder } from '@/services/retailerOrderingService'

const statuses = ['ALL', 'PENDING', 'SUPPLIER_ACCEPTED', 'PREPARING', 'READY_FOR_DISPATCH', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'REJECTED']
const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
const displayStatus = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function RetailerPurchaseOrdersScreen() {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const router = useRouter()
  const [items, setItems] = useState<RetailerPurchaseOrder[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const load = useCallback(async () => {
    try {
      const response = await getRetailerPurchaseOrders({ status: status === 'ALL' ? undefined : status, page, pageSize })
      setItems(response.items); setTotal(response.total)
    } catch (error: any) { Alert.alert('Unable to load Purchase Orders', error?.message ?? 'Please try again.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [page, pageSize, status])
  useEffect(() => { load() }, [load])
  const open = (po: RetailerPurchaseOrder) => router.push(`/(erp)/supplier-links/orders/${po.id}` as never)

  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: width >= 1024 ? 28 : 16, gap: 16, maxWidth: 1500, width: '100%', alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 27, fontWeight: '900' }}>Purchase Orders</Text><Text style={{ color: colors.textSecondary, marginTop: 4 }}>Track Supplier confirmation, payment, and fulfillment for your Retailer organization.</Text></View><TouchableOpacity accessibilityLabel="Refresh Purchase Orders" onPress={load} style={{ padding: 11, borderRadius: 10, backgroundColor: colors.sidebarMuted }}><RefreshCw size={18} color={colors.text} /></TouchableOpacity></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{statuses.map((candidate) => <TouchableOpacity key={candidate} onPress={() => { setPage(1); setStatus(candidate) }} style={{ paddingHorizontal: 11, paddingVertical: 8, borderRadius: 99, backgroundColor: status === candidate ? colors.primary : colors.sidebarMuted }}><Text style={{ color: status === candidate ? '#fff' : colors.textSecondary, fontWeight: '800', fontSize: 12 }}>{displayStatus(candidate)}</Text></TouchableOpacity>)}</ScrollView>
    {loading ? <OrderCardSkeletonList count={3} /> : <ResponsiveDataView
      items={items}
      columns={[{ label: 'PO', width: 1.2 }, { label: 'Supplier', width: 1.7 }, { label: 'Outlet', width: 1.4 }, { label: 'Order status', width: 1.2 }, { label: 'Payment', width: 1 }, { label: 'Total', width: 1 }]}
      keyExtractor={(po) => po.id}
      useCards={width < 768}
      onItemPress={open}
      renderCells={(po) => [<Text style={{ color: colors.primary, fontWeight: '900' }}>{po.poNumber}</Text>, <Text style={{ color: colors.text }}>{po.supplierOrg.name}</Text>, <Text style={{ color: colors.text }}>{po.outlet?.name ?? '—'}</Text>, <Text style={{ color: colors.text }}>{displayStatus(po.status)}</Text>, <Text style={{ color: po.paymentStatus === 'PAID' ? '#059669' : colors.textSecondary, fontWeight: '800' }}>{po.paymentStatus}</Text>, <Text style={{ color: colors.text, fontWeight: '900' }}>{money(po.totalAmount)}</Text>]}
      renderCard={(po) => <DataRecordCard title={po.poNumber} subtitle={po.supplierOrg.name} status={<Text style={{ color: po.paymentStatus === 'PAID' ? '#059669' : colors.textSecondary, fontWeight: '800', fontSize: 11 }}>{po.paymentStatus}</Text>} fields={[{ label: 'Order status', value: displayStatus(po.status) }, { label: 'Outlet', value: po.outlet?.name ?? 'Not available' }, { label: 'Total', value: money(po.totalAmount) }]} actionLabel="View Purchase Order" onPress={() => open(po)} />}
      emptyState={<EmptyState title="No Purchase Orders found." message="Approved Supplier products you order will appear here." />}
    />}
    {!loading ? <Pagination page={page} pageSize={pageSize} totalItems={total} pageSizeOptions={[20, 50, 100]} showSummary onPageChange={setPage} onPageSizeChange={(value) => { setPage(1); setPageSize(value) }} /> : null}
  </ScrollView>
}
