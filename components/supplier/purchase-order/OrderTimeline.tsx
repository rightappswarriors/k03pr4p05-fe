import React from 'react'
import { View, Text } from 'react-native'
import { Check } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { PurchaseOrder } from '@/services/supplierService/supplierService'

// NOTE: only 4 real milestones exist in the schema today (Created → Accepted →
// In Transit → Delivered). The spec's "Preparing" / "Ready" steps would need
// new POStatus/DeliveryStatus enum values — flagged as a backend TODO rather
// than faked here.
export function OrderTimeline({ po }: { po: PurchaseOrder }) {
  const { colors } = useTheme()

  const steps = [
    { key: 'created', label: 'Created', done: true, date: po.createdAt },
    { key: 'accepted', label: 'Accepted', done: po.status !== 'PENDING' && po.status !== 'REJECTED' && po.status !== 'CANCELLED', date: undefined },
    { key: 'in_transit', label: 'In Transit', done: po.status === 'IN_TRANSIT' || po.status === 'DELIVERED', date: po.delivery?.scheduledDate },
    { key: 'delivered', label: 'Delivered', done: po.status === 'DELIVERED', date: po.delivery?.deliveredAt ?? undefined },
  ]

  const isTerminalNegative = po.status === 'REJECTED' || po.status === 'CANCELLED'

  return (
    <View style={{ gap: 0 }}>
      {isTerminalNegative && (
        <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600', marginBottom: 10 }}>
          This order was {po.status === 'REJECTED' ? 'rejected' : 'cancelled'}.
        </Text>
      )}
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