import React from 'react'
import { View, Text } from 'react-native'

const formatPHP = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

export function InventoryValueBadge({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const isSmall = size === 'sm'
  return (
    <View style={{ backgroundColor: '#0EA5E918', paddingHorizontal: isSmall ? 8 : 10, paddingVertical: isSmall ? 3 : 4, borderRadius: 8, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: isSmall ? 11 : 12, fontWeight: '700', color: '#0EA5E9' }}>{formatPHP(value)}</Text>
    </View>
  )
}