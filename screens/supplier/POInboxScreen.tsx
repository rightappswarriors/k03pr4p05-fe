import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, useWindowDimensions, Alert, StyleSheet, DimensionValue } from 'react-native'
import { RefreshCcw, Clock, CheckCircle2, XCircle, Package, Bell, Eye, FileText, Plus, ShieldCheck, CircleCheck as CircleCheckIcon, Circle as CircleOutlineIcon, ShoppingCart } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchSupplierRFQs,
  fetchPurchaseOrdersForSupplier,
} from '@/services/supplierService/supplierService'
import { SectionHeader } from '@/components/supplier/purchase-order/SectionHeader'
import { RfqCard } from '@/components/supplier/rfq/RfqCard'
import { CreateConsolidatedPoModal } from '@/components/supplier/rfq/CreateConsolidatedPoModal'
import { RfqFilters, type RfqDateFilter, applyRfqFilters } from '@/components/supplier/rfq/RfqFilters'
import { RfqStatusBadge, RFQ_STATUS_COLORS } from '@/components/supplier/rfq/RfqStatusBadge'
import { FadeInView } from '@/components/FadeInView'
import { SuccessModal } from '@/components/SuccessModal'
import {
  RFQ_PENDING_STATUSES,
  RFQ_NEGOTIATING_STATUSES,
  RFQ_ACCEPTED_STATUSES,
  RFQ_CLOSED_STATUSES,
  isStatusInGroup,
} from '@/types'
import type {
  RfqStatus,
  RfqStatusGroup,
  SupplierRfqInboxItem,
  PurchaseOrder,
  POStatus,
} from '@/types'
import { ELIGIBLE_RFQ_STATUSES } from '@/types'

const BREAKPOINTS = { tablet: 768, desktop: 1100 }

// ─── PO Status helpers ──────────────────────────────────────────────────────────

const PO_STATUS_COLORS: Record<POStatus, string> = {
  PENDING: '#F59E0B',
  ACCEPTED: '#10B981',
  REJECTED: '#EF4444',
  IN_TRANSIT: '#3B82F6',
  DELIVERED: '#06B6D4',
  CANCELLED: '#94A3B8',
}

const PO_STATUS_LABELS: Record<POStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const PO_STATUS_FILTERS: Array<{ key: POStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All POs' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

// ─── Layout helpers ─────────────────────────────────────────────────────────────

function getKpiColumns(width: number): number {
  if (width >= BREAKPOINTS.desktop) return 5
  if (width >= BREAKPOINTS.tablet) return 3
  if (width >= 420) return 2
  return 2
}

// ─── Formatting helpers (shared by table and card) ─────────────────────────────────

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

// ─── Stat Card ────────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  accent,
  icon: Icon,
  width,
}: {
  title: string
  value: number | string
  accent: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  width: DimensionValue
}) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        width,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
        gap: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1,
      }}
    >
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: accent }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{title}</Text>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: `${accent}1A`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} color={accent} />
        </View>
      </View>
      <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>{value}</Text>
    </View>
  )
}

// ─── Skeleton primitives ──────────────────────────────────────────────────────────

function SkeletonBlock({ width, height, radius = 8 }: { width: DimensionValue ; height: number; radius?: number }) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.border,
        opacity: 0.6,
      }}
    />
  )
}
function CompactStatCard({
  title,
  value,
  accent,
  icon: Icon,
  width,
}: {
  title: string
  value: number | string
  accent: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  width: DimensionValue
}) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        width,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          backgroundColor: `${accent}1A`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={13} color={accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 17 }}>
          {value}
        </Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  )
}
function SkeletonCompactStatCard({ width }: { width: DimensionValue }) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        width,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <SkeletonBlock width={26} height={26} radius={7} />
      <View style={{ flex: 1, gap: 4 }}>
        <SkeletonBlock width={28} height={14} radius={4} />
        <SkeletonBlock width={50} height={10} radius={4} />
      </View>
    </View>
  )
}

function SkeletonStatCard({ width }: { width: DimensionValue }) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        width,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
        gap: 16,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBlock width={70} height={12} radius={6} />
        <SkeletonBlock width={34} height={34} radius={10} />
      </View>
      <SkeletonBlock width={56} height={26} radius={6} />
    </View>
  )
}

function SkeletonRfqCard() {
  const { colors } = useTheme()
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 20,
        gap: 18,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBlock width={90} height={16} radius={6} />
        <SkeletonBlock width={72} height={22} radius={11} />
      </View>
      <View style={{ gap: 8 }}>
        <SkeletonBlock width="55%" height={13} radius={6} />
        <SkeletonBlock width="35%" height={11} radius={6} />
      </View>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <SkeletonBlock width={52} height={52} radius={12} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBlock width="70%" height={13} radius={6} />
          <SkeletonBlock width="40%" height={11} radius={6} />
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <SkeletonBlock width="100%" height={11} radius={6} />
        <SkeletonBlock width="80%" height={11} radius={6} />
      </View>
    </View>
  )
}

function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRfqCard key={i} />
      ))}
    </View>
  )
}

function SkeletonPoRow() {
  const { colors } = useTheme()
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 20,
    }}>
      <SkeletonBlock width="90%" height={14} radius={6} />
    </View>
  )
}

// ─── RFQ Desktop Table ───────────────────────────────────────────────────────────

const RFQ_TABLE_COLUMNS: Record<string, { width: number; grow: number }> = {
  Select: { width: 50, grow: 0 },
  RFQ: { width: 110, grow: 0.6 },
  Buyer: { width: 160, grow: 1.2 },
  Supplier: { width: 140, grow: 1 },
  Item: { width: 180, grow: 1.2 },
  Quantity: { width: 90, grow: 0.6 },
  'Target Price': { width: 130, grow: 0.9 },
  'Latest Offer': { width: 130, grow: 0.9 },
  'VAT/Non-VAT': { width: 100, grow: 0.7 },
  'Valid Until': { width: 130, grow: 1 },
  Status: { width: 150, grow: 0.8 },
  'Updated': { width: 120, grow: 0.7 },
  Action: { width: 80, grow: 0 },
}

function RfqDesktopTable({
  rfqs,
  onRfqPress,
  selectionMode = false,
  selectedRfqs = new Set<string>(),
  onToggleSelection,
  isDisabledByBuyer,
}: {
  rfqs: SupplierRfqInboxItem[]
  onRfqPress: (rfqId: string) => void
  selectionMode?: boolean
  selectedRfqs?: Set<string>
  onToggleSelection?: (rfq: SupplierRfqInboxItem) => void
  /** Returns true when an RFQ is disabled for selection because it belongs to a different buyer. */
  isDisabledByBuyer?: (rfq: SupplierRfqInboxItem) => boolean
}) {
  const { colors } = useTheme()

  return (
    <View style={{ flex: 1, width: '100%', backgroundColor: colors.background }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ minWidth: '100%' }}
      >
        <View style={{ width: '100%' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: colors.surface,
            paddingVertical: 14,
            paddingHorizontal: 20,
            gap: 12,
            minWidth: 1250,
            width: '100%',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            {(['Select', 'RFQ', 'Buyer', 'Supplier', 'Item', 'Quantity', 'Target Price', 'Latest Offer', 'VAT/Non-VAT', 'Valid Until', 'Status', 'Updated', 'Action'] as const).map((label, i) => {
              const col = RFQ_TABLE_COLUMNS[label]
              return (
                <View key={i} style={{ flexGrow: col.grow, flexShrink: 0, flexBasis: col.width, minWidth: col.width, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {label}
                  </Text>
                </View>
              )
            })}
          </View>

          {/* Body rows */}
          <View style={{ minWidth: 1250, width: '100%' }}>
            {rfqs.map((rfq, idx) => {
              const buyerName = rfq.agent?.fullname ?? 'Unknown Buyer'
              const supplierOrgName = rfq.supplierOrg?.name ?? `Supplier #${rfq.supplierOrgId}`
              const productName = rfq.supplierItem?.name ?? 'Unknown Product'
              const productSku = rfq.supplierItem?.sku
              const qty = rfq.quantity ? Number(rfq.quantity) : 0
              const targetPrice = rfq.targetUnitPrice
              const latestOffer = rfq.latestOffer
              const currentOffer = latestOffer?.unitPrice ?? null
              const isVatExempt = rfq.supplierItem?.isVatExempt ?? false
              const vatLabel = isVatExempt ? 'Non-VAT' : 'VAT'
              const validUntil = rfq.validityDays
                ? new Date(new Date(rfq.createdAt).getTime() + rfq.validityDays * 24 * 60 * 60 * 1000)
                : null
              const validUntilStr = validUntil ? formatDate(validUntil.toISOString()) : '—'
              const lastActivity = rfq.conversation?.updatedAt ?? rfq.latestMessage?.createdAt ?? rfq.updatedAt
              const lastActivityTime = lastActivity ? getTimeAgo(lastActivity) : '—'
              const hasUnread = (rfq.unreadCount ?? 0) > 0
              const isEligible = isStatusInGroup(rfq.status, ELIGIBLE_RFQ_STATUSES)
              const disabledByBuyer = isDisabledByBuyer ? isDisabledByBuyer(rfq) : false

              return (
                <TouchableOpacity
                  key={rfq.id}
                  onPress={() => {
                    if (selectionMode) {
                      // In selection mode: row click toggles selection
                      // (unless the RFQ is ineligible or disabled by buyer restriction)
                      if (isEligible && !disabledByBuyer) {
                        onToggleSelection?.(rfq)
                      }
                    } else {
                      // Not in selection mode: navigate to RFQ detail
                      onRfqPress(rfq.id)
                    }
                  }}
                  style={{
                    backgroundColor: idx % 2 === 0 ? colors.surface : colors.background,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    gap: 12,
                    alignItems: 'center',
                    minWidth: 1250,
                    width: '100%',
                    opacity: disabledByBuyer ? 0.5 : 1,
                  }}
                >
                  {/* Checkbox column */}
                  {selectionMode && (
                    <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Select.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Select.width, minWidth: RFQ_TABLE_COLUMNS.Select.width, alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation()
                          onToggleSelection?.(rfq)
                        }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 5,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isEligible && !disabledByBuyer
                            ? `${colors.primary}10`
                            : `${colors.textSecondary}10`,
                          opacity: isEligible ? 1 : 0.4,
                        }}
                        disabled={!isEligible || disabledByBuyer}
                      >
                        {isEligible && !disabledByBuyer && (selectedRfqs.has(rfq.id) ? (
                          <CircleCheckIcon size={14} color={colors.primary} />
                        ) : (
                          <CircleOutlineIcon size={14} color={colors.textSecondary} />
                        ))}
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.RFQ.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.RFQ.width, minWidth: RFQ_TABLE_COLUMNS.RFQ.width, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation()
                        onRfqPress(rfq.id)
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{rfq.rfqNumber}</Text>
                    </TouchableOpacity>
                    {hasUnread && (
                      <View style={{
                        backgroundColor: colors.primary,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>
                          {rfq.unreadCount > 99 ? '99+' : rfq.unreadCount}
                        </Text>
                      </View>
                    )}
                    {!selectionMode && isEligible && (
                      <ShieldCheck size={10} color={colors.primary} />
                    )}
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Buyer.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Buyer.width, minWidth: RFQ_TABLE_COLUMNS.Buyer.width, gap: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                      {buyerName}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                      {rfq.agent?.organization?.name ?? ''}
                    </Text>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Supplier.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Supplier.width, minWidth: RFQ_TABLE_COLUMNS.Supplier.width, gap: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                      {supplierOrgName}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                      Supplier
                    </Text>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Item.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Item.width, minWidth: RFQ_TABLE_COLUMNS.Item.width, gap: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                      {productName}
                    </Text>
                    {productSku && (
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>SKU: {productSku}</Text>
                    )}
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Quantity.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Quantity.width, minWidth: RFQ_TABLE_COLUMNS.Quantity.width }}>
                    <Text style={{ fontSize: 12, color: colors.text }}>
                      {qty > 0 ? `${qty} ${rfq.supplierItem?.unit ?? 'pcs'}` : '—'}
                    </Text>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS['Target Price'].grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS['Target Price'].width, minWidth: RFQ_TABLE_COLUMNS['Target Price'].width }}>
                    <Text style={{ fontSize: 12, color: colors.text }}>
                      {formatPHP(targetPrice)}
                    </Text>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS['Latest Offer'].grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS['Latest Offer'].width, minWidth: RFQ_TABLE_COLUMNS['Latest Offer'].width }}>
                    {currentOffer !== null && (
                      <Text style={{ fontSize: 12, fontWeight: '600', color: latestOffer?.senderType === 'SUPPLIER' ? colors.primary : colors.textSecondary }}>
                        {formatPHP(currentOffer)}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS['VAT/Non-VAT'].grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS['VAT/Non-VAT'].width, minWidth: RFQ_TABLE_COLUMNS['VAT/Non-VAT'].width }}>
                    <Text style={{ fontSize: 12, color: isVatExempt ? colors.textSecondary : colors.text }}>
                      {vatLabel}
                    </Text>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS['Valid Until'].grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS['Valid Until'].width, minWidth: RFQ_TABLE_COLUMNS['Valid Until'].width }}>
                    <Text style={{ fontSize: 12, color: colors.text }}>
                      {validUntilStr}
                    </Text>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Status.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Status.width, minWidth: RFQ_TABLE_COLUMNS.Status.width }}>
                    <RfqStatusBadge status={rfq.status as RfqStatus} size="sm" />
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Updated.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Updated.width, minWidth: RFQ_TABLE_COLUMNS.Updated.width }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {lastActivityTime}
                    </Text>
                  </View>

                  <View style={{ flexGrow: RFQ_TABLE_COLUMNS.Action.grow, flexShrink: 0, flexBasis: RFQ_TABLE_COLUMNS.Action.width, minWidth: RFQ_TABLE_COLUMNS.Action.width, alignItems: 'flex-end' }}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation()
                        onRfqPress(rfq.id)
                      }}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Eye size={15} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// ─── PO Desktop Table ─────────────────────────────────────────────────────────────

const PO_TABLE_COLUMNS: Record<string, { width: number; grow: number }> = {
  'PO Number': { width: 140, grow: 1 },
  Buyer: { width: 180, grow: 1.3 },
  RFQs: { width: 90, grow: 0.6 },
  Items: { width: 80, grow: 0.5 },
  Total: { width: 130, grow: 0.9 },
  Status: { width: 130, grow: 0.8 },
  Created: { width: 130, grow: 0.9 },
  Action: { width: 80, grow: 0 },
}

function PoDesktopTable({
  purchaseOrders,
  onPoPress,
}: {
  purchaseOrders: PurchaseOrder[]
  onPoPress: (po: PurchaseOrder) => void
}) {
  const { colors } = useTheme()

  return (
    <View style={{ flex: 1, width: '100%', backgroundColor: colors.background }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ minWidth: '100%' }}
      >
        <View style={{ width: '100%' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: colors.surface,
            paddingVertical: 14,
            paddingHorizontal: 20,
            gap: 12,
            minWidth: 920,
            width: '100%',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            {(['PO Number', 'Buyer', 'RFQs', 'Items', 'Total', 'Status', 'Created', 'Action'] as const).map((label, i) => {
              const col = PO_TABLE_COLUMNS[label]
              return (
                <View key={i} style={{ flexGrow: col.grow, flexShrink: 0, flexBasis: col.width, minWidth: col.width, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {label}
                  </Text>
                </View>
              )
            })}
          </View>

          {/* Body rows */}
          <View style={{ minWidth: 920, width: '100%' }}>
            {purchaseOrders.map((po, idx) => {
              const itemQty = po.lineItems?.length ?? 0
              const rfqCount = itemQty // Each line item corresponds to an RFQ in the current model
              return (
                <TouchableOpacity
                  key={po.id}
                  onPress={() => onPoPress(po)}
                  style={{
                    backgroundColor: idx % 2 === 0 ? colors.surface : colors.background,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    gap: 12,
                    alignItems: 'center',
                    minWidth: 920,
                    width: '100%',
                  }}
                >
                  <View style={{ flexGrow: PO_TABLE_COLUMNS['PO Number'].grow, flexShrink: 0, flexBasis: PO_TABLE_COLUMNS['PO Number'].width, minWidth: PO_TABLE_COLUMNS['PO Number'].width, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} color={colors.textSecondary} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{po.poNumber}</Text>
                  </View>

                  <View style={{ flexGrow: PO_TABLE_COLUMNS.Buyer.grow, flexShrink: 0, flexBasis: PO_TABLE_COLUMNS.Buyer.width, minWidth: PO_TABLE_COLUMNS.Buyer.width, gap: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                      {po.buyerOrg?.name ?? 'Unknown Buyer'}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                      {po.outlet?.name ?? ''}
                    </Text>
                  </View>

                  <View style={{ flexGrow: PO_TABLE_COLUMNS.RFQs.grow, flexShrink: 0, flexBasis: PO_TABLE_COLUMNS.RFQs.width, minWidth: PO_TABLE_COLUMNS.RFQs.width }}>
                    <Text style={{ fontSize: 12, color: colors.text }}>{rfqCount > 0 ? rfqCount : '—'}</Text>
                  </View>

                  <View style={{ flexGrow: PO_TABLE_COLUMNS.Items.grow, flexShrink: 0, flexBasis: PO_TABLE_COLUMNS.Items.width, minWidth: PO_TABLE_COLUMNS.Items.width }}>
                    <Text style={{ fontSize: 12, color: colors.text }}>{itemQty > 0 ? itemQty : '—'}</Text>
                  </View>

                  <View style={{ flexGrow: PO_TABLE_COLUMNS.Total.grow, flexShrink: 0, flexBasis: PO_TABLE_COLUMNS.Total.width, minWidth: PO_TABLE_COLUMNS.Total.width }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                      {formatPHP(po.totalAmount)}
                    </Text>
                  </View>

                  <View style={{ flexGrow: PO_TABLE_COLUMNS.Status.grow, flexShrink: 0, flexBasis: PO_TABLE_COLUMNS.Status.width, minWidth: PO_TABLE_COLUMNS.Status.width }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: `${PO_STATUS_COLORS[po.status] || '#94A3B8'}20`,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 20,
                      alignSelf: 'flex-start',
                    }}>
                      <View style={{
                        width: 6, height: 6, borderRadius: 3,
                        backgroundColor: PO_STATUS_COLORS[po.status] || '#94A3B8',
                      }} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: PO_STATUS_COLORS[po.status] || '#94A3B8' }}>
                        {PO_STATUS_LABELS[po.status] || po.status}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexGrow: PO_TABLE_COLUMNS.Created.grow, flexShrink: 0, flexBasis: PO_TABLE_COLUMNS.Created.width, minWidth: PO_TABLE_COLUMNS.Created.width }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {formatDate(po.createdAt)}
                    </Text>
                  </View>

                  <View style={{ flexGrow: PO_TABLE_COLUMNS.Action.grow, flexShrink: 0, flexBasis: PO_TABLE_COLUMNS.Action.width, minWidth: PO_TABLE_COLUMNS.Action.width, alignItems: 'flex-end' }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Eye size={15} color={colors.textSecondary} />
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// ─── PO Mobile Card ───────────────────────────────────────────────────────────────

function PoMobileCard({ po, onPress }: { po: PurchaseOrder; onPress: () => void }) {
  const { colors } = useTheme()
  const itemQty = po.lineItems?.length ?? 0

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 20,
        gap: 14,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FileText size={18} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 }}>{po.poNumber}</Text>
        </View>
        <View style={{
          backgroundColor: `${PO_STATUS_COLORS[po.status] || '#94A3B8'}20`,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 20,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: PO_STATUS_COLORS[po.status] || '#94A3B8' }}>
            {PO_STATUS_LABELS[po.status] || po.status}
          </Text>
        </View>
      </View>

      <View style={{ gap: 2 }}>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>Buyer</Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{po.buyerOrg?.name ?? 'Unknown'}</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{po.outlet?.name ?? ''}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Items</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{itemQty} items</Text>
        </View>
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>Total</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{formatPHP(po.totalAmount)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          Created {formatDate(po.createdAt)}
        </Text>
        <Eye size={15} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  )
}

// ─── Tab components ───────────────────────────────────────────────────────────────

type ActiveTab = 'RFQ' | 'PO'

function TabButton({
  label,
  isActive,
  onPress,
  count,
}: {
  label: string
  isActive: boolean
  onPress: () => void
  count?: number
}) {
  const { colors } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: isActive ? colors.primary : 'transparent',
        backgroundColor: 'transparent',
      }}
    >
      <Text style={{
        fontSize: 15,
        fontWeight: isActive ? '700' : '500',
        color: isActive ? colors.primary : colors.textSecondary,
      }}>
        {label}{count !== undefined && count > 0 ? ` (${count})` : ''}
      </Text>
    </TouchableOpacity>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────────

interface POInboxScreenProps {
  onRfqPress: (rfqId: string) => void
  onPoPress?: (poId: string) => void
}

export default function POInboxScreen({ onRfqPress, onPoPress }: POInboxScreenProps) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { width } = useWindowDimensions()

  const kpiColumns = getKpiColumns(width)
  const gap = width >= BREAKPOINTS.tablet ? 16 : 12
  const horizontalPadding = width >= BREAKPOINTS.desktop ? 20 : width >= BREAKPOINTS.tablet ? 16 : 12
  const contentMaxWidth = width >= BREAKPOINTS.desktop ? 1680 : undefined
  const kpiMinWidth = kpiColumns >= 5 ? 170 : kpiColumns >= 3 ? 200 : 150
  const gridColumns = width >= 900 ? 4 : width >= 600 ? 3 : 2
  const gridGap = 10
  const gridAvailableWidth = (contentMaxWidth ? Math.min(width, contentMaxWidth) : width) - horizontalPadding * 2
  const gridCardWidth = (gridAvailableWidth - gridGap * (gridColumns - 1)) / gridColumns
  const [activeTab, setActiveTab] = useState<ActiveTab>('RFQ')
  const [rfqs, setRfqs] = useState<SupplierRfqInboxItem[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [poLoading, setPoLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RfqStatusGroup>('ALL')
  const [dateFilter, setDateFilter] = useState<RfqDateFilter>('ALL')
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)

  const [poStatusFilter, setPoStatusFilter] = useState<POStatus | null>(null)

  // ─── Day 8: Selection mode for consolidated PO creation ───────────────────────────
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedRfqs, setSelectedRfqs] = useState<Set<string>>(new Set())
  const [createPoModalVisible, setCreatePoModalVisible] = useState(false)
  const [successModal, setSuccessModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const isDesktop = width >= BREAKPOINTS.desktop

  // ─── Fetch RFQs ────────────────────────────────────────────────────────────────

  const loadRfqs = useCallback(async () => {
    if (!user?.orgId) return

    let dateFrom: string | null = null
    let dateTo: string | null = null
    if (dateFilter === 'CUSTOM' && customRange) {
      dateFrom = customRange.start
      dateTo = customRange.end
    } else {
      const now = new Date()
      if (dateFilter === 'TODAY') {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
      } else if (dateFilter === 'WEEK') {
        const day = now.getDay()
        dateFrom = new Date(now.getTime() - day * 24 * 60 * 60 * 1000).toISOString()
        dateTo = new Date().toISOString()
      } else if (dateFilter === 'MONTH') {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        dateTo = new Date().toISOString()
      }
    }

    // Only send date range to the backend; all other filters (search, status,
    // unreadOnly, buyer) are applied client-side via `applyRfqFilters` so that
    // product-name search and combined filter logic work correctly. The backend
    // `search` parameter does not cover product/item names, so sending it there
    // would prematurely exclude RFQs that a client-side search would match.
    try {
      const data = await fetchSupplierRFQs(user.orgId, {
        status: null,
        statuses: null,
        search: null,
        unreadOnly: null,
        dateFrom: dateFrom,
        dateTo: dateTo,
      })
      setRfqs(data)
    } catch (e: any) {
      if (__DEV__) console.error('fetchSupplierRFQs error', e)
      Alert.alert('Error', e.message ?? 'Failed to load RFQs.')
    } finally {
      setLoading(false)
    }
  }, [user?.orgId, dateFilter, customRange])

  // ─── Fetch Purchase Orders ─────────────────────────────────────────────────────

  const loadPos = useCallback(async () => {
    if (!user?.orgId) return
    setPoLoading(true)
    try {
      const data = await fetchPurchaseOrdersForSupplier(user.orgId, poStatusFilter)
      setPurchaseOrders(data)
    } catch (e: any) {
      if (__DEV__) console.error('fetchPurchaseOrdersForSupplier error', e)
      Alert.alert('Error', e.message ?? 'Failed to load purchase orders.')
    } finally {
      setPoLoading(false)
    }
  }, [user?.orgId, poStatusFilter])

  useEffect(() => {
    loadRfqs()
  }, [loadRfqs])

  useEffect(() => {
    if (activeTab === 'PO') {
      loadPos()
    }
  }, [activeTab, loadPos])

  const onRefresh = async () => {
    setRefreshing(true)
    if (activeTab === 'RFQ') {
      await loadRfqs()
    } else {
      await loadPos()
    }
    setRefreshing(false)
  }

  // ─── Derived state for RFQ tab ─────────────────────────────────────────────────

  const unreadPredicate = (rfq: SupplierRfqInboxItem) => (rfq.unreadCount ?? 0) > 0

  // List actually rendered — respects the active tab, same as before,
  // but now sourced consistently from `filtered`.
  // ─── Buyer helpers (single-buyer PO rule) ──────────────────────────────────────
  // A Purchase Order must not combine RFQs from different buyers. We use the
  // buyer organisation id as the stable identifier (agent.organizationId or
  // agent.organization.id).
  const getBuyerOrgId = (rfq: SupplierRfqInboxItem): number | null => {
    return rfq.agent?.organizationId ?? rfq.agent?.organization?.id ?? null
  }

  // Buyer display name for a given orgId (used in selection header)
  const getBuyerName = (orgId: number | null): string => {
    if (orgId === null) return ''
    for (const rfq of rfqs) {
      if (getBuyerOrgId(rfq) === orgId) {
        return rfq.agent?.organization?.name ?? rfq.agent?.fullname ?? 'Unknown Buyer'
      }
    }
    return ''
  }

  // The buyer organisation id of the *currently selected* RFQs (null when none
  // are selected, which means no buyer restriction is active).
  const selectedBuyerOrgId = useMemo((): number | null => {
    for (const id of selectedRfqs) {
      const rfq = rfqs.find((r) => r.id === id)
      if (rfq) return getBuyerOrgId(rfq)
    }
    return null
  }, [selectedRfqs, rfqs])

  // Returns true when an RFQ is ineligible for selection because it belongs to a
  // different buyer while another buyer's RFQs are already in the selection set.
  const isDisabledByBuyer = useCallback((rfq: SupplierRfqInboxItem): boolean => {
    if (!isStatusInGroup(rfq.status, ELIGIBLE_RFQ_STATUSES)) return false // ineligible — handled separately
    if (selectedBuyerOrgId === null) return false                        // no restriction active
    const rfqBuyerId = getBuyerOrgId(rfq)
    if (rfqBuyerId === null) return false                                 // unknown buyer — allow
    return rfqBuyerId !== selectedBuyerOrgId
  }, [selectedBuyerOrgId])

  const filtered = useMemo(
    () => activeTab === 'RFQ' ? applyRfqFilters(rfqs, {
      search, statusFilter, dateFilter, unreadOnly, unreadPredicate, customRange,
    }) : [],
    [rfqs, search, statusFilter, dateFilter, unreadOnly, customRange, activeTab]
  )

  // FIX: KPI counts must NOT collapse to 0 when a status tab is selected.
  // Previously, pending/negotiating/accepted/closed counts were derived from
  // `filtered`, which already had the active tab's statusFilter applied — so
  // selecting e.g. "Negotiating" zeroed out every other card. KPIs should always
  // reflect the full picture (respecting only search/date/unread), independent
  // of which status tab is currently active.
  const filteredForCounts = useMemo(
    () => applyRfqFilters(rfqs, {
      search, statusFilter: 'ALL', dateFilter, unreadOnly, unreadPredicate, customRange,
    }),
    [rfqs, search, dateFilter, unreadOnly, customRange]
  )

  const pendingRfqs = useMemo(() => filteredForCounts.filter((r) => isStatusInGroup(r.status, RFQ_PENDING_STATUSES)), [filteredForCounts])
  const negotiatingRfqs = useMemo(() => filteredForCounts.filter((r) => isStatusInGroup(r.status, RFQ_NEGOTIATING_STATUSES)), [filteredForCounts])
  const acceptedRfqs = useMemo(() => filteredForCounts.filter((r) => isStatusInGroup(r.status, RFQ_ACCEPTED_STATUSES)), [filteredForCounts])
  const closedRfqs = useMemo(() => filteredForCounts.filter((r) => isStatusInGroup(r.status, RFQ_CLOSED_STATUSES)), [filteredForCounts])

  const totalUnread = useMemo(() => filteredForCounts.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0), [filteredForCounts])
  const totalPending = pendingRfqs.length
  const totalNegotiating = negotiatingRfqs.length
  const totalAccepted = acceptedRfqs.length
  const totalClosed = closedRfqs.length

  // Sectioned groups for the mobile view respect the active tab, same as before,
  // but now sourced consistently from `filtered`.
  const sectionPending = useMemo(() => filtered.filter((r) => isStatusInGroup(r.status, RFQ_PENDING_STATUSES)), [filtered])
  const sectionNegotiating = useMemo(() => filtered.filter((r) => isStatusInGroup(r.status, RFQ_NEGOTIATING_STATUSES)), [filtered])
  const sectionAccepted = useMemo(() => filtered.filter((r) => isStatusInGroup(r.status, RFQ_ACCEPTED_STATUSES)), [filtered])
  const sectionClosed = useMemo(() => filtered.filter((r) => isStatusInGroup(r.status, RFQ_CLOSED_STATUSES)), [filtered])

  // ─── Selection handlers (respect single-buyer PO rule) ───────────────────────────
  // A PO must not combine RFQs from different buyers. Selection is therefore
  // gated on the buyer organisation id: the first eligible RFQ the user selects
  // "locks" the buyer; all other RFQs from a *different* buyer are disabled in
  // the UI (via `isDisabledByBuyer`). `onToggleRfqSelection` re-checks on every
  // call so it stays a safe single source of truth, even though the UI should
  // also prevent the click. Backend validation remains authoritative.

  const handleCardPress = (rfq: SupplierRfqInboxItem) => {
    if (selectionMode && isStatusInGroup(rfq.status, ELIGIBLE_RFQ_STATUSES) && !isDisabledByBuyer(rfq)) {
      onToggleRfqSelection(rfq)
    } else {
      onRfqPress(rfq.id)
    }
  }

  const onToggleRfqSelection = (rfq: SupplierRfqInboxItem) => {
    if (!isStatusInGroup(rfq.status, ELIGIBLE_RFQ_STATUSES)) return
    // Reject RFQs from a different buyer when another buyer is already selected
    if (isDisabledByBuyer(rfq)) return
    const newSet = new Set(selectedRfqs)
    if (newSet.has(rfq.id)) {
      newSet.delete(rfq.id)
    } else {
      newSet.add(rfq.id)
    }
    setSelectedRfqs(newSet)
  }

  // Select-all selects only the RFQs that belong to the same buyer as the
  // current selection (or the first eligible buyer when none are selected yet).
  const handleSelectionToggle = () => {
    const eligible = filtered.filter((r) => isStatusInGroup(r.status, ELIGIBLE_RFQ_STATUSES))

    // Determine the "locked" buyer for this batch:
    const lockedBuyerId = selectedBuyerOrgId ?? (eligible.length > 0 ? getBuyerOrgId(eligible[0]) : null)

    // Only consider RFQs matching the locked buyer
    const selectable = lockedBuyerId !== null
      ? eligible.filter((r) => getBuyerOrgId(r) === lockedBuyerId)
      : []

    if (selectable.every((r) => selectedRfqs.has(r.id))) {
      // All selectable are already selected — deselect them
      const newSet = new Set(selectedRfqs)
      selectable.forEach((r) => newSet.delete(r.id))
      setSelectedRfqs(newSet)
    } else {
      // Add all selectable RFQs from the locked buyer
      const newSet = new Set(selectedRfqs)
      selectable.forEach((r) => newSet.add(r.id))
      setSelectedRfqs(newSet)
    }
  }

  const handleExitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedRfqs(new Set())
  }

  const handleRemoveRfqFromPo = (rfqId: string) => {
    const newSet = new Set(selectedRfqs)
    newSet.delete(rfqId)
    setSelectedRfqs(newSet)
    if (newSet.size === 0) {
      setCreatePoModalVisible(false)
      handleExitSelectionMode()
    }
  }

  const handleCreatePo = () => {
    if (selectedRfqs.size === 0) return
    // Defensive cross-buyer validation (backend is authoritative, but this
    // catches anything the UI missed and gives a clear error to the user).
    const selectedItems = rfqs.filter((r) => selectedRfqs.has(r.id))
    const buyerIds = new Set<number>()
    for (const rfq of selectedItems) {
      const orgId = getBuyerOrgId(rfq)
      if (orgId) buyerIds.add(orgId)
    }
    if (buyerIds.size > 1) {
      Alert.alert(
        'Cannot create PO',
        'The selected RFQs belong to different buyers. A single purchase order can only include RFQs from one buyer. Please adjust your selection.',
      )
      return
    }
    setCreatePoModalVisible(true)
  }

  const handlePoCreated = (poNumber: string) => {
    // Immediately close the modal, reset selection, and refresh data
    setCreatePoModalVisible(false)
    setSelectedRfqs(new Set())
    setSelectionMode(false)
    setActiveTab('PO')
    loadPos()
    // Also refresh RFQs since their status changed (e.g. Accepted → PO Created)
    loadRfqs()
    // Show the existing SuccessModal
    setSuccessModal({ visible: true, message: `Purchase Order ${poNumber} has been created successfully.` })
  }

  const renderRfqSection = (rfqs: SupplierRfqInboxItem[], emptyMsg: string) => {
    if (rfqs.length === 0) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
            <Package size={22} color={colors.textSecondary} />
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{emptyMsg}</Text>
        </View>
      )
    }
    return (
      <View style={{ gap: 14 }}>
        {rfqs.map((rfq, idx) => (
          <FadeInView key={rfq.id} delay={Math.min(idx, 6) * 30}>
            <RfqCard
              rfq={rfq}
              onPress={() => handleCardPress(rfq)}
              onRfqPress={onRfqPress}
              showCheckbox={selectionMode}
              isSelected={selectedRfqs.has(rfq.id)}
              onToggleSelection={() => onToggleRfqSelection(rfq)}
              isDisabledByBuyer={isDisabledByBuyer(rfq)}
            />
          </FadeInView>
        ))}
      </View>
    )
  }
  const kpiRow = isDesktop ? (
    loading ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
            <SkeletonStatCard width="100%" />
          </View>
        ))}
      </View>
    ) : (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        <FadeInView delay={0} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Pending" value={totalPending} accent={RFQ_STATUS_COLORS.SUBMITTED} icon={Clock} width="100%" />
        </FadeInView>
        <FadeInView delay={40} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Negotiating" value={totalNegotiating} accent={RFQ_STATUS_COLORS.NEGOTIATING} icon={CheckCircle2} width="100%" />
        </FadeInView>
        <FadeInView delay={80} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Accepted" value={totalAccepted} accent={RFQ_STATUS_COLORS.NEGOTIATION_ACCEPTED} icon={Package} width="100%" />
        </FadeInView>
        <FadeInView delay={120} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Closed" value={totalClosed} accent={RFQ_STATUS_COLORS.CANCELLED} icon={XCircle} width="100%" />
        </FadeInView>
        <FadeInView delay={160} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Unread" value={totalUnread > 99 ? '99+' : totalUnread} accent={colors.primary} icon={Bell} width="100%" />
        </FadeInView>
      </View>
    )
  ) : (
    // ─── Mobile: compact horizontal scroll strip ───────────────────────────
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {loading ? (
        [0, 1, 2, 3, 4].map((i) => (
          <SkeletonCompactStatCard key={i} width={i < 3 ? '31.3%' : '48.5%'} />
        ))
      ) : (
        <>
          <CompactStatCard title="Pending" value={totalPending} accent={RFQ_STATUS_COLORS.SUBMITTED} icon={Clock} width="31.3%" />
          <CompactStatCard title="Negotiating" value={totalNegotiating} accent={RFQ_STATUS_COLORS.NEGOTIATING} icon={CheckCircle2} width="31.3%" />
          <CompactStatCard title="Accepted" value={totalAccepted} accent={RFQ_STATUS_COLORS.NEGOTIATION_ACCEPTED} icon={Package} width="31.3%" />
          <CompactStatCard title="Closed" value={totalClosed} accent={RFQ_STATUS_COLORS.CANCELLED} icon={XCircle} width="48.5%" />
          <CompactStatCard title="Unread" value={totalUnread > 99 ? '99+' : totalUnread} accent={colors.primary} icon={Bell} width="48.5%" />
        </>
      )}
    </View>
  )

  // ─── PO KPI Row ───────────────────────────────────────────────────────────────

  const poKpiRow = isDesktop ? (
    poLoading ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
            <SkeletonStatCard width="100%" />
          </View>
        ))}
      </View>
    ) : (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        <FadeInView delay={0} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Total POs" value={purchaseOrders.length} accent={PO_STATUS_COLORS.PENDING} icon={FileText} width="100%" />
        </FadeInView>
        <FadeInView delay={40} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Pending" value={purchaseOrders.filter(p => p.status === 'PENDING').length} accent={PO_STATUS_COLORS.PENDING} icon={Clock} width="100%" />
        </FadeInView>
        <FadeInView delay={80} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Accepted" value={purchaseOrders.filter(p => p.status === 'ACCEPTED').length} accent={PO_STATUS_COLORS.ACCEPTED} icon={CheckCircle2} width="100%" />
        </FadeInView>
        <FadeInView delay={120} style={{ flexGrow: 1, flexBasis: kpiMinWidth, minWidth: kpiMinWidth }}>
          <StatCard title="Delivered" value={purchaseOrders.filter(p => p.status === 'DELIVERED').length} accent={PO_STATUS_COLORS.DELIVERED} icon={Package} width="100%" />
        </FadeInView>
      </View>
    )
  ) : (// ─── Mobile: compact horizontal scroll strip ───────────────────────────
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {loading ? (
        [0, 1, 2, 3].map((i) => (
          <SkeletonCompactStatCard key={i} width="48.5%" />
        ))
      ) : (
        <>
          <CompactStatCard title="Total POs" value={purchaseOrders.length} accent={PO_STATUS_COLORS.PENDING} icon={FileText} width="48.5%" />
          <CompactStatCard title="Pending" value={purchaseOrders.filter(p => p.status === 'PENDING').length} accent={RFQ_STATUS_COLORS.NEGOTIATING} icon={Clock} width="48.5%" />
          <CompactStatCard title="Accepted" value={purchaseOrders.filter(p => p.status === 'ACCEPTED').length} accent={PO_STATUS_COLORS.ACCEPTED} icon={CheckCircle2} width="48.5%" />
          <CompactStatCard title="Closed" value={purchaseOrders.filter(p => p.status === 'DELIVERED').length} accent={PO_STATUS_COLORS.DELIVERED} icon={Package} width="48.5%" />
        </>
      )}
    </View>
  )
  // ─── PO Desktop status filter chips ────────────────────────────────────────────

  const PoStatusFilter = () => {
    const { colors } = useTheme()
    const isAllActive = poStatusFilter === null
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {PO_STATUS_FILTERS.map((opt) => {
          const isActive = opt.key === 'ALL' ? isAllActive : poStatusFilter === opt.key
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setPoStatusFilter(opt.key === 'ALL' ? null : opt.key)}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                backgroundColor: isActive ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: isActive ? colors.primary : colors.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#fff' : colors.textSecondary }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    )
  }

  const handlePoPress = (po: PurchaseOrder) => {
    if (onPoPress) {
      onPoPress(po.id)
    } else {
      Alert.alert(
        `PO ${po.poNumber}`,
        `Buyer: ${po.buyerOrg?.name ?? 'Unknown'}\nTotal: ${formatPHP(po.totalAmount)}\nStatus: ${PO_STATUS_LABELS[po.status]}`,
      )
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────────

  if (isDesktop) {
    // ─── Desktop: tabbed view ─────────────────────────────────────────────────────
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{
          paddingHorizontal: horizontalPadding,
          paddingVertical: 16,
          gap: 18,
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
          width: '100%',
        }}>
          <SectionHeader
            title={activeTab === 'RFQ' ? 'RFQ Inbox' : 'Purchase Orders'}
            subtitle={
              activeTab === 'RFQ'
                ? 'Review RFQs from buyers, negotiate offers, and create purchase orders.'
                : 'View and manage purchase orders issued to your organization.'
            }
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  flexDirection: 'row',
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                }}>
                  <TabButton label="RFQ Inbox" isActive={activeTab === 'RFQ'} onPress={() => setActiveTab('RFQ')} count={rfqs.length} />
                  <TabButton label="Purchase Orders" isActive={activeTab === 'PO'} onPress={() => setActiveTab('PO')} count={purchaseOrders.length} />
                </View>
                <TouchableOpacity onPress={onRefresh} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <RefreshCcw size={16} color={colors.text} />
                </TouchableOpacity>
                {!selectionMode && activeTab === 'RFQ' && (
                  <TouchableOpacity onPress={() => setSelectionMode(true)} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} color="#fff" />
                  </TouchableOpacity>
                )}
                {selectionMode && activeTab === 'RFQ' && (
                  <TouchableOpacity onPress={handleExitSelectionMode} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <XCircle size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            }
          />

          {activeTab === 'RFQ' && (
            <>
              {kpiRow}

              <RfqFilters
                search={search} onSearchChange={setSearch}
                statusFilter={statusFilter} onStatusChange={setStatusFilter}
                dateFilter={dateFilter} onDateFilterChange={setDateFilter}
                unreadOnly={unreadOnly} onUnreadOnlyChange={setUnreadOnly}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
              />

              {selectionMode && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: colors.surface, borderRadius: 12, padding: 14,
                  borderWidth: 1, borderColor: colors.border,
                  marginBottom: 4,
                }}>
                  <TouchableOpacity
                    onPress={handleSelectionToggle}
                    style={{
                      width: 26, height: 26, borderRadius: 6,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: `${colors.primary}10`,
                      borderWidth: 1, borderColor: colors.primary,
                    }}
                  >
                    {(() => {
                      const eligible = filtered.filter(r => isStatusInGroup(r.status, ELIGIBLE_RFQ_STATUSES))
                      const lockedBuyer = selectedBuyerOrgId ?? (eligible.length > 0 ? getBuyerOrgId(eligible[0]) : null)
                      const selectable = lockedBuyer !== null
                        ? eligible.filter((r) => getBuyerOrgId(r) === lockedBuyer)
                        : []
                      return selectedRfqs.size > 0 && selectable.length > 0 && selectable.every((r) => selectedRfqs.has(r.id))
                        ? <CircleCheckIcon size={16} color={colors.primary} />
                        : <CircleOutlineIcon size={16} color={colors.primary} />
                    })()}
                  </TouchableOpacity>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    {selectedRfqs.size} RFQ{selectedRfqs.size !== 1 ? 's' : ''} selected
                  </Text>
                  {selectedBuyerOrgId !== null && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      · Buyer: {getBuyerName(selectedBuyerOrgId) || '—'}
                    </Text>
                  )}
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    onPress={handleCreatePo}
                    disabled={selectedRfqs.size === 0}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: selectedRfqs.size > 0 ? colors.primary : colors.surface,
                      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
                      borderWidth: 1, borderColor: selectedRfqs.size > 0 ? colors.primary : colors.border,
                      opacity: selectedRfqs.size > 0 ? 1 : 0.5,
                    }}
                  >
                    <ShoppingCart size={14} color={selectedRfqs.size > 0 ? '#fff' : colors.textSecondary} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: selectedRfqs.size > 0 ? '#fff' : colors.textSecondary }}>
                      Create Purchase Order
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {loading ? (
                <SkeletonList count={4} />
              ) : filtered.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={26} color={colors.textSecondary} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>No RFQs match your filters</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Try adjusting your search or filters.</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                  <RfqDesktopTable
                    rfqs={filtered}
                    onRfqPress={onRfqPress}
                    selectionMode={selectionMode}
                    selectedRfqs={selectedRfqs}
                    onToggleSelection={onToggleRfqSelection}
                    isDisabledByBuyer={isDisabledByBuyer}
                  />
                </View>
              )}
            </>
          )}

          {activeTab === 'PO' && (
            <>
              {poKpiRow}

              <PoStatusFilter />

              {poLoading ? (
                <View style={{ gap: 1 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonPoRow key={i} />
                  ))}
                </View>
              ) : purchaseOrders.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={26} color={colors.textSecondary} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>No purchase orders found</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>No POs match your selected filters.</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                  <PoDesktopTable purchaseOrders={purchaseOrders} onPoPress={handlePoPress} />
                </View>
              )}
            </>
          )}
        </View>

        <CreateConsolidatedPoModal
          visible={createPoModalVisible}
          selectedRfqs={rfqs.filter((r) => selectedRfqs.has(r.id))}
          onClose={() => setCreatePoModalVisible(false)}
          onCancel={handleExitSelectionMode}
          onRemoveRfq={handleRemoveRfqFromPo}
          onCreated={handlePoCreated}
        />
      </View>
    )
  }

  // ─── Mobile/Tablet: card layout ─────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingVertical: 16,
          gap: 18,
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SectionHeader
          title={activeTab === 'RFQ' ? 'RFQ Inbox' : 'Purchase Orders'}
          subtitle={
            activeTab === 'RFQ'
              ? 'Review RFQs from buyers, negotiate offers, and create purchase orders.'
              : 'View and manage purchase orders issued to your organization.'
          }
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{
                flexDirection: 'row',
                backgroundColor: colors.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              }}>
                <TabButton
                  label="RFQ Inbox"
                  isActive={activeTab === 'RFQ'}
                  onPress={() => setActiveTab('RFQ')}
                  count={rfqs.length}
                />
                <TabButton
                  label="Purchase Orders"
                  isActive={activeTab === 'PO'}
                  onPress={() => setActiveTab('PO')}
                  count={purchaseOrders.length}
                />
              </View>
              <TouchableOpacity onPress={onRefresh} style={{ padding: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <RefreshCcw size={16} color={colors.text} />
              </TouchableOpacity>
              {!selectionMode && activeTab === 'RFQ' && (
                <TouchableOpacity
                  onPress={() => setSelectionMode(true)}
                  style={{ padding: 8, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={16} color="#fff" />
                </TouchableOpacity>
              )}
              {selectionMode && activeTab === 'RFQ' && (
                <TouchableOpacity
                  onPress={handleExitSelectionMode}
                  style={{ padding: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <XCircle size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          }
        />

        {activeTab === 'RFQ' && (
          <>
            {kpiRow}

            <RfqFilters
              search={search} onSearchChange={setSearch}
              statusFilter={statusFilter} onStatusChange={setStatusFilter}
              dateFilter={dateFilter} onDateFilterChange={setDateFilter}
              unreadOnly={unreadOnly} onUnreadOnlyChange={setUnreadOnly}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />

            {selectionMode && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: colors.surface, borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <TouchableOpacity
                  onPress={handleSelectionToggle}
                  style={{
                    width: 26, height: 26, borderRadius: 6,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: `${colors.primary}10`,
                    borderWidth: 1, borderColor: colors.primary,
                  }}
                >
                  {(() => {
                    const eligible = filtered.filter(r => isStatusInGroup(r.status, ELIGIBLE_RFQ_STATUSES))
                    const lockedBuyer = selectedBuyerOrgId ?? (eligible.length > 0 ? getBuyerOrgId(eligible[0]) : null)
                    const selectable = lockedBuyer !== null
                      ? eligible.filter((r) => getBuyerOrgId(r) === lockedBuyer)
                      : []
                    return selectedRfqs.size > 0 && selectable.length > 0 && selectable.every((r) => selectedRfqs.has(r.id))
                      ? <CircleCheckIcon size={16} color={colors.primary} />
                      : <CircleOutlineIcon size={16} color={colors.primary} />
                  })()}
                </TouchableOpacity>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  {selectedRfqs.size} RFQ{selectedRfqs.size !== 1 ? 's' : ''} selected
                  {selectedBuyerOrgId !== null && (
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}> · Buyer: {getBuyerName(selectedBuyerOrgId) || ''}</Text>
                  )}
                </Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  onPress={handleCreatePo}
                  disabled={selectedRfqs.size === 0}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: selectedRfqs.size > 0 ? colors.primary : colors.surface,
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                    borderWidth: 1, borderColor: selectedRfqs.size > 0 ? colors.primary : colors.border,
                    opacity: selectedRfqs.size > 0 ? 1 : 0.5,
                  }}
                >
                  <ShoppingCart size={14} color={selectedRfqs.size > 0 ? '#fff' : colors.textSecondary} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: selectedRfqs.size > 0 ? '#fff' : colors.textSecondary }}>
                    Create PO
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {loading ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gridGap }}>
                {Array.from({ length: gridColumns * 2 }).map((_, i) => (
                  <View key={i} style={{ width: gridCardWidth, height: 140, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: 0.6 }} />
                ))}
              </View>
            ) : filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={26} color={colors.textSecondary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>No RFQs match your filters</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Try adjusting your search or filters.</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gridGap }}>
                {filtered.map((rfq, idx) => (
                  <FadeInView key={rfq.id} delay={Math.min(idx, 10) * 20} style={{ width: gridCardWidth }}>
                    <RfqCard
                      compact
                      rfq={rfq}
                      onPress={() => handleCardPress(rfq)}
                      onRfqPress={onRfqPress}
                      showCheckbox={selectionMode}
                      isSelected={selectedRfqs.has(rfq.id)}
                      onToggleSelection={() => onToggleRfqSelection(rfq)}
                      isDisabledByBuyer={isDisabledByBuyer(rfq)}
                    />
                  </FadeInView>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'PO' && (
          <>
            {poKpiRow}

            <PoStatusFilter />

            {poLoading ? (
              <SkeletonList count={3} />
            ) : purchaseOrders.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={26} color={colors.textSecondary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>No purchase orders found</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>No POs match your selected filters.</Text>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {purchaseOrders.map((po, idx) => (
                  <FadeInView key={po.id} delay={Math.min(idx, 6) * 30}>
                    <PoMobileCard po={po} onPress={() => handlePoPress(po)} />
                  </FadeInView>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <CreateConsolidatedPoModal
        visible={createPoModalVisible}
        selectedRfqs={rfqs.filter((r) => selectedRfqs.has(r.id))}
        onClose={() => setCreatePoModalVisible(false)}
        onCancel={handleExitSelectionMode}
        onRemoveRfq={handleRemoveRfqFromPo}
        onCreated={handlePoCreated}
      />

      <SuccessModal
        visible={successModal.visible}
        message={successModal.message}
        onClose={() => setSuccessModal({ visible: false, message: '' })}
      />
    </View>
  )
}
