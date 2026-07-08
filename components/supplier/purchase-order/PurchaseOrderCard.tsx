import React, { useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, Pressable } from 'react-native'
import { Package, MapPin, Calendar, CheckCircle2, XCircle, Square, CheckSquare } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge, getOrderPriority } from './PriorityBadge'
import type { PurchaseOrder } from '@/services/supplierService/supplierService'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

interface Props {
  po: PurchaseOrder
  selected: boolean
  selectionMode: boolean
  onPress: () => void
  onToggleSelect: () => void
  onAccept: () => void
  onReject: () => void
}

export function PurchaseOrderCard({ po, selected, selectionMode, onPress, onToggleSelect, onAccept, onReject }: Props) {
  const { colors } = useTheme()
  const scale = useRef(new Animated.Value(1)).current
  const statusColor = { PENDING: '#F59E0B', ACCEPTED: '#3B82F6', REJECTED: '#EF4444', IN_TRANSIT: '#8B5CF6', DELIVERED: '#22C55E', CANCELLED: '#6B7280' }[po.status]
  const priority = getOrderPriority(po)
  const expectedDelivery = po.delivery?.scheduledDate ?? po.requestedDate

  const pressIn = () => Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, speed: 40 }).start()
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            gap: 12,
            borderLeftWidth: 4,
            borderLeftColor: statusColor,
            borderWidth: selected ? 1.5 : 0,
            borderColor: selected ? colors.primary : 'transparent',
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
              {selectionMode && (
                <TouchableOpacity onPress={onToggleSelect} style={{ paddingTop: 2 }}>
                  {selected
                    ? <CheckSquare size={20} color={colors.primary} />
                    : <Square size={20} color={colors.textSecondary} />}
                </TouchableOpacity>
              )}
              <View style={{ gap: 3, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{po.poNumber}</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{po.buyerOrg.name}</Text>
              </View>
            </View>
            <View style={{ gap: 6, alignItems: 'flex-end' }}>
              <StatusBadge status={po.status} />
              <PriorityBadge priority={priority} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Package size={13} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {po.lineItems.length} {po.lineItems.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Calendar size={13} color={colors.textSecondary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Created {formatDate(po.createdAt)}</Text>
            </View>
            {expectedDelivery && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Calendar size={13} color={colors.textSecondary} />
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Expected {formatDate(expectedDelivery)}</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
            <MapPin size={13} color={colors.textSecondary} style={{ marginTop: 1 }} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
              {po.outlet.address}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{formatPHP(po.totalAmount)}</Text>

            {po.status === 'PENDING' && !selectionMode ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={onReject}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#EF444415' }}
                >
                  <XCircle size={14} color="#EF4444" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onAccept}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#22C55E15' }}
                >
                  <CheckCircle2 size={14} color="#22C55E" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#22C55E' }}>Accept</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={onPress}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>View Details →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}