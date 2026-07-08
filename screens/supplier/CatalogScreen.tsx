import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, useWindowDimensions } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Package, PackageX, Star, Eye, AlertTriangle, MessageSquare } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { fetchOrCreateCatalog, type SupplierItem, type SupplierCatalog } from '@/services/supplierService/supplierService'
import { CatalogSummaryCard } from '@/components/supplier/catalog/CatalogSummaryCard'
import { CatalogToolbar, type CatalogStatusFilter, type CatalogSort, type CatalogLayout } from '@/components/supplier/catalog/CatalogToolbar'
import { CatalogTable } from '@/components/supplier/catalog/CatalogTable'
import { CatalogCards } from '@/components/supplier/catalog/CatalogCards'
import { ProductDetailsModal } from '@/components/supplier/catalog/ProductsDetailModal'
import { getProductStatus } from '@/components/supplier/catalog/ProductStatusBadge'
import { KpiSkeletonRow, OrderCardSkeletonList } from '@/components/supplier/LoadingSkeleton'
import { AddSupplierItemModal } from '@/components/supplier/catalog/AddSupplierItemModal'
import { CatalogPagination } from '@/components/supplier/catalog/CatalogPagination'


const BREAKPOINTS = { tablet: 768, desktop: 1100 }

const STORAGE_KEYS = {
  layout: 'supplierCatalogLayout',
  status: 'supplierCatalogStatus',
  rating: 'supplierCatalogRating',
  sort: 'supplierCatalogSort',
}

const formatPHP = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

interface CatalogScreenProps {
  onAddItem?: (catalogId: string) => void
}

export default function CatalogScreen({ onAddItem }: CatalogScreenProps) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { width } = useWindowDimensions()
  const isTablet = width >= BREAKPOINTS.tablet
  const isDesktop = width >= BREAKPOINTS.desktop
  const horizontalPadding = isDesktop ? 32 : isTablet ? 24 : 16
  const contentMaxWidth = isDesktop ? 1680 : undefined
  const cardColumns = isDesktop ? 3 : isTablet ? 2 : 1

  const [catalog, setCatalog] = useState<SupplierCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CatalogStatusFilter>('ALL')
  const [minRating, setMinRating] = useState(0)
  const [sort, setSort] = useState<CatalogSort>('NEWEST')
  const [layout, setLayout] = useState<CatalogLayout>('cards')

  const [selectedItem, setSelectedItem] = useState<SupplierItem | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalEditMode, setModalEditMode] = useState(false)


  useEffect(() => {
    (async () => {
      try {
        const [savedLayout, savedStatus, savedRating, savedSort] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.layout),
          AsyncStorage.getItem(STORAGE_KEYS.status),
          AsyncStorage.getItem(STORAGE_KEYS.rating),
          AsyncStorage.getItem(STORAGE_KEYS.sort),
        ])
        setLayout(savedLayout === 'table' || savedLayout === 'cards' ? savedLayout : width >= BREAKPOINTS.desktop ? 'table' : 'cards')
        if (savedStatus) setStatus(savedStatus as CatalogStatusFilter)
        if (savedRating) setMinRating(Number(savedRating))
        if (savedSort) setSort(savedSort as CatalogSort)
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
      const data = await fetchOrCreateCatalog(user.orgId)
      setCatalog(data)
    } catch (e) {
      if (__DEV__) console.error('supplierCatalog error', e)
    } finally {
      setLoading(false)
    }
  }, [user?.orgId])

  useEffect(() => { load() }, [load])
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  const items = catalog?.items ?? []

  const kpis = useMemo(() => {
    const active = items.filter((i) => getProductStatus(i) === 'ACTIVE').length
    const outOfStock = items.filter((i) => getProductStatus(i) === 'OUT_OF_STOCK').length
    const lowStock = items.filter((i) => getProductStatus(i) === 'LOW_STOCK').length
    const totalReviews = items.reduce((sum, i) => sum + i.reviewCount, 0)
    const ratedItems = items.filter((i) => i.reviewCount > 0)
    const avgRating = ratedItems.length > 0 ? ratedItems.reduce((s, i) => s + i.averageRating, 0) / ratedItems.length : 0
    return { active, outOfStock, lowStock, totalReviews, avgRating }
  }, [items])

  const filtered = useMemo(() => {
    let result = items
    if (status !== 'ALL') result = result.filter((i) => getProductStatus(i) === status)
    if (minRating > 0) result = result.filter((i) => i.averageRating >= minRating)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((i) => i.name.toLowerCase().includes(q) || (i.sku ?? '').toLowerCase().includes(q))
    }
    const sorted = [...result]
    switch (sort) {
      case 'NEWEST': sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break
      case 'OLDEST': sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break
      case 'NAME_ASC': sorted.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'PRICE_HIGH': sorted.sort((a, b) => b.unitPrice - a.unitPrice); break
      case 'PRICE_LOW': sorted.sort((a, b) => a.unitPrice - b.unitPrice); break
      case 'RATING': sorted.sort((a, b) => b.averageRating - a.averageRating); break
      case 'STOCK_LOW': sorted.sort((a, b) => a.availableQty - b.availableQty); break
    }
    return sorted
  }, [items, status, minRating, search, sort])

  const openView = (item: SupplierItem) => { setSelectedItem(item); setModalEditMode(false); setModalVisible(true) }
  const openEdit = (item: SupplierItem) => { setSelectedItem(item); setModalEditMode(true); setModalVisible(true) }
  useEffect(() => { setPage(1) }, [search, status, minRating, sort])

  // Slice for display:
  const paginatedItems = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  )
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingVertical: 16, gap: 20, width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: isDesktop ? 26 : 22, fontWeight: '800', color: colors.text }}>Catalog</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Manage your products, pricing, inventory and product performance.</Text>
        </View>

        {loading ? (
          <KpiSkeletonRow count={6} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ width: '16%', minWidth: 130 }}>
              <CatalogSummaryCard title="Active Products" value={kpis.active} subtitle={`of ${items.length} total`} accent="#3B82F6" icon={Package} widthPct="100%" />
            </View>
            <View style={{ width: '16%', minWidth: 130 }}>
              <CatalogSummaryCard title="Out of Stock" value={kpis.outOfStock} subtitle={kpis.outOfStock > 0 ? 'Needs attention' : 'All good'} accent="#EF4444" icon={PackageX} widthPct="100%" />
            </View>
            <View style={{ width: '16%', minWidth: 130 }}>
              <CatalogSummaryCard title="Low Stock" value={kpis.lowStock} subtitle="Restock soon" accent="#F59E0B" icon={AlertTriangle} widthPct="100%" />
            </View>
            <View style={{ width: '16%', minWidth: 130 }}>
              <CatalogSummaryCard title="Average Rating" value={kpis.avgRating > 0 ? kpis.avgRating.toFixed(1) : '—'} subtitle={`${kpis.totalReviews} reviews`} accent="#22C55E" icon={Star} widthPct="100%" />
            </View>
            <View style={{ width: '16%', minWidth: 130 }}>
              <CatalogSummaryCard title="Total Reviews" value={kpis.totalReviews} subtitle="Across all products" accent="#8B5CF6" icon={MessageSquare} widthPct="100%" />
            </View>
            {/* TODO(backend): no view-tracking exists — placeholder, not fabricated data */}
            <View style={{ width: '16%', minWidth: 130 }}>
              <CatalogSummaryCard title="Catalog Views" value="—" subtitle="Coming soon" accent="#EC4899" icon={Eye} widthPct="100%" />
            </View>
          </View>
        )}
        <View style={{ position: 'relative', zIndex: 50 }}>
          <CatalogToolbar
            search={search} onSearchChange={setSearch}
            status={status} onStatusChange={(v) => { setStatus(v); persist(STORAGE_KEYS.status, v) }}
            minRating={minRating} onMinRatingChange={(v) => { setMinRating(v); persist(STORAGE_KEYS.rating, String(v)) }}
            sort={sort} onSortChange={(v) => { setSort(v); persist(STORAGE_KEYS.sort, v) }}
            layout={layout} onLayoutChange={(v) => { setLayout(v); persist(STORAGE_KEYS.layout, v) }}
            showLayoutToggle={isDesktop}
            onRefresh={onRefresh}
            onAddItem={() => setAddModalVisible(true)}
          />
        </View>
        <View style={{ position: 'relative', zIndex: 1 }}>
          {loading || !prefsLoaded ? (
            <OrderCardSkeletonList />
          ) : filtered.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 48, gap: 8, backgroundColor: colors.surface, borderRadius: 14 }}>
              <Package size={32} color={colors.textSecondary} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {search || status !== 'ALL' || minRating > 0 ? 'No matching products' : 'No products yet'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
                {search || status !== 'ALL' || minRating > 0
                  ? 'Try adjusting your filters.'
                  : 'Add your first product to start receiving purchase orders and mandate offers.'}
              </Text>
            </View>
          ) : (
            <>
              {isDesktop && layout === 'table' ? (
                <CatalogTable items={paginatedItems} onView={openView} onEdit={openEdit} />
              ) : (
                <CatalogCards items={paginatedItems} columns={cardColumns} onView={openView} onEdit={openEdit} />
              )}
              <CatalogPagination
                page={page}
                pageSize={pageSize}
                totalItems={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
              />
            </>
          )}
        </View>
      </ScrollView>

      <ProductDetailsModal
        item={selectedItem}
        visible={modalVisible}
        startInEditMode={modalEditMode}
        onClose={() => setModalVisible(false)}
        onUpdated={(updated) => {
          setCatalog((prev) => prev ? { ...prev, items: prev.items.map((i) => (i.id === updated.id ? updated : i)) } : prev)
          setSelectedItem(updated)
        }}
      />
      <AddSupplierItemModal
        visible={addModalVisible}
        catalogId={catalog?.id ?? ''}
        onClose={() => setAddModalVisible(false)}
        onCreated={(created) => {
          setCatalog((prev) => prev ? { ...prev, items: [created, ...prev.items] } : prev)
        }}
      />
    </View>
  )
}