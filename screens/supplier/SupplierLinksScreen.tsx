import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Activity, ChevronRight, Grid2X2, Link2, List, MessageSquare, PauseCircle, RefreshCw, Search, ShoppingCart, WalletCards } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { DataTable, EmptyState } from '@/components/DataTable'
import { KpiSkeletonRow } from '@/components/LoadingSkeleton'
import { FadeInView } from '@/components/FadeInView'
import { getLinks, getRetailerLinks, updateLink, type SupplierLink, type SupplierLinkStatus } from '@/services/supplierLinkService'

const STORAGE_KEY = 'supplierLinksWorkspacePreferences'

const statuses: Array<SupplierLinkStatus | 'ALL'> = ['ALL', 'ACTIVE', 'REQUESTED', 'PENDING', 'ACCEPTED', 'PAUSED', 'BLOCKED', 'ARCHIVED']
const peso = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'No activity'
const statusColor = (status: SupplierLinkStatus) => ({ ACTIVE: '#059669', ACCEPTED: '#2563EB', REQUESTED: '#D97706', PENDING: '#9333EA', PAUSED: '#64748B', BLOCKED: '#DC2626', ARCHIVED: '#64748B', SUGGESTED: '#0F766E' }[status])


export default function SupplierLinksScreen({ portal = 'supplier' }: { portal?: 'supplier' | 'retailer' }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const router = useRouter()
  const desktop = width >= 1024
  const [links, setLinks] = useState<SupplierLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false)
  const [view, setView] = useState<'table' | 'cards'>(desktop ? 'table' : 'cards');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SupplierLinkStatus | 'ALL'>('ALL')
  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then(raw => { if (!raw) return; try { const saved = JSON.parse(raw); if (saved.view) setView(saved.view); if (saved.status) setStatus(saved.status) } catch { } }) }, [])
  useEffect(() => { AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ view, status })).catch(() => { }) }, [view, status])
  const load = useCallback(async () => { try { setLinks(portal === 'supplier' ? await getLinks(status === 'ALL' ? undefined : status) : await getRetailerLinks()) } catch (error: any) { Alert.alert('Unable to load supplier links', error?.message ?? 'Please try again.') } finally { setLoading(false); setRefreshing(false) } }, [portal, status])
  useEffect(() => { load() }, [load]);
  const filtered = useMemo(() => links.filter(link => link.organizationName.toLowerCase().includes(search.toLowerCase()) || link.assignedAgentName?.toLowerCase().includes(search.toLowerCase())), [links, search])
  const kpis = useMemo(() => ({ linked: links.filter(x => x.status === 'ACTIVE').length, pending: links.filter(x => ['REQUESTED', 'PENDING'].includes(x.status)).length, unread: links.reduce((n, x) => n + x.unreadMessages, 0), revenue: links.reduce((n, x) => n + x.revenue, 0), mandates: links.reduce((n, x) => n + x.openMandates, 0) }), [links])
  const changeStatus = async (link: SupplierLink, next: SupplierLinkStatus) => {
    try {
      const updated = await updateLink(link.id, next); setLinks(current => current.map(item => item.id === updated.id ? updated : item))
    } catch (error: any) { Alert.alert('Update failed', error?.message ?? 'Please try again.') }
  }
  const cards = [{ label: 'Linked retailers', value: kpis.linked, icon: Link2, tint: '#2563EB' }, { label: 'Pending requests', value: kpis.pending, icon: Activity, tint: '#D97706' }, { label: 'Unread conversations', value: kpis.unread, icon: MessageSquare, tint: '#9333EA' }, { label: 'Open mandates', value: kpis.mandates, icon: ShoppingCart, tint: '#0F766E' }, { label: 'Revenue this month', value: peso(kpis.revenue), icon: WalletCards, tint: '#059669' }]
  const columns = [{ label: 'Retailer', width: 2.1 }, { label: 'Relationship', width: 1.1 }, { label: 'Agent', width: 1.1 }, { label: 'Revenue', width: 1, align: 'right' as const }, { label: 'Orders', width: .65, align: 'right' as const }, { label: 'Outstanding', width: 1, align: 'right' as const }, { label: 'Last activity', width: 1.05 }, { label: '', width: .6, align: 'right' as const }]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: desktop ? 28 : 16, gap: 18, maxWidth: 1700, width: '100%', alignSelf: 'center' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}>
      <FadeInView>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800' }}>Supplier Links</Text><Text style={{ color: colors.textSecondary, marginTop: 5, fontSize: 14 }}>{portal === 'supplier' ? 'Your relationship workspace for every connected retailer.' : 'Your relationship workspace for every connected supplier.'}</Text></FadeInView>
      {loading ? <KpiSkeletonRow count={5} /> :
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{cards.map(card => {
          const Icon = card.icon;
          return <View key={card.label} style={{ minWidth: 160, flexGrow: 1, flexBasis: desktop ? '18%' : '45%', padding: 15, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}><Icon size={18} color={card.tint} /><Text style={{ color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 12 }}>{card.value}</Text><Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }}>{card.label}</Text></View>
        })}</View>}
      <View style={{ gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 10 }}>
            <Search size={16} color={colors.textSecondary} /><TextInput value={search} onChangeText={setSearch} placeholder="Search retailers or agents" placeholderTextColor={colors.textSecondary} style={{ color: colors.text, flex: 1, height: 40 }} /></View>
          <TouchableOpacity accessibilityLabel="Refresh supplier links" onPress={load} style={{ padding: 11, borderRadius: 9, backgroundColor: colors.sidebarMuted }}><RefreshCw size={17} color={colors.text} />
          </TouchableOpacity>{desktop && <TouchableOpacity onPress={() => setView(view === 'table' ? 'cards' : 'table')} style={{ padding: 11, borderRadius: 9, backgroundColor: colors.sidebarMuted }}>{view === 'table' ? <Grid2X2 size={17} color={colors.text} /> : <List size={17} color={colors.text} />}
          </TouchableOpacity>}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{statuses.map(item => <TouchableOpacity key={item} onPress={() => setStatus(item)} style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 99, backgroundColor: status === item ? colors.primary : colors.sidebarMuted }}>
            <Text style={{ color: status === item ? '#fff' : colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{item === 'ALL' ? 'All relationships' : item}</Text></TouchableOpacity>)}</ScrollView></View>
      {loading ? null : desktop && view === 'table' ?
        <DataTable columns={columns} rows={filtered.map(link => ({
          key: link.id, cells: [
            <Text style={{ color: colors.text, fontWeight: '700' }}>{link.organizationName}</Text>,
            <Badge link={link} />, <Text style={{ color: colors.textSecondary }}>{link.assignedAgentName ?? 'Unassigned'}</Text>,
            <Text style={{ color: colors.text, fontWeight: '700' }}>{peso(link.revenue)}</Text>,
            <Text style={{ color: colors.text }}>{link.orders}</Text>, <Text style={{ color: link.outstanding ? colors.error : colors.text }}>{peso(link.outstanding)}</Text>, <Text style={{ color: colors.textSecondary }}>{date(link.lastActivity)}</Text>, <Action link={link} onPause={() => changeStatus(link, link.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED')} onOpen={() => router.push((portal === 'supplier' ? '/(supplier)/supplier-links/' : '/(erp)/supplier-links/') + link.id as any)} />]
        }))} emptyState={<EmptyState title="No supplier links found" message="Adjust your filters or invite a retailer organization to collaborate." />} /> : <View style={{ gap: 10 }}>{filtered.length ? filtered.map(link => <LinkCard key={link.id} link={link} colors={colors} portal={portal} onPause={() => changeStatus(link, link.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED')} />) : <EmptyState title="No supplier links found" message="Adjust your filters or invite a retailer organization to collaborate." />}</View>}
    </ScrollView>)
}

function Badge({ link }: { link: SupplierLink }) { return <View style={{ alignSelf: 'flex-start', backgroundColor: `${statusColor(link.status)}1A`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 }}><Text style={{ color: statusColor(link.status), fontSize: 11, fontWeight: '800' }}>{link.status}</Text></View> }
function Action({ link, onPause, onOpen }: { link: SupplierLink; onPause: () => void; onOpen: () => void }) { return <View style={{ flexDirection: 'row', gap: 10 }}><TouchableOpacity onPress={onPause} accessibilityLabel={`Toggle ${link.organizationName} relationship pause`}><PauseCircle size={19} color={link.status === 'PAUSED' ? '#059669' : '#64748B'} /></TouchableOpacity><TouchableOpacity onPress={onOpen} accessibilityLabel={`Open ${link.organizationName} workspace`}><ChevronRight size={19} color="#2563EB" /></TouchableOpacity></View> }
function LinkCard({ link, colors, portal, onPause }: { link: SupplierLink; colors: any; portal: 'supplier' | 'retailer'; onPause: () => void }) { const router = useRouter(); return <FadeInView><View style={{ padding: 16, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 13 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><View><Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{link.organizationName}</Text><Text style={{ color: colors.textSecondary, marginTop: 3, fontSize: 12 }}>{link.assignedAgentName ?? 'No sales agent assigned'}</Text></View><Badge link={link} /></View><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}><Metric label="Revenue" value={peso(link.revenue)} colors={colors} /><Metric label="Orders" value={String(link.orders)} colors={colors} /><Metric label="Outstanding" value={peso(link.outstanding)} colors={colors} /><Metric label="Unread" value={String(link.unreadMessages)} colors={colors} /></View><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Last activity: {date(link.lastActivity)}</Text><View style={{ flexDirection: 'row', gap: 8 }}><TouchableOpacity onPress={onPause} style={{ padding: 9, backgroundColor: colors.sidebarMuted, borderRadius: 8 }}><PauseCircle size={17} color={colors.text} /></TouchableOpacity><TouchableOpacity onPress={() => router.push(((portal === 'supplier' ? '/(supplier)/supplier-links/' : '/(erp)/supplier-links/') + link.id) as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, backgroundColor: colors.primary, borderRadius: 8 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Open</Text><ChevronRight size={15} color="#fff" /></TouchableOpacity></View></View></View></FadeInView> }
function Metric({ label, value, colors }: { label: string; value: string; colors: any }) { return <View><Text style={{ color: colors.text, fontWeight: '800' }}>{value}</Text><Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{label}</Text></View> }
