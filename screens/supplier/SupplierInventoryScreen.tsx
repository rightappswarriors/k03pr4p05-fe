import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, useWindowDimensions, TextInput, TouchableOpacity } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Search, RefreshCcw, LayoutGrid, List, PackageX, PackagePlus } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import {
    fetchSupplierInventoryDashboard, fetchSupplierInventoryList, fetchInventoryValuation,
    type SupplierInventoryDashboard,
} from '@/services/supplierService/supplierInventoryService'
import type { SupplierItem } from '@/services/supplierService/supplierService'
import { InventorySummaryCard } from '@/components/supplier/inventory/InventorySummaryCard'
import { InventoryTable, type InventoryRowData } from '@/components/supplier/inventory/InventoryTable'
import { InventoryCard } from '@/components/supplier/inventory/InventoryCard'
import { InventoryDrawer } from '@/components/supplier/inventory/InventoryDrawer'
import { ReceiveStockModal } from '@/components/supplier/inventory/ReceiveStockModal'
import { CatalogPagination } from '@/components/supplier/catalog/CatalogPagination'
import { KpiSkeletonRow, OrderCardSkeletonList } from '@/components/supplier/LoadingSkeleton'
import { Boxes, Wallet2, PackageCheck, Clock3, AlertTriangle, CalendarClock, Coins, Percent } from 'lucide-react-native'
import { CatalogToolbar } from '@/components/supplier/catalog/CatalogToolbar'
import { getKpiColumns } from './SupplierDashboardScreen'

const BREAKPOINTS = { tablet: 768, desktop: 1100 }
const STORAGE_KEYS = {
    view: 'inventoryView',
    sort: 'inventorySort',
    status: 'inventoryFilters', // filters bundled as one JSON blob per spec's "inventoryFilters"
}

type Layout = 'table' | 'cards'
type StatusFilter = 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
type SortKey = 'UPDATED' | 'VALUE_HIGH' | 'VALUE_LOW' | 'STOCK_LOW' | 'NAME_ASC'

const formatPHP = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)

export default function SupplierInventoryScreen() {
    const { colors } = useTheme()
    const { user } = useAuth()
    const { width } = useWindowDimensions()
    const isTablet = width >= BREAKPOINTS.tablet
    const isDesktop = width >= BREAKPOINTS.desktop
    const horizontalPadding = isDesktop ? 32 : isTablet ? 24 : 16
    const contentMaxWidth = isDesktop ? 1680 : undefined
    const cardColumns = getKpiColumns(width)

    const [dashboard, setDashboard] = useState<SupplierInventoryDashboard | null>(null)
    const [rawItems, setRawItems] = useState<SupplierItem[]>([])
    const [valuationById, setValuationById] = useState<Record<string, { averageCost: number; totalValue: number; batchCount: number }>>({})
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [prefsLoaded, setPrefsLoaded] = useState(false)

    const [search, setSearch] = useState('')
    const [status, setStatus] = useState<StatusFilter>('ALL')
    const [sort, setSort] = useState<SortKey>('UPDATED')
    const [layout, setLayout] = useState<Layout>('cards')

    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const [selectedItem, setSelectedItem] = useState<InventoryRowData | null>(null)
    const [drawerVisible, setDrawerVisible] = useState(false)
    const [receiveTarget, setReceiveTarget] = useState<InventoryRowData | null>(null)
    const [receiveVisible, setReceiveVisible] = useState(false)

    useEffect(() => {
        (async () => {
            try {
                const [savedView, savedSort, savedFilters] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEYS.view),
                    AsyncStorage.getItem(STORAGE_KEYS.sort),
                    AsyncStorage.getItem(STORAGE_KEYS.status),
                ])
                setLayout(savedView === 'table' || savedView === 'cards' ? savedView : width >= BREAKPOINTS.desktop ? 'table' : 'cards')
                if (savedSort) setSort(savedSort as SortKey)
                if (savedFilters) { try { setStatus(JSON.parse(savedFilters).status ?? 'ALL') } catch { } }
            } finally {
                setPrefsLoaded(true)
            }
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const persist = useCallback(async (key: string, value: string) => {
        try { await AsyncStorage.setItem(key, value) } catch (e) { if (__DEV__) console.error(e) }
    }, [])

    const load = useCallback(async () => {
        if (!user?.orgId) return
        try {
            const [dash, items] = await Promise.all([
                fetchSupplierInventoryDashboard(user.orgId),
                fetchSupplierInventoryList(user.orgId),
            ])
            setDashboard(dash)
            setRawItems(items)

            // Valuation per item — batched with Promise.all; fine at catalog-sized
            // lists, move server-side (a single query) if this ever needs to scale
            // past a few hundred SKUs.
            const entries = await Promise.all(
                items.map(async (i) => {
                    const v = await fetchInventoryValuation(i.id)
                    return [i.id, { averageCost: v.averageCost, totalValue: v.totalValue, batchCount: v.batchCount }] as const
                })
            )
            setValuationById(Object.fromEntries(entries))
        } catch (e) {
            if (__DEV__) console.error('SupplierInventoryScreen load error', e)
        } finally {
            setLoading(false)
        }
    }, [user?.orgId])

    useEffect(() => { load() }, [load])
    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

    const rows: InventoryRowData[] = useMemo(
        () => rawItems.map((i) => ({
            ...i,
            averageCost: valuationById[i.id]?.averageCost ?? 0,
            inventoryValue: valuationById[i.id]?.totalValue ?? 0,
            batchCount: valuationById[i.id]?.batchCount ?? 0,
        })),
        [rawItems, valuationById]
    )

    useEffect(() => { setPage(1) }, [search, status, sort])

    const filtered = useMemo(() => {
        let result = rows
        if (status !== 'ALL') {
            result = result.filter((r) => {
                if (status === 'OUT_OF_STOCK') return r.availableQty <= 0
                if (status === 'LOW_STOCK') return r.reorderLevel != null && r.availableQty > 0 && r.availableQty <= r.reorderLevel
                return r.availableQty > 0 && !(r.reorderLevel != null && r.availableQty <= r.reorderLevel)
            })
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase()
            result = result.filter((r) => r.name.toLowerCase().includes(q) || (r.sku ?? '').toLowerCase().includes(q))
        }
        const sorted = [...result]
        switch (sort) {
            case 'UPDATED': sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); break
            case 'VALUE_HIGH': sorted.sort((a, b) => b.inventoryValue - a.inventoryValue); break
            case 'VALUE_LOW': sorted.sort((a, b) => a.inventoryValue - b.inventoryValue); break
            case 'STOCK_LOW': sorted.sort((a, b) => a.availableQty - b.availableQty); break
            case 'NAME_ASC': sorted.sort((a, b) => a.name.localeCompare(b.name)); break
        }
        return sorted
    }, [rows, status, search, sort])

    const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

    const openDrawer = (item: InventoryRowData) => { setSelectedItem(item); setDrawerVisible(true) }
    const openReceive = (item: InventoryRowData) => { setReceiveTarget(item); setReceiveVisible(true) }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingVertical: 16, gap: 20, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: isDesktop ? 26 : 22, fontWeight: '800', color: colors.text }}>Inventory</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>Stock levels, batches, and valuation across your catalog.</Text>
                </View>

                {loading ? (
                    <KpiSkeletonRow count={8} />
                ) : dashboard ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        <View style={{ width: '24.38%', minWidth: 130 }}><InventorySummaryCard  title="Total Inventory" value={dashboard.totalInventory} accent="#3B82F6" icon={Boxes} widthPct="100%" /></View>
                        <View style={{ width: '24.38%', minWidth: 130 }}><InventorySummaryCard  title="Inventory Value" value={formatPHP(dashboard.inventoryValue)} accent="#0EA5E9" icon={Wallet2} widthPct="100%" /></View>
                        <View style={{ width: '24.38%', minWidth: 130 }}><InventorySummaryCard title="Reserved Stock" value={dashboard.reservedStock} accent="#F59E0B" icon={Clock3} widthPct="100%" /></View>
                        <View style={{ width: '24.38%', minWidth: 130 }}><InventorySummaryCard  title="Incoming Stock" value={dashboard.incomingStock} accent="#8B5CF6" icon={PackagePlus} widthPct="100%" /></View>
                        <View style={{ width: '24.38%', minWidth: 130 }}><InventorySummaryCard  title="Low Stock" value={dashboard.lowStockCount} accent="#F59E0B" icon={AlertTriangle} widthPct="100%" /></View>
                        <View style={{ width: '24.38%', minWidth: 130 }}><InventorySummaryCard  title="Out of Stock" value={dashboard.outOfStockCount} accent="#EF4444" icon={PackageX} widthPct="100%" /></View>
                        <View style={{ width: '24.38%', minWidth: 130 }}><InventorySummaryCard  title="Expiring Soon" value={dashboard.expiringSoonCount} accent="#EF4444" icon={CalendarClock} widthPct="100%" /></View>
                        <View style={{ width: '24.38%', minWidth: 130 }}><InventorySummaryCard  title="Avg. Margin" value={dashboard.averageMargin != null ? `${dashboard.averageMargin.toFixed(1)}%` : '—'} accent="#22C55E" icon={Percent} widthPct="100%" /></View>
                    </View>
                ) : null}
                {/* Toolbar — reusing the search/status-chip/layout-toggle pattern from
            CatalogToolbar directly rather than duplicating a near-identical
            component; a dedicated InventoryToolbar would only add a warehouse
            filter + expiry filter on top of this, flagged as a follow-up once
            SupplierWarehouse has UI elsewhere to actually create warehouses. */}
                <View style={{ position: 'relative', zIndex: 50, gap: 10 }}>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        <View style={{ flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 }}>
                            <Search size={16} color={colors.textSecondary} />
                            <TextInput value={search} onChangeText={setSearch} placeholder="Search products, SKU…" placeholderTextColor={colors.textSecondary} style={{ flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 }} />
                        </View>
                        <TouchableOpacity onPress={onRefresh} style={{ padding: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                            <RefreshCcw size={14} color={colors.text} />
                        </TouchableOpacity>
                        {isDesktop && (
                            <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.border }}>
                                <TouchableOpacity onPress={() => { setLayout('table'); persist(STORAGE_KEYS.view, 'table') }} style={{ padding: 8, borderRadius: 8, backgroundColor: layout === 'table' ? colors.primary : 'transparent' }}>
                                    <List size={14} color={layout === 'table' ? '#fff' : colors.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setLayout('cards'); persist(STORAGE_KEYS.view, 'cards') }} style={{ padding: 8, borderRadius: 8, backgroundColor: layout === 'cards' ? colors.primary : 'transparent' }}>
                                    <LayoutGrid size={14} color={layout === 'cards' ? '#fff' : colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        )}
                        {/* TODO: Import / Export / Bulk Actions / Column visibility — no
                backend service for import/export exists yet; bulk actions need
                a defined action set (bulk receive? bulk adjust?) before wiring. */}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as StatusFilter[]).map((s) => (
                            <TouchableOpacity
                                key={s}
                                onPress={() => { setStatus(s); persist(STORAGE_KEYS.status, JSON.stringify({ status: s })) }}
                                style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: status === s ? colors.primary : colors.surface, borderWidth: 1, borderColor: status === s ? colors.primary : colors.border }}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '600', color: status === s ? '#fff' : colors.textSecondary }}>
                                    {s === 'ALL' ? 'All' : s === 'IN_STOCK' ? 'In Stock' : s === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={{ position: 'relative', zIndex: 1 }}>
                    {loading || !prefsLoaded ? (
                        <OrderCardSkeletonList />
                    ) : filtered.length === 0 ? (
                        <View style={{ alignItems: 'center', padding: 48, gap: 8, backgroundColor: colors.surface, borderRadius: 14 }}>
                            <PackageX size={32} color={colors.textSecondary} />
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>No inventory items match</Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>Try adjusting your search or filters.</Text>
                        </View>
                    ) : (
                        <>
                            {isDesktop && layout === 'table' ? (
                                <InventoryTable items={paginated} onView={openDrawer} onReceive={openReceive} onAdjust={openDrawer} />
                            ) : (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                    {paginated.map((item) => (
                                        <View key={item.id} style={{ width: cardColumns > 1 ? `${100 / cardColumns - 1.5}%` : '100%' }}>
                                            <InventoryCard item={item} onView={() => openDrawer(item)} onReceive={() => openReceive(item)} onAdjust={() => openDrawer(item)} onHistory={() => openDrawer(item)} />
                                        </View>
                                    ))}
                                </View>
                            )}
                            <CatalogPagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1) }} />
                        </>
                    )}
                </View>
            </ScrollView>

            <InventoryDrawer item={selectedItem} visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
            <ReceiveStockModal item={receiveTarget} visible={receiveVisible} onClose={() => setReceiveVisible(false)} onReceived={load} />
        </View>
    )
}