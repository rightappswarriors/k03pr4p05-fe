import React from 'react'
import { View, Text } from 'react-native'
import { Check, X } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { DeliveryItem } from '@/services/supplierService/deliveryService'

export function DeliveryTimeline({ delivery }: { delivery: DeliveryItem }) {
  const { colors } = useTheme()

  if (delivery.status === 'FAILED') {
    return (
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}>
          <X size={12} color="#fff" />
        </View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>Delivery failed</Text>
      </View>
    )
  }

  const steps = [
    { key: 'scheduled', label: 'Scheduled', done: true, date: delivery.scheduledDate },
    { key: 'in_transit', label: 'In Transit', done: delivery.status === 'IN_TRANSIT' || delivery.status === 'DELIVERED', date: undefined },
    { key: 'delivered', label: 'Delivered', done: delivery.status === 'DELIVERED', date: delivery.deliveredAt },
  ]

  return (
    <View>
      {steps.map((step, idx) => (
        <View key={step.key} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: step.done ? '#22C55E' : colors.surface,
                borderWidth: step.done ? 0 : 1.5, borderColor: colors.border,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {step.done && <Check size={12} color="#fff" />}
            </View>
            {idx < steps.length - 1 && (
              <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: step.done ? '#22C55E' : colors.border }} />
            )}
          </View>
          <View style={{ paddingBottom: 20, flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: step.done ? colors.text : colors.textSecondary }}>
              {step.label}
            </Text>
            {step.date && (
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                {new Date(step.date).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  )
}