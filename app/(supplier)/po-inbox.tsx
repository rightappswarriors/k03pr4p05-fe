import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import POInboxScreen from '@/screens/supplier/POInboxScreen'
import { RFQDetailScreen } from '@/screens/supplier/RFQDetailScreen'
import PermissionDenied from '@/components/PermissionDenied'
import { usePermissions } from '@/hooks/usePermissions'

export default function POInboxRoute() {
  const { can, permissionsLoading } = usePermissions()
  const router = useRouter()
  const { purchaseOrderId, rfqId } = useLocalSearchParams<{ purchaseOrderId?: string; rfqId?: string }>()
  const canViewRfqs = can('supplierRFQPage', 'canView')
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null)

  useEffect(() => {
    const exactPoId = Array.isArray(purchaseOrderId) ? purchaseOrderId[0] : purchaseOrderId
    if (exactPoId?.trim()) router.replace({ pathname: '/(supplier)/po-inbox/[id]', params: { id: exactPoId.trim() } } as never)
  }, [purchaseOrderId, router])

  useEffect(() => {
    const exactRfqId = Array.isArray(rfqId) ? rfqId[0] : rfqId
    if (exactRfqId?.trim()) setSelectedRfqId(exactRfqId.trim())
  }, [rfqId])

  const handleRfqPress = (nextRfqId: string) => {
    const exactRfqId = nextRfqId.trim()
    if (exactRfqId) setSelectedRfqId(exactRfqId)
  }

  const handlePoPress = (poId: string) => {
    const exactPoId = poId.trim()
    if (exactPoId) router.push({ pathname: '/(supplier)/po-inbox/[id]', params: { id: exactPoId } } as never)
  }

  const handlePOCreated = (_poId: string, _poNumber: string) => {
    setSelectedRfqId(null)
    if (rfqId) router.replace('/(supplier)/po-inbox' as never)
  }

  if (permissionsLoading) return null

  if (selectedRfqId) {
    if (!canViewRfqs) return <PermissionDenied />
    return (
      <View style={{ flex: 1 }}>
        <RFQDetailScreen
          rfqId={selectedRfqId}
          onBack={() => {
            setSelectedRfqId(null)
            if (rfqId) router.replace('/(supplier)/po-inbox' as never)
          }}
          onPOCreated={handlePOCreated}
        />
      </View>
    )
  }

  return (
    <POInboxScreen
      onRfqPress={handleRfqPress}
      onPoPress={handlePoPress}
    />
  )
}
