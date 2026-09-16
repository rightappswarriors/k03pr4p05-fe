import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ban, CheckCircle2, Clock3, RefreshCw, Search, XCircle } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '@/contexts/ThemeContext'
import { EmptyState } from '@/components/DataTable'
import { KpiSkeletonRow } from '@/components/LoadingSkeleton'
import { FadeInView } from '@/components/FadeInView'
import { Kpis } from '@/components/Kpi'
import { DataRecordCard, ResponsiveDataView } from '@/components/ResponsiveDataView'
import { Pagination } from '@/components/supplier/catalog/CatalogPagination'
import PermissionDenied from '@/components/PermissionDenied'
import { ActionModal } from '@/components/ActionModal'
import { usePermissions } from '@/hooks/usePermissions'
import { SupplierLinkDetailsModal } from '@/components/supplier/links/SupplierLinkDetailsModal'
import { SupplierLinkDirectoryModal } from '@/components/supplier/links/SupplierLinkDirectoryModal'
import { SupplierBusinessProfileModal } from '@/components/supplier/links/SupplierBusinessProfileModal'
import { approveLink, disableLink, getLinks, getRetailerLinks, rejectLink, reviewSupplierInvitation, type SortDirection, type SupplierLink, type SupplierLinkSortField, type SupplierLinkStatus, type SupplierLinkSummary } from '@/services/supplierLinkService'

const STORAGE_KEY = 'supplierLinksWorkspacePreferences'

const statuses: Array<SupplierLinkStatus | 'ALL'> = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DISABLED']
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'No activity'
const statusColor = (status: SupplierLinkStatus) => ({ APPROVED: '#059669', PENDING: '#D97706', REJECTED: '#DC2626', DISABLED: '#64748B' }[status])
const EMPTY_SUMMARY: SupplierLinkSummary = { activeRetailers: 0, pendingRequests: 0, rejectedRequests: 0, disabledLinks: 0 }
type RelationshipAction = 'approve' | 'reject' | 'disable' | 'acceptInvitation' | 'rejectInvitation'

const savedStatus = (value: unknown): SupplierLinkStatus | 'ALL' => {
  if (value === 'ACTIVE' || value === 'ACCEPTED') return 'APPROVED'
  if (value === 'REQUESTED' || value === 'SUGGESTED') return 'PENDING'
  if (value === 'BLOCKED') return 'REJECTED'
  if (value === 'PAUSED' || value === 'ARCHIVED') return 'DISABLED'
  return statuses.includes(value as SupplierLinkStatus | 'ALL') ? value as SupplierLinkStatus | 'ALL' : 'ALL'
}


export default function SupplierLinksScreen({ portal = 'supplier' }: { portal?: 'supplier' | 'retailer' }) {
  const { colors } = useTheme();
  const router = useRouter()
  const { width } = useWindowDimensions();
  const { can, permissionsLoading } = usePermissions()
  const desktop = width >= 1024
  const [links, setLinks] = useState<SupplierLink[]>([]);
  const [summary, setSummary] = useState<SupplierLinkSummary>(EMPTY_SUMMARY)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('')
  const [status, setStatus] = useState<SupplierLinkStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState<SupplierLinkSortField>('REQUESTED_AT')
  const [sortDirection, setSortDirection] = useState<SortDirection>('DESC')
  const [selectedLink, setSelectedLink] = useState<SupplierLink | null>(null)
  const [pendingAction, setPendingAction] = useState<{ link: SupplierLink; action: RelationshipAction } | null>(null)
  const [directoryVisible, setDirectoryVisible] = useState(false)
  const [supplierProfileLink, setSupplierProfileLink] = useState<SupplierLink | null>(null)
  const requestVersion = useRef(0)
  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then(raw => { if (!raw) return; try { const saved = JSON.parse(raw); setStatus(savedStatus(saved.status)); if ([20, 50, 100].includes(saved.pageSize)) setPageSize(saved.pageSize) } catch { } }) }, [])
  useEffect(() => { AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ status, pageSize })).catch(() => { }) }, [status, pageSize])
  useEffect(() => { const timer = setTimeout(() => { setPage(1); setAppliedSearch(search.trim()) }, 300); return () => clearTimeout(timer) }, [search])
  const load = useCallback(async () => {
    const version = ++requestVersion.current
    try {
      const options = { status: status === 'ALL' ? undefined : status, search: appliedSearch || undefined, page, pageSize, sortBy, sortDirection }
      const result = portal === 'supplier' ? await getLinks(options) : await getRetailerLinks(options)
      if (version !== requestVersion.current) return
      if (result.total > 0 && result.items.length === 0 && page > 1) { setLinks([]); setSummary(result.summary); setTotal(result.total); setPage(1); return }
      setLinks(result.items); setSummary(result.summary); setTotal(result.total)
    } catch (error: any) { if (version === requestVersion.current) Alert.alert('Unable to load supplier links', error?.message ?? 'Please try again.') }
    finally { if (version === requestVersion.current) { setLoading(false); setRefreshing(false) } }
  }, [appliedSearch, page, pageSize, portal, sortBy, sortDirection, status])
  useEffect(() => { load() }, [load]);
  const runAction = async (link: SupplierLink, action: RelationshipAction) => {
    try {
      const updated = action === 'approve' ? await approveLink(link.id) : action === 'reject' ? await rejectLink(link.id) : action === 'disable' ? await disableLink(link.id) : await reviewSupplierInvitation(link.id, action === 'acceptInvitation' ? 'accept' : 'reject')
      setSelectedLink(updated); await load()
    } catch (error: any) { Alert.alert('Update failed', error?.message ?? 'Please try again.') }
  }
  const canView = portal === 'retailer' || can('supplierLinksPage', 'canView')
  const canEdit = portal === 'supplier' && can('supplierLinksPage', 'canEdit')
  const openLink = (link: SupplierLink) => portal === 'retailer' ? setSupplierProfileLink(link) : setSelectedLink(link)
  const columns = portal === 'supplier'
    ? [{ label: 'Retailer Organization', width: 2.1, sortKey: 'RETAILER_NAME' }, { label: 'Outlet', width: 1.7, sortKey: 'OUTLET_NAME' }, { label: 'Status', width: 1, sortKey: 'STATUS' }, { label: 'Requested', width: 1.1, sortKey: 'REQUESTED_AT' }, { label: 'Reviewed', width: 1.1 }, { label: 'Actions', width: 1.1 }]
    : [{ label: 'Supplier', width: 2.1 }, { label: 'Retailer outlet', width: 1.7, sortKey: 'OUTLET_NAME' }, { label: 'Status', width: 1, sortKey: 'STATUS' }, { label: 'Requested', width: 1.1, sortKey: 'REQUESTED_AT' }, { label: 'Reviewed', width: 1.1 }, { label: 'Actions', width: 1.1 }]
  const sort = (key: string) => { setPage(1); if (sortBy === key) setSortDirection(current => current === 'ASC' ? 'DESC' : 'ASC'); else { setSortBy(key as SupplierLinkSortField); setSortDirection('ASC') } }

  if (!permissionsLoading && !canView) return <PermissionDenied />

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: desktop ? 28 : 16, gap: 18, maxWidth: 1700, width: '100%', alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}>
      <FadeInView>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 28, fontWeight: '800' }}>Supplier Links</Text><Text style={{ color: colors.textSecondary, marginTop: 5, fontSize: 14 }}>{portal === 'supplier' ? 'Manage registered Retailers connected to your Supplier organization.' : 'Connect your Retailer outlets with registered Suppliers.'}</Text></View>
          {portal === 'retailer' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(erp)/purchase-orders' as never)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.sidebarMuted }}><Text style={{ color: colors.primary, fontWeight: '800' }}>Purchase Orders</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={() => setDirectoryVisible(true)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.primary }}><Text style={{ color: '#fff', fontWeight: '800' }}>Connect with Supplier</Text></TouchableOpacity></View> : null}
        </View>
      </FadeInView>
      {loading ? <KpiSkeletonRow count={4} /> : <Kpis items={[
        { title: portal === 'supplier' ? 'Active Retailers' : 'Active Suppliers', value: String(summary.activeRetailers), icon: CheckCircle2, accent: '#059669' },
        { title: 'Pending Requests', value: String(summary.pendingRequests), icon: Clock3, accent: '#D97706' },
        { title: 'Rejected Requests', value: String(summary.rejectedRequests), icon: XCircle, accent: '#DC2626' },
        { title: 'Disabled Links', value: String(summary.disabledLinks), icon: Ban, accent: '#64748B' },
      ]} />}
      <View style={{ gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 10 }}>
            <Search size={16} color={colors.textSecondary} /><TextInput value={search} onChangeText={setSearch} placeholder={portal === 'supplier' ? 'Search Retailer organization or outlet' : 'Search Suppliers'} placeholderTextColor={colors.textSecondary} style={{ color: colors.text, flex: 1, height: 40 }} /></View>
          <TouchableOpacity accessibilityLabel="Refresh supplier links" onPress={load} style={{ padding: 11, borderRadius: 9, backgroundColor: colors.sidebarMuted }}><RefreshCw size={17} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{statuses.map(item => <TouchableOpacity key={item} onPress={() => { setPage(1); setStatus(item) }} style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 99, backgroundColor: status === item ? colors.primary : colors.sidebarMuted }}>
          <Text style={{ color: status === item ? '#fff' : colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{item === 'ALL' ? 'All' : item === 'APPROVED' ? 'Active' : item[0] + item.slice(1).toLowerCase()}</Text>
        </TouchableOpacity>)}</ScrollView>
      </View>
      {!loading ? <ResponsiveDataView
        items={links}
        columns={columns}
        keyExtractor={(link) => link.id}
        useCards={width < 768}
        activeSortKey={sortBy}
        sortDirection={sortDirection}
        onSort={sort}
        onItemPress={openLink}
        renderCells={(link) => [
          <View><Text style={{ color: colors.text, fontWeight: '800' }}>{portal === 'supplier' ? link.retailerOrganization.name : link.supplierName}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{portal === 'supplier' ? link.retailerOrganization.location ?? 'Location unavailable' : link.supplierLocation ?? 'Location unavailable'}</Text></View>,
          <View><Text style={{ color: colors.text }}>{link.outletName}</Text>{portal === 'supplier' ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{link.outletAddress ?? 'Location unavailable'}</Text> : null}</View>,
          <Badge link={link} />,
          <Text style={{ color: colors.textSecondary }}>{date(link.requestedAt)}</Text>,
          <Text style={{ color: colors.textSecondary }}>{date(link.approvedAt ?? link.rejectedAt ?? link.disabledAt)}</Text>,
          <Action link={link} canEdit={canEdit} canReviewInvitation={portal === 'retailer'} retailerMode={portal === 'retailer'} onView={() => openLink(link)} onBrowse={() => router.push(`/(erp)/supplier-links/${link.id}` as never)} onAction={(target, action) => setPendingAction({ link: target, action })} />,
        ]}
        renderCard={(link) => <DataRecordCard title={portal === 'supplier' ? link.retailerOrganization.name : link.supplierName} subtitle={portal === 'supplier' ? link.outletName : link.outletName} status={<Badge link={link} />} fields={[{ label: 'Requested', value: date(link.requestedAt) }, { label: 'Location', value: portal === 'supplier' ? link.outletAddress ?? link.retailerOrganization.location ?? 'Not provided' : link.supplierLocation ?? 'Not provided' }]} actionLabel={portal === 'supplier' ? 'View Retailer' : 'View Supplier'} onPress={() => openLink(link)} />}
        emptyState={total === 0 ? <EmptyState title={status === 'PENDING' ? 'No pending Retailer link requests.' : status === 'APPROVED' ? 'No active Retailer links yet.' : 'No Supplier links found.'} message="Try another status or search term." /> : <Text style={{ color: colors.textSecondary }}>Refreshing relationship results…</Text>}
      /> : null}
      {!loading ? <Pagination page={page} pageSize={pageSize} totalItems={total} pageSizeOptions={[20, 50, 100]} showSummary onPageChange={setPage} onPageSizeChange={(value) => { setPage(1); setPageSize(value) }} /> : null}
      <SupplierLinkDetailsModal visible={Boolean(selectedLink)} link={selectedLink} portal={portal} canEdit={canEdit} onClose={() => setSelectedLink(null)} onOpenCatalog={(link) => { setSelectedLink(null); router.push(`/(erp)/supplier-links/${link.id}` as never) }} onAction={(target, action) => setPendingAction({ link: target, action })} />
      <SupplierBusinessProfileModal visible={supplierProfileLink != null} supplierOrgId={supplierProfileLink?.supplierOrgId ?? null} outletId={supplierProfileLink?.outletId} onClose={() => setSupplierProfileLink(null)} onRequested={load} onBrowseCatalog={(linkId) => { setSupplierProfileLink(null); router.push(`/(erp)/supplier-links/${linkId}` as never) }} />
      <SupplierLinkDirectoryModal visible={directoryVisible} onClose={() => setDirectoryVisible(false)} onRequested={async () => { setDirectoryVisible(false); setStatus('PENDING'); setPage(1); await load() }} />
      <ActionModal visible={Boolean(pendingAction)} title={`${pendingAction?.action === 'approve' || pendingAction?.action === 'acceptInvitation' ? 'Approve' : pendingAction?.action === 'reject' || pendingAction?.action === 'rejectInvitation' ? 'Reject' : 'Disable'} relationship?`} description={pendingAction?.action === 'disable' ? 'Future relationship-dependent actions will be unavailable. Historical orders and messages are not changed.' : `This will update the link request for ${pendingAction?.link.retailerOrganizationName ?? 'this Retailer'}.`} onClose={() => setPendingAction(null)} options={pendingAction ? [{ label: 'Confirm action', destructive: !['approve', 'acceptInvitation'].includes(pendingAction.action), onPress: () => runAction(pendingAction.link, pendingAction.action) }] : []} />
    </ScrollView>)
}

function Badge({ link }: { link: SupplierLink }) { return <View style={{ alignSelf: 'flex-start', backgroundColor: `${statusColor(link.status)}1A`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 }}><Text style={{ color: statusColor(link.status), fontSize: 11, fontWeight: '800' }}>{link.status}</Text></View> }
function Action({ link, canEdit, canReviewInvitation, retailerMode, onView, onBrowse, onAction }: { link: SupplierLink; canEdit: boolean; canReviewInvitation: boolean; retailerMode: boolean; onView: () => void; onBrowse: () => void; onAction: (link: SupplierLink, action: RelationshipAction) => void }) { const supplierReview = canEdit && link.status === 'PENDING' && link.requestDirection === 'RETAILER_TO_SUPPLIER'; const retailerReview = canReviewInvitation && link.status === 'PENDING' && link.requestDirection === 'SUPPLIER_TO_RETAILER'; return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}><TouchableOpacity onPress={onView} accessibilityLabel={retailerMode ? `View ${link.supplierName} Supplier profile` : `View ${link.retailerOrganizationName} Retailer profile`} style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 9 }}><Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 12 }}>{retailerMode ? 'View Supplier' : 'View Retailer'}</Text></TouchableOpacity>{retailerMode && link.status === 'APPROVED' ? <TouchableOpacity onPress={onBrowse} accessibilityLabel={`Browse products from ${link.supplierName}`} style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 9 }}><Text style={{ color: '#059669', fontWeight: '800', fontSize: 12 }}>Browse Products / Order</Text></TouchableOpacity> : null}{supplierReview || retailerReview ? <><TouchableOpacity onPress={() => onAction(link, retailerReview ? 'acceptInvitation' : 'approve')} accessibilityLabel={`Approve ${link.organizationName}`} style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 9 }}><Text style={{ color: '#059669', fontWeight: '800', fontSize: 12 }}>Approve</Text></TouchableOpacity><TouchableOpacity onPress={() => onAction(link, retailerReview ? 'rejectInvitation' : 'reject')} accessibilityLabel={`Reject ${link.organizationName}`} style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 9 }}><Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 12 }}>Reject</Text></TouchableOpacity></> : null}</View> }
