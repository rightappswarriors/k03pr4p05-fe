import React from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { Package, Clock, MessageCircle } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { RfqStatusBadge } from './RfqStatusBadge'
import type { SupplierRfqInboxItem, RfqStatus } from '@/types'

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

const getTimeAgo = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

interface Props {
  rfq: SupplierRfqInboxItem
  onPress: () => void
}

export function RfqCard({ rfq, onPress }: Props) {
  const { colors } = useTheme()

  const buyerName = rfq.agent?.fullname ?? 'Unknown Buyer'
  const buyerOrgName = rfq.agent?.organization?.name ?? `Organization #${rfq.agent?.organizationId ?? '?'}`
  const productName = rfq.supplierItem?.name ?? 'Unknown Product'
  const productImage = rfq.supplierItem?.image
  const qty = rfq.quantity ? Number(rfq.quantity) : 0
  const targetPrice = rfq.targetUnitPrice ?? 0
  const latestOffer = rfq.latestOffer
  const currentOffer = latestOffer?.unitPrice ?? null
  const hasUnread = (rfq.unreadCount ?? 0) > 0
  const lastMessage = rfq.latestMessage?.message ?? 'No messages yet'
  const lastMessageTime = rfq.latestMessage?.createdAt ? getTimeAgo(rfq.latestMessage.createdAt) : formatDate(rfq.createdAt)

  const isLastMessageFromBuyer = rfq.latestMessage?.senderOrgId === rfq.supplierOrgId
    ? false
    : rfq.latestMessage?.senderAgentId !== null

  const isOfferFromSupplier = latestOffer?.senderType === 'SUPPLIER'

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: hasUnread ? colors.primary : colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1,
      }}
    >
      {/* Header: RFQ number, status, unread badge */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>{rfq.rfqNumber}</Text>
          {hasUnread && (
            <View style={{
              backgroundColor: colors.primary,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              paddingHorizontal: 5,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>
                {rfq.unreadCount > 99 ? '99+' : rfq.unreadCount}
              </Text>
            </View>
          )}
        </View>
        <RfqStatusBadge status={rfq.status as RfqStatus} size="sm" />
      </View>

      {/* Buyer & Organization */}
      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{buyerName}</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{buyerOrgName}</Text>
      </View>

      {/* Product info */}
      <View
        style={{
          flexDirection: 'row',
          gap: 14,
          alignItems: 'center',
          backgroundColor: colors.background,
          borderRadius: 14,
          padding: 12,
        }}
      >
        {productImage ? (
          <Image source={{ uri: productImage }} style={{ width: 52, height: 52, borderRadius: 10 }} resizeMode="cover" />
        ) : (
          <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Package size={22} color={colors.textSecondary} />
          </View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>{productName}</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{qty} {rfq.supplierItem?.unit ?? 'pcs'}</Text>
            {rfq.supplierItem?.sku && (
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>• SKU: {rfq.supplierItem.sku}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Pricing info */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Target Price</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{formatPHP(targetPrice)}</Text>
        </View>
        {currentOffer !== null && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Your Offer</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: isOfferFromSupplier ? colors.primary : colors.textSecondary }}>
              {formatPHP(currentOffer)} {isOfferFromSupplier && '(countered)'}
            </Text>
          </View>
        )}
        {latestOffer?.quantity !== undefined && latestOffer?.quantity > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Offer Qty</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{latestOffer.quantity}</Text>
          </View>
        )}
      </View>

      {/* Last message / conversation preview */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          alignItems: 'flex-start',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 14,
        }}
      >
        <MessageCircle size={14} color={colors.textSecondary} style={{ marginTop: 1 }} />
        <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }} numberOfLines={2}>
          {hasUnread && isLastMessageFromBuyer ? (
            <>
              <Text style={{ fontWeight: '700', color: colors.text }}>New: </Text>
              {lastMessage}
            </>
          ) : (
            lastMessage
          )}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Clock size={10} color={colors.textSecondary} />
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>{lastMessageTime}</Text>
        </View>
      </View>

      {/* Footer: created date */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          Created {formatDate(rfq.createdAt)}
        </Text>
        {isLastMessageFromBuyer && !hasUnread && (
          <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>Read</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}