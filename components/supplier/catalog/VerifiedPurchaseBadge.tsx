import React from 'react'
import { View, Text } from 'react-native'
import { ShieldCheck } from 'lucide-react-native'

export function VerifiedPurchaseBadge() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22C55E15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
      <ShieldCheck size={11} color="#22C55E" />
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#22C55E' }}>Verified Purchase</Text>
    </View>
  )
}