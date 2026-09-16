import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { useTheme } from '@/contexts/ThemeContext'
import { reconcileRetailerMayaPayment, type MayaCheckoutResult } from '@/services/retailerOrderingService'

export default function MayaPaymentReturnScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId?: string; result?: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const [attempt, setAttempt] = useState<MayaCheckoutResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!transactionId) { setError('Payment reference is missing.'); return }
    reconcileRetailerMayaPayment(transactionId).then(setAttempt).catch((reason) => setError(reason?.message ?? 'Payment verification is unavailable.'))
  }, [transactionId])
  const title = attempt?.transactionStatus === 'SUCCEEDED' ? 'Payment Confirmed' : attempt?.canRetry ? 'Payment Not Completed' : 'Payment Verification Pending'
  return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}><View style={{ width: '100%', maxWidth: 520, padding: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', gap: 12 }}>
    {!attempt && !error ? <ActivityIndicator color={colors.primary} /> : null}
    <Text style={{ color: colors.text, fontSize: 23, fontWeight: '900', textAlign: 'center' }}>{error ? 'Unable to Verify Payment' : title}</Text>
    <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{error ?? (attempt?.transactionStatus === 'SUCCEEDED' ? 'Maya independently verified this payment.' : attempt?.canRetry ? 'No payment was confirmed. You may return to the PO and retry safely.' : 'The redirect did not mark the order paid. Kompra is waiting for authoritative Maya verification.')}</Text>
    <TouchableOpacity disabled={!attempt?.poId} onPress={() => router.replace(`/(erp)/supplier-links/orders/${attempt!.poId}` as never)} style={{ minHeight: 46, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primary }}><Text style={{ color: '#fff', fontWeight: '900' }}>Return to Purchase Order</Text></TouchableOpacity>
    <TouchableOpacity onPress={() => router.replace('/(erp)/purchase-orders' as never)} style={{ minHeight: 42, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '800' }}>View all Purchase Orders</Text></TouchableOpacity>
  </View></View>
}
