import { Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import PermissionDenied from '@/components/PermissionDenied'
import { usePermissions } from '@/hooks/usePermissions'
import PODetailScreen from '@/screens/supplier/PODetailScreen'
import { useTheme } from '@/contexts/ThemeContext'

const normalizePurchaseOrderId = (value?: string | string[]) => {
  const id = (Array.isArray(value) ? value[0] : value)?.trim()
  return id && /^[A-Za-z0-9_-]{10,128}$/.test(id) ? id : null
}

function PurchaseOrderUnavailable() {
  const { colors } = useTheme()
  const router = useRouter()
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, backgroundColor: colors.background }}>
    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Purchase order unavailable</Text>
    <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>This purchase order could not be found or you no longer have access to it.</Text>
    <TouchableOpacity accessibilityLabel="Back to Purchase Orders" onPress={() => router.replace('/(supplier)/po-inbox' as never)} style={{ marginTop: 8, minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '800' }}>Back to Purchase Orders</Text></TouchableOpacity>
  </View>
}

export default function SupplierPurchaseOrderDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const router = useRouter()
  const { can, permissionsLoading } = usePermissions()
  const purchaseOrderId = normalizePurchaseOrderId(id)

  if (permissionsLoading) return null
  if (!can('supplierPurchaseOrderPage', 'canView')) return <PermissionDenied />
  if (!purchaseOrderId) return <PurchaseOrderUnavailable />
  return <PODetailScreen poId={purchaseOrderId} onBack={() => router.canGoBack() ? router.back() : router.replace('/(supplier)/po-inbox' as never)} />
}
