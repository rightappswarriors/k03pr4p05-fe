import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Animated, ActivityIndicator, Modal, useWindowDimensions } from 'react-native'
import { X, LayoutGrid, Package, Activity, LineChart, TrendingUp, BarChart3 } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { InventoryStatusBadge } from './InventoryStatusBadge'
import { InventoryValueBadge } from './InventoryValueBadge'
import { BatchTable } from './BatchTable'
import { BatchCard } from './BatchCard'
import { MovementTimeline } from './MovementTimeline'
import { CostHistoryTimeline } from './CostHistoryTimeline'
import { ForecastCard } from './ForecastCard'
import { InventoryAnalyticsPanel } from './InventoryAnalyticsPanel'
import {
    fetchStockBatches, fetchInventoryMovements, fetchCostHistory, fetchInventoryForecast, fetchInventoryAnalytics,
    type SupplierStockBatch, type SupplierInventoryMovement, type SupplierItemCostHistoryEntry, type InventoryForecast, type InventoryAnalytics,
} from '@/services/supplierService/supplierInventoryService'
import type { InventoryRowData } from './InventoryTable'

const BREAKPOINTS = { tablet: 768, desktop: 1100 }
type TabKey = 'overview' | 'batches' | 'movements' | 'cost' | 'forecast' | 'analytics'
const TABS: Array<{ key: TabKey; label: string; Icon: any }> = [
    { key: 'overview', label: 'Overview', Icon: LayoutGrid },
    { key: 'batches', label: 'Batches', Icon: Package },
    { key: 'movements', label: 'Movements', Icon: Activity },
    { key: 'cost', label: 'Cost History', Icon: LineChart },
    { key: 'forecast', label: 'Forecast', Icon: TrendingUp },
    { key: 'analytics', label: 'Analytics', Icon: BarChart3 },
]

const formatPHP = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)

interface Props {
    item: InventoryRowData | null
    visible: boolean
    onClose: () => void
}

export function InventoryDrawer({ item, visible, onClose }: Props) {
    const { colors } = useTheme()
    const { width } = useWindowDimensions()
    const isDesktop = width >= BREAKPOINTS.desktop
    const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop
    const drawerWidth = isDesktop ? 480 : isTablet ? 380 : width

    const translateX = useRef(new Animated.Value(drawerWidth)).current
    const [tab, setTab] = useState<TabKey>('overview')
    const [loading, setLoading] = useState(false)

    const [batches, setBatches] = useState<SupplierStockBatch[]>([])
    const [movements, setMovements] = useState<SupplierInventoryMovement[]>([])
    const [costHistory, setCostHistory] = useState<SupplierItemCostHistoryEntry[]>([])
    const [forecast, setForecast] = useState<InventoryForecast | null>(null)
    const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null)
    const [loadedTabs, setLoadedTabs] = useState<Set<TabKey>>(new Set())

    useEffect(() => {
        if (visible) {
            setTab('overview')
            setLoadedTabs(new Set())
            Animated.timing(translateX, { toValue: 0, duration: 260, useNativeDriver: true }).start()
        } else {
            Animated.timing(translateX, { toValue: drawerWidth, duration: 220, useNativeDriver: true }).start()
        }
    }, [visible, item?.id])

    const loadTab = async (key: TabKey) => {
        if (!item || loadedTabs.has(key)) return
        setLoading(true)
        try {
            if (key === 'batches') setBatches(await fetchStockBatches(item.id))
            if (key === 'movements') setMovements(await fetchInventoryMovements(item.id))
            if (key === 'cost') setCostHistory(await fetchCostHistory(item.id))
            if (key === 'forecast') setForecast(await fetchInventoryForecast(item.id))
            if (key === 'analytics') setAnalytics(await fetchInventoryAnalytics(item.id))
            setLoadedTabs((prev) => new Set(prev).add(key))
        } catch (e) {
            if (__DEV__) console.error(`InventoryDrawer[${key}] load error`, e)
        } finally {
            setLoading(false)
        }
    }

    const handleTabPress = (key: TabKey) => { setTab(key); loadTab(key) }

    if (!item) return null

    const content = (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }} numberOfLines={1}>{item.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <InventoryStatusBadge item={item} size="sm" />
                        <InventoryValueBadge value={item.inventoryValue} size="sm" />
                    </View>
                </View>
                <TouchableOpacity onPress={onClose} style={{ padding: 6 }}><X size={20} color={colors.text} /></TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 2 }}>
                {TABS.map(({ key, label, Icon }) => {
                    const active = tab === key
                    return (
                        <TouchableOpacity key={key} onPress={() => handleTabPress(key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 9, borderBottomWidth: 2, borderBottomColor: active ? colors.primary : 'transparent' }}>
                            <Icon size={13} color={active ? colors.primary : colors.textSecondary} />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: active ? colors.primary : colors.textSecondary }}>{label}</Text>
                        </TouchableOpacity>
                    )
                })}
            </ScrollView>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
                {tab === 'overview' && (
                    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10 }}>
                        <Row label="Available" value={`${item.availableQty} ${item.unit}`} />
                        <Row label="Reserved" value={`${item.reservedQty} ${item.unit}`} />
                        <Row label="Incoming" value={`${item.incomingQty} ${item.unit}`} />
                        <Row label="Damaged" value={`${item.damagedQty} ${item.unit}`} />
                        <Row label="Returned" value={`${item.returnedQty} ${item.unit}`} />
                        <View style={{ height: 1, backgroundColor: colors.border }} />
                        <Row label="Average Cost" value={item.averageCost > 0 ? formatPHP(item.averageCost) : '—'} />
                        <Row label="Current Selling Price" value={formatPHP(item.unitPrice)} />
                        <Row label="Current Margin" value={item.averageCost > 0 ? `${(((item.unitPrice - item.averageCost) / item.unitPrice) * 100).toFixed(1)}%` : '—'} />
                        <Row label="Inventory Value" value={formatPHP(item.inventoryValue)} />
                        <Row label="Last Updated" value={new Date(item.updatedAt).toLocaleString('en-PH')} />
                    </View>
                )}

                {tab === 'batches' && (loading && !loadedTabs.has('batches') ? <ActivityIndicator color={colors.primary} /> : (
                    isDesktop ? <BatchTable batches={batches} /> : <View style={{ gap: 10 }}>{batches.map((b) => <BatchCard key={b.id} batch={b} />)}</View>
                ))}

                {tab === 'movements' && (loading && !loadedTabs.has('movements') ? <ActivityIndicator color={colors.primary} /> : <MovementTimeline movements={movements} />)}

                {tab === 'cost' && (loading && !loadedTabs.has('cost') ? <ActivityIndicator color={colors.primary} /> : <CostHistoryTimeline entries={costHistory} />)}

                {tab === 'forecast' && (loading && !loadedTabs.has('forecast') ? <ActivityIndicator color={colors.primary} /> : forecast ? <ForecastCard forecast={forecast} /> : null)}

                {tab === 'analytics' && (loading && !loadedTabs.has('analytics') ? <ActivityIndicator color={colors.primary} /> : analytics ? <InventoryAnalyticsPanel analytics={analytics} /> : null)}
            </ScrollView>
        </View>
    )

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} activeOpacity={1} onPress={onClose} />
                <Animated.View style={{ width: drawerWidth, transform: [{ translateX }], shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: -4, height: 0 }, elevation: 12 }}>
                    {content}
                </Animated.View>
            </View>
        </Modal>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    const { colors } = useTheme()
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{value}</Text>
        </View>
    )
}