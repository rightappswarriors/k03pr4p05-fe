import { useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'

export default function LegacyRetailPurchaseOrderRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const router = useRouter()
  useEffect(() => {
    const exactId = (Array.isArray(id) ? id[0] : id)?.trim()
    router.replace(exactId ? `/(erp)/supplier-links/orders/${exactId}` as never : '/(erp)/purchase-orders' as never)
  }, [id, router])
  return null
}
