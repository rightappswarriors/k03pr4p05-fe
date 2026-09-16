import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { BadgeCheck, Building2, MapPin, PackageCheck, Phone, ShoppingBag, Star, Truck, X } from 'lucide-react-native'

import { EmptyState } from '@/components/DataTable'
import { Kpis } from '@/components/Kpi'
import { KpiSkeletonRow, OrderCardSkeletonList } from '@/components/LoadingSkeleton'
import { useTheme } from '@/contexts/ThemeContext'
import { getRegisteredSupplierProfile, requestLink, type SupplierBusinessProfile } from '@/services/supplierLinkService'

type ProfileTab = 'OVERVIEW' | 'PRODUCTS' | 'PERFORMANCE'

const formatDate = (value: string) => new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(new Date(value))
const rate = (value?: number | null) => value == null ? 'N/A' : `${value.toFixed(1)}%`

export function SupplierBusinessProfileModal({
  visible,
  supplierOrgId,
  outletId,
  onClose,
  onRequested,
  onBrowseCatalog,
}: {
  visible: boolean
  supplierOrgId: number | null
  outletId?: number
  onClose: () => void
  onRequested?: () => void | Promise<void>
  onBrowseCatalog?: (linkId: string) => void
}) {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const [profile, setProfile] = useState<SupplierBusinessProfile | null>(null)
  const [tab, setTab] = useState<ProfileTab>('OVERVIEW')
  const [loading, setLoading] = useState(false)
  const [requesting, setRequesting] = useState(false)

  const load = useCallback(async () => {
    if (!visible || supplierOrgId == null) return
    try {
      setLoading(true)
      setProfile(await getRegisteredSupplierProfile(supplierOrgId, outletId))
    } catch (error: any) {
      Alert.alert('Unable to load Supplier profile', error?.message ?? 'Please try again.')
    } finally {
      setLoading(false)
    }
  }, [outletId, supplierOrgId, visible])

  useEffect(() => {
    if (visible) { setTab('OVERVIEW'); setProfile(null); void load() }
  }, [load, visible])

  const request = async () => {
    if (!profile || outletId == null) return Alert.alert('Select an outlet', 'Choose a Retailer outlet before requesting this Supplier link.')
    try {
      setRequesting(true)
      await requestLink(profile.id, outletId)
      await load()
      await onRequested?.()
    } catch (error: any) {
      Alert.alert('Request failed', error?.message ?? 'Please try again.')
    } finally {
      setRequesting(false)
    }
  }

  const compact = width < 600
  const canRequest = !profile?.relationshipStatus || ['REJECTED', 'DISABLED'].includes(profile.relationshipStatus)
  const verified = profile?.verificationStatus === 'VERIFIED'

  return <Modal transparent visible={visible} animationType={compact ? 'slide' : 'fade'} onRequestClose={onClose}>
    <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.58)', justifyContent: compact ? 'flex-end' : 'center', alignItems: 'center', padding: compact ? 0 : 24 }}>
      <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 920, height: compact ? '96%' : undefined, maxHeight: compact ? '96%' : '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: compact ? 0 : 20, borderBottomRightRadius: compact ? 0 : 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '900' }}>Supplier Profile</Text>
          <TouchableOpacity accessibilityLabel="Close Supplier profile" onPress={onClose} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}><X size={20} color={colors.text} /></TouchableOpacity>
        </View>
        {loading && !profile ? <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}><OrderCardSkeletonList count={2} /><KpiSkeletonRow count={4} /></ScrollView> : profile ? <>
          <View style={{ padding: compact ? 16 : 22, flexDirection: compact ? 'column' : 'row', alignItems: compact ? 'flex-start' : 'center', gap: 16, backgroundColor: colors.background }}>
            {profile.profileImage ? <Image source={{ uri: profile.profileImage }} style={{ width: 76, height: 76, borderRadius: 20, backgroundColor: colors.sidebarMuted }} /> : <View style={{ width: 76, height: 76, borderRadius: 20, backgroundColor: colors.sidebarMuted, alignItems: 'center', justifyContent: 'center' }}><Building2 size={34} color={colors.primary} /></View>}
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}><Text style={{ color: colors.text, fontSize: 24, fontWeight: '900' }}>{profile.name}</Text>{verified ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, backgroundColor: '#D1FAE5' }}><BadgeCheck size={14} color="#047857" /><Text style={{ color: '#047857', fontSize: 11, fontWeight: '900' }}>Verified</Text></View> : null}</View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><MapPin size={14} color={colors.textSecondary} /><Text style={{ color: colors.textSecondary }}>{profile.location ?? 'Location not provided'}</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Star size={14} color="#F59E0B" fill={profile.metrics.overallRating == null ? 'transparent' : '#F59E0B'} /><Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{profile.metrics.overallRating == null ? 'No ratings yet' : `${profile.metrics.overallRating.toFixed(1)} from ${profile.metrics.reviewCount} review${profile.metrics.reviewCount === 1 ? '' : 's'}`}</Text></View>
            </View>
            <View style={{ width: compact ? '100%' : undefined, minWidth: compact ? 0 : 190 }}>
              {profile.relationshipStatus === 'APPROVED' && profile.relationshipId && onBrowseCatalog ? <TouchableOpacity onPress={() => onBrowseCatalog(profile.relationshipId!)} style={{ minHeight: 46, paddingHorizontal: 16, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '900' }}>Browse Products / Order</Text></TouchableOpacity> : <TouchableOpacity disabled={!canRequest || requesting} onPress={request} style={{ minHeight: 46, paddingHorizontal: 16, borderRadius: 11, backgroundColor: canRequest ? colors.primary : colors.sidebarMuted, alignItems: 'center', justifyContent: 'center', opacity: requesting ? .65 : 1 }}>{requesting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: canRequest ? '#fff' : colors.textSecondary, fontWeight: '900' }}>{profile.relationshipStatus === 'PENDING' ? 'Request Pending' : canRequest ? profile.relationshipStatus ? 'Request Link Again' : 'Request Link' : profile.relationshipStatus}</Text>}</TouchableOpacity>}
            </View>
          </View>
          <View style={{ flexDirection: 'row', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>{(['OVERVIEW', 'PRODUCTS', 'PERFORMANCE'] as ProfileTab[]).map(item => <TouchableOpacity key={item} onPress={() => setTab(item)} style={{ minHeight: 46, flex: 1, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: tab === item ? colors.primary : 'transparent' }}><Text style={{ color: tab === item ? colors.primary : colors.textSecondary, fontWeight: '900', fontSize: compact ? 11 : 13 }}>{item[0] + item.slice(1).toLowerCase()}</Text></TouchableOpacity>)}</View>
          <ScrollView contentContainerStyle={{ padding: compact ? 16 : 22, gap: 16 }}>
            {tab === 'OVERVIEW' ? <>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>About this Supplier</Text>
              <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>{profile.bio?.trim() || 'This Supplier has not added a business description yet.'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Info label="Member since" value={formatDate(profile.memberSince)} colors={colors} /><Info label="Business contact" value={profile.contactNumber ?? 'Not provided'} icon={Phone} colors={colors} /><Info label="Selected outlet" value={profile.outletName ?? 'Select an outlet'} colors={colors} /></View>
              <View><Text style={{ color: colors.text, fontWeight: '900', marginBottom: 8 }}>Categories sold</Text>{profile.categories.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{profile.categories.map(category => <View key={category} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: colors.sidebarMuted }}><Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{category}</Text></View>)}</View> : <Text style={{ color: colors.textSecondary }}>No active product categories</Text>}</View>
            </> : null}
            {tab === 'PRODUCTS' ? <>
              <Kpis items={[{ title: 'Active / Orderable Products', value: String(profile.metrics.activeProducts), subtitle: profile.metrics.activeProducts ? 'Published and currently active' : 'No active products', icon: PackageCheck, accent: '#2563EB' }]} />
              {profile.productPreview.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{profile.productPreview.map(product => <View key={product.id} style={{ flexBasis: compact ? '100%' : 250, flexGrow: 1, minWidth: 0, flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>{product.image ? <Image source={{ uri: product.image }} style={{ width: 54, height: 54, borderRadius: 10, backgroundColor: colors.sidebarMuted }} /> : <View style={{ width: 54, height: 54, borderRadius: 10, backgroundColor: colors.sidebarMuted, alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={22} color={colors.textSecondary} /></View>}<View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '900' }}>{product.name}</Text><Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>{product.category ?? 'Uncategorized'}</Text><Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 3 }}>MOQ {product.moq} {product.unit}</Text></View></View>)}</View> : <EmptyState title="No active products" message="This Supplier has no published, orderable products to preview." />}
            </> : null}
            {tab === 'PERFORMANCE' ? <>
              <Kpis items={[
                { title: 'Successful Orders', value: String(profile.metrics.successfulOrders), subtitle: 'Completed Purchase Orders', icon: ShoppingBag, accent: '#059669' },
                { title: 'Order Completion Rate', value: rate(profile.metrics.orderCompletionRate), subtitle: profile.metrics.eligibleTerminalOrders ? `${profile.metrics.successfulOrders} of ${profile.metrics.eligibleTerminalOrders} terminal orders` : 'Not enough order history yet', icon: PackageCheck, accent: '#2563EB' },
                { title: 'Delivery Completion Rate', value: rate(profile.metrics.deliveryCompletionRate), subtitle: profile.metrics.eligibleTerminalDeliveries ? `${profile.metrics.completedDeliveries} of ${profile.metrics.eligibleTerminalDeliveries} terminal deliveries` : 'Not enough delivery history yet', icon: Truck, accent: '#7C3AED' },
              ]} />
              {!profile.metrics.eligibleTerminalOrders && !profile.metrics.eligibleTerminalDeliveries ? <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Not enough order history yet</Text> : null}
            </> : null}
          </ScrollView>
        </> : <View style={{ padding: 20 }}><EmptyState title="Supplier profile unavailable" message="Close this profile and try again." /></View>}
      </Pressable>
    </Pressable>
  </Modal>
}

function Info({ label, value, icon: Icon, colors }: { label: string; value: string; icon?: React.ComponentType<any>; colors: any }) {
  return <View style={{ flexBasis: 210, flexGrow: 1, minWidth: 0, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.card }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{Icon ? <Icon size={14} color={colors.textSecondary} /> : null}<Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800' }}>{label.toUpperCase()}</Text></View><Text style={{ color: colors.text, marginTop: 5, fontWeight: '800' }}>{value}</Text></View>
}
