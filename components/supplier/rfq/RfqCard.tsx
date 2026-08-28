import React from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { Package, Clock, MessageCircle, Shield, Calendar, CircleCheck as CircleCheckIcon, Circle as CircleOutlineIcon, Eye } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { RfqStatusBadge, RFQ_STATUS_COLORS, RFQ_OFFER_STATES, RFQ_ACCEPTED_STATES, RFQ_CLOSED_STATES } from './RfqStatusBadge'
import { ELIGIBLE_RFQ_STATUSES, isStatusInGroup } from '@/types'
import type { SupplierRfqInboxItem, RfqStatus } from '@/types'

const formatPHP = (amount: number | null | undefined) =>
  amount != null
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
    : '—'

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

/** Compute the VAT-inclusive grand total for a line item. */
function computeFinancials(unitPrice: number, qty: number, isVatExempt: boolean, vatRate: number) {
  const subtotal = unitPrice * qty
  const vatAmount = isVatExempt ? 0 : subtotal * vatRate
  const grandTotal = subtotal + vatAmount
  return { subtotal, vatAmount, grandTotal }
}

/** Determine the badge variant based on the offer/negotiation state. */
function getBadgeVariant(status: RfqStatus): 'filled' | 'outline' | 'subtle' {
  if (isStatusInGroup(status, RFQ_ACCEPTED_STATES)) return 'filled'
  if (isStatusInGroup(status, RFQ_CLOSED_STATES)) return 'subtle'
  if (isStatusInGroup(status, RFQ_OFFER_STATES)) return 'outline'
  return 'filled'
}

interface Props {
  rfq: SupplierRfqInboxItem
  onPress: () => void
  onRfqPress?: (rfqId: string) => void
  showEligibility?: boolean
  showCheckbox?: boolean
  isSelected?: boolean
  onToggleSelection?: () => void
  /** True when this RFQ is disabled for selection because it belongs to a different buyer. */
  isDisabledByBuyer?: boolean
  compact?: boolean 
}

export function RfqCard({ rfq, onPress, onRfqPress, showEligibility = true, showCheckbox = false, isSelected = false, onToggleSelection, isDisabledByBuyer = false, compact = false}: Props) {
  const { colors } = useTheme()

  const buyerName = rfq.agent?.fullname ?? 'Unknown Buyer'
  const buyerOrgName = rfq.agent?.organization?.name ?? `Organization #${rfq.agent?.organizationId ?? '?'}`
  const supplierOrgName = rfq.supplierOrg?.name ?? `Supplier #${rfq.supplierOrgId ?? '?'}`
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

  // Eligibility for PO creation
  const isEligible = showEligibility && isStatusInGroup(rfq.status, ELIGIBLE_RFQ_STATUSES)

  // VAT breakdown
  const isVatExempt = rfq.supplierItem?.isVatExempt ?? false
  const vatRate = rfq.supplierItem?.vatRate ?? 0.12
  const { subtotal, vatAmount, grandTotal } = computeFinancials(targetPrice, qty, isVatExempt, vatRate)

  // Valid-until date
  const validUntil = rfq.validityDays
    ? new Date(new Date(rfq.createdAt).getTime() + rfq.validityDays * 24 * 60 * 60 * 1000)
    : null
  const isExpired = validUntil ? new Date() > validUntil : false

  const badgeVariant = getBadgeVariant(rfq.status as RfqStatus)

  // ─── Compact grid card ───────────────────────────────────────────────
  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 10,
          gap: 8,
          borderWidth: 1,
          borderColor: hasUnread ? colors.primary : colors.border,
          opacity: isDisabledByBuyer ? 0.5 : 1,
        }}
      >
        {/* Top row: RFQ number + checkbox/unread */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '800', color: colors.text, flex: 1 }}>
            {rfq.rfqNumber}
          </Text>
          {showCheckbox ? (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onToggleSelection?.() }}
              disabled={!isEligible || isDisabledByBuyer}
              style={{
                width: 18, height: 18, borderRadius: 5,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: isEligible && !isDisabledByBuyer ? `${colors.primary}15` : `${colors.textSecondary}10`,
              }}
            >
              {isEligible && (isSelected
                ? <CircleCheckIcon size={12} color={colors.primary} />
                : <CircleOutlineIcon size={12} color={colors.textSecondary} />)}
            </TouchableOpacity>
          ) : hasUnread ? (
            <View style={{
              backgroundColor: colors.primary, minWidth: 16, height: 16, borderRadius: 8,
              paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>
                {rfq.unreadCount > 9 ? '9+' : rfq.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Product */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {productImage ? (
            <Image source={{ uri: productImage }} style={{ width: 30, height: 30, borderRadius: 8 }} resizeMode="cover" />
          ) : (
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
              <Package size={13} color={colors.textSecondary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
              {productName}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 10, color: colors.textSecondary }}>
              {qty} {rfq.supplierItem?.unit ?? 'pcs'}
            </Text>
          </View>
        </View>

        {/* Price */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
            {formatPHP(currentOffer ?? targetPrice)}
          </Text>
          {currentOffer !== null && (
            <Text style={{ fontSize: 9, color: colors.textSecondary }}>Target {formatPHP(targetPrice)}</Text>
          )}
        </View>

        {/* Status + time */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8,
        }}>
          <RfqStatusBadge status={rfq.status as RfqStatus} size="sm" variant={badgeVariant} showDot={false} />
          <Text style={{ fontSize: 9, color: colors.textSecondary }}>{lastMessageTime}</Text>
        </View>
      </TouchableOpacity>
    )
  }

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
        shadowOpacity: isDisabledByBuyer ? 0.03 : 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1,
        opacity: isDisabledByBuyer ? 0.5 : 1,
      }}
    >
      {/* Header: Checkbox / RFQ number, status badge, eligibility indicator */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          {showCheckbox && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation()
                onToggleSelection?.()
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isEligible && !isDisabledByBuyer ? `${colors.primary}10` : `${colors.textSecondary}10`,
                opacity: isEligible ? 1 : 0.4,
              }}
              disabled={!isEligible || isDisabledByBuyer}
            >
              {isEligible && (isSelected ? (
                <CircleCheckIcon size={16} color={colors.primary} />
              ) : (
                <CircleOutlineIcon size={16} color={colors.textSecondary} />
              ))}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation()
              onRfqPress?.(rfq.id)
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>{rfq.rfqNumber}</Text>
            {isDisabledByBuyer && (
              <Eye size={10} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
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
          {!showCheckbox && showEligibility && isEligible && (
            <Shield size={12} color={colors.primary} />
          )}
        </View>
        <RfqStatusBadge
          status={rfq.status as RfqStatus}
          size="sm"
          variant={badgeVariant}
          showDot={isStatusInGroup(rfq.status as RfqStatus, RFQ_OFFER_STATES)}
        />
      </View>

      {/* Buyer & Supplier organizations */}
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Buyer</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{buyerName}</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{buyerOrgName}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Supplier</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{supplierOrgName}</Text>
          </View>
        </View>
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

      {/* Pricing info with VAT breakdown */}
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

        {/* VAT Breakdown */}
        {qty > 0 && targetPrice > 0 && (
          <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Subtotal</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{formatPHP(subtotal)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                VAT {isVatExempt ? '(exempt)' : `(${vatRate * 100}%)`}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{formatPHP(vatAmount)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>Total</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{formatPHP(grandTotal)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Dates: Delivery & Valid Until */}
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {rfq.expectedDeliveryDate && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Calendar size={10} color={colors.textSecondary} />
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              Delivery: {formatDate(rfq.expectedDeliveryDate)}
            </Text>
          </View>
        )}
        {validUntil && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={10} color={isExpired ? '#EF4444' : colors.textSecondary} />
            <Text style={{ fontSize: 11, color: isExpired ? '#EF4444' : colors.textSecondary }}>
              Valid {isExpired ? 'Expired' : `until ${formatDate(validUntil.toISOString())}`}
            </Text>
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

      {/* Footer: created date + selection summary or eligibility status */}
      {showCheckbox ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            Created {formatDate(rfq.createdAt)}
          </Text>
          {isDisabledByBuyer && (
            <Text style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' }}>
              Different buyer — unavailable
            </Text>
          )}
          {!isDisabledByBuyer && (
            <Text style={{ fontSize: 11, color: isEligible ? colors.primary : colors.textSecondary, fontWeight: isEligible ? '600' : '400' }}>
              {isSelected ? 'Added to PO' : 'Add to PO'}
            </Text>
          )}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            Created {formatDate(rfq.createdAt)}
          </Text>
          {showEligibility && (
            <Text style={{ fontSize: 11, color: isEligible ? colors.primary : colors.textSecondary, fontWeight: isEligible ? '600' : '400' }}>
              {isEligible ? 'Eligible for PO' : 'Not eligible for PO'}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
}
