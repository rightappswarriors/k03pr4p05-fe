import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { Building2, Eye, Search, X } from 'lucide-react-native'
import { useRouter } from 'expo-router'

import { EmptyState } from '@/components/DataTable'
import { Pagination } from '@/components/supplier/catalog/CatalogPagination'
import { useTheme } from '@/contexts/ThemeContext'
import { getRegisteredSuppliers, requestLink, type SupplierDirectoryEntry, type SupplierLinkOutletOption } from '@/services/supplierLinkService'
import { SupplierBusinessProfileModal } from './SupplierBusinessProfileModal'

export function SupplierLinkDirectoryModal({ visible, onClose, onRequested }: { visible: boolean; onClose: () => void; onRequested: () => void | Promise<void> }) {
  const { colors } = useTheme()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const [items, setItems] = useState<SupplierDirectoryEntry[]>([])
  const [outlets, setOutlets] = useState<SupplierLinkOutletOption[]>([])
  const [outletId, setOutletId] = useState<number | undefined>()
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [requestingId, setRequestingId] = useState<number | null>(null)
  const [profileSupplierId, setProfileSupplierId] = useState<number | null>(null)

  useEffect(() => { const timer = setTimeout(() => { setPage(1); setAppliedSearch(search.trim()) }, 300); return () => clearTimeout(timer) }, [search])
  const load = useCallback(async () => {
    if (!visible) return
    try {
      setLoading(true)
      const result = await getRegisteredSuppliers({ search: appliedSearch || undefined, outletId, page, pageSize: 20 })
      setItems(result.items); setOutlets(result.outlets); setTotal(result.total)
      if (outletId == null && result.outlets[0]) setOutletId(result.outlets[0].id)
    } catch (error: any) { Alert.alert('Unable to find Suppliers', error?.message ?? 'Please try again.') }
    finally { setLoading(false) }
  }, [appliedSearch, outletId, page, visible])
  useEffect(() => { load() }, [load])

  const request = async (supplier: SupplierDirectoryEntry) => {
    if (!outletId) return Alert.alert('Select an outlet', 'Choose which Retailer outlet will connect to this Supplier.')
    try {
      setRequestingId(supplier.id); await requestLink(supplier.id, outletId); await onRequested()
    } catch (error: any) { Alert.alert('Request failed', error?.message ?? 'Please try again.') }
    finally { setRequestingId(null) }
  }

  const browse = (linkId: string) => {
    onClose()
    router.push(`/(erp)/supplier-links/${linkId}` as never)
  }

  return <><Modal transparent visible={visible && profileSupplierId == null} animationType="fade" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.55)', padding: width < 600 ? 10 : 24, justifyContent: 'center', alignItems: 'center' }}>
      <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 760, maxHeight: width < 600 ? '96%' : '88%', borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 19, fontWeight: '900' }}>Connect with Supplier</Text><Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>Select your outlet and a registered Supplier.</Text></View><TouchableOpacity accessibilityLabel="Close Supplier directory" onPress={onClose} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><X size={20} color={colors.text} /></TouchableOpacity></View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          <View><Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '800', marginBottom: 7 }}>RETAILER OUTLET</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{outlets.map(outlet => <TouchableOpacity key={outlet.id} onPress={() => { setOutletId(outlet.id); setPage(1) }} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 99, borderWidth: 1, borderColor: outletId === outlet.id ? colors.primary : colors.border, backgroundColor: outletId === outlet.id ? `${colors.primary}18` : colors.background }}><Text style={{ color: outletId === outlet.id ? colors.primary : colors.text, fontWeight: '800' }}>{outlet.name}</Text></TouchableOpacity>)}</ScrollView>{!outlets.length && !loading ? <Text style={{ color: colors.error, marginTop: 6 }}>Your organization needs an active outlet before requesting a link.</Text> : null}</View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 11 }}><Search size={16} color={colors.textSecondary} /><TextInput value={search} onChangeText={setSearch} placeholder="Search registered Suppliers" placeholderTextColor={colors.textSecondary} style={{ flex: 1, height: 44, color: colors.text }} /></View>
          {loading ? <ActivityIndicator color={colors.primary} /> : items.length ? <View style={{ gap: 9 }}>{items.map(supplier => {
            const unavailable = supplier.relationshipStatus === 'PENDING'
            return <View key={supplier.id} style={{ flexDirection: width < 520 ? 'column' : 'row', alignItems: width < 520 ? 'stretch' : 'center', gap: 10, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}><View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>{supplier.profileImage ? <Image source={{ uri: supplier.profileImage }} style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: colors.sidebarMuted }} /> : <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: colors.sidebarMuted, alignItems: 'center', justifyContent: 'center' }}><Building2 size={21} color={colors.primary} /></View>}<View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '900' }}>{supplier.name}</Text><Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>{supplier.location ?? 'Location not provided'}</Text>{supplier.relationshipStatus ? <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800', marginTop: 5 }}>Current status: {supplier.relationshipStatus}</Text> : null}</View></View><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}><TouchableOpacity onPress={() => setProfileSupplierId(supplier.id)} style={{ minHeight: 42, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 13, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}><Eye size={15} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '800' }}>View Supplier</Text></TouchableOpacity><TouchableOpacity disabled={!outletId || unavailable || requestingId === supplier.id || (supplier.relationshipStatus === 'APPROVED' && !supplier.relationshipId)} onPress={() => supplier.relationshipStatus === 'APPROVED' && supplier.relationshipId ? browse(supplier.relationshipId) : request(supplier)} style={{ minHeight: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 13, borderRadius: 9, backgroundColor: unavailable ? colors.sidebarMuted : colors.primary, opacity: requestingId === supplier.id ? .6 : 1 }}><Text style={{ color: unavailable ? colors.textSecondary : '#fff', fontWeight: '800' }}>{requestingId === supplier.id ? 'Requesting…' : supplier.relationshipStatus === 'APPROVED' ? 'Browse Products / Order' : supplier.relationshipStatus === 'REJECTED' || supplier.relationshipStatus === 'DISABLED' ? 'Request Again' : unavailable ? supplier.relationshipStatus : 'Request Link'}</Text></TouchableOpacity></View></View>
          })}</View> : <EmptyState title="No registered Suppliers found." message="Try a different search term." />}
          <Pagination page={page} pageSize={20} totalItems={total} pageSizeOptions={[20]} onPageChange={setPage} onPageSizeChange={() => {}} showSummary />
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal><SupplierBusinessProfileModal visible={visible && profileSupplierId != null} supplierOrgId={profileSupplierId} outletId={outletId} onClose={() => setProfileSupplierId(null)} onRequested={async () => { setProfileSupplierId(null); await onRequested() }} onBrowseCatalog={(linkId) => { setProfileSupplierId(null); onClose(); router.push(`/(erp)/supplier-links/${linkId}` as never) }} /></>
}
