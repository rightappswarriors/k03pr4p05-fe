import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import PermissionDenied from '@/components/PermissionDenied'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from '@/contexts/ThemeContext'
import RetailerPurchaseOrderDetailScreen from '@/screens/retailer/RetailerPurchaseOrderDetailScreen'

export default function RetailPurchaseOrderDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const router = useRouter()
  const { colors } = useTheme()
  const { can, permissionsLoading } = usePermissions()
  const purchaseOrderId = (Array.isArray(id) ? id[0] : id)?.trim()

  if (permissionsLoading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>
  if (!can('supplierLinksPage', 'canView')) return <PermissionDenied />
  if (!purchaseOrderId || !/^[A-Za-z0-9_-]{10,128}$/.test(purchaseOrderId)) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, backgroundColor: colors.background }}><Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Purchase order unavailable</Text><Text style={{ color: colors.textSecondary, textAlign: 'center' }}>This purchase order could not be found or you no longer have access to it.</Text><TouchableOpacity accessibilityLabel="Back to Purchase Orders" onPress={() => router.replace('/(erp)/purchase-orders' as never)} style={{ marginTop: 8, minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '800' }}>Back to Purchase Orders</Text></TouchableOpacity></View>
  return <RetailerPurchaseOrderDetailScreen />
}
