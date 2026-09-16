import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { ArrowLeft, Minus, Plus, Search, ShoppingCart, X } from 'lucide-react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { EmptyState } from '@/components/DataTable'
import { SuccessModal } from '@/components/SuccessModal'
import { Pagination } from '@/components/supplier/catalog/CatalogPagination'
import { ProductDetailsModal } from '@/components/supplier/catalog/ProductsDetailModal'
import { DataRecordCard, ResponsiveDataView } from '@/components/ResponsiveDataView'
import { SkeletonBox } from '@/components/LoadingSkeleton'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import type { SupplierItem } from '@/types'
import {
  createRetailerPurchaseOrder,
  getRetailerSupplierCatalog,
  quoteRetailerOrderLine,
  type RetailerCatalogItem,
  type RetailerCatalogVariant,
  type RetailerOrderLineQuote,
  type RetailerSupplierCatalogPage,
} from '@/services/retailerOrderingService'

type CartLine = { item: RetailerCatalogItem; variant?: RetailerCatalogVariant; quote: RetailerOrderLineQuote }
const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)

export default function RetailerSupplierCatalogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const toast = useToast()
  const { width } = useWindowDimensions()
  const [catalog, setCatalog] = useState<RetailerSupplierCatalogPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<RetailerCatalogItem | null>(null)
  const [detailItem, setDetailItem] = useState<RetailerCatalogItem | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [reviewing, setReviewing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittedPo, setSubmittedPo] = useState<{ id: string; poNumber: string } | null>(null)
  const requestId = useRef(`erp-${Date.now()}-${Math.random().toString(36).slice(2)}`)

  useEffect(() => { const timer = setTimeout(() => { setPage(1); setAppliedSearch(search.trim()) }, 300); return () => clearTimeout(timer) }, [search])
  const load = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setCatalog(await getRetailerSupplierCatalog({ linkId: id, search: appliedSearch || undefined, page, pageSize: 20 }))
    } catch (error: any) {
      Alert.alert('Unable to open Supplier', error?.message ?? 'The relationship or catalog is no longer available.')
    } finally { setLoading(false) }
  }, [appliedSearch, id, page])
  useEffect(() => { load() }, [load])

  const addLine = (line: CartLine) => {
    setCart((current) => {
      const identity = `${line.item.id}:${line.variant?.id ?? ''}`
      const withoutExisting = current.filter((candidate) => `${candidate.item.id}:${candidate.variant?.id ?? ''}` !== identity)
      return [...withoutExisting, line]
    })
    setSelected(null)
    toast.show(`${line.variant?.name ?? line.item.name} added to this Supplier order.`, 'success')
  }
  const orderTotal = useMemo(() => cart.reduce((sum, line) => sum + line.quote.totalAmount, 0), [cart])
  const submit = async () => {
    if (!id || !cart.length) return
    try {
      setSubmitting(true)
      const po = await createRetailerPurchaseOrder({
        linkId: id,
        requestId: requestId.current,
        lineItems: cart.map((line) => ({ supplierItemId: line.item.id, supplierItemVariantId: line.variant?.id, qty: line.quote.qty })),
      })
      toast.show(`Purchase Order ${po.poNumber} submitted for Supplier review.`, 'success')
      setCart([])
      setReviewing(false)
      requestId.current = `erp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      setSubmittedPo({ id: po.id, poNumber: po.poNumber })
    } catch (error: any) {
      Alert.alert('Order not submitted', error?.message ?? 'Review the products and try again.')
    } finally { setSubmitting(false) }
  }

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={{ padding: width >= 1024 ? 28 : 16, gap: 16, maxWidth: 1500, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity accessibilityLabel="Back to Supplier Links" onPress={() => router.back()} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.sidebarMuted }}><ArrowLeft size={18} color={colors.text} /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 25, fontWeight: '900' }}>{catalog?.supplierName ?? 'Supplier catalog'}</Text><Text style={{ color: colors.textSecondary, marginTop: 3 }}>{catalog ? `${catalog.outletName} · ${catalog.supplierLocation ?? 'Location not provided'}` : 'Loading approved Supplier catalog…'}</Text></View>
        <TouchableOpacity accessibilityLabel={`Review cart with ${cart.length} lines`} disabled={!cart.length} onPress={() => setReviewing(true)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 10, backgroundColor: cart.length ? colors.primary : colors.sidebarMuted }}><ShoppingCart size={17} color={cart.length ? '#fff' : colors.textSecondary} /><Text style={{ color: cart.length ? '#fff' : colors.textSecondary, fontWeight: '900' }}>Review ({cart.length})</Text></TouchableOpacity>
      </View>
      {catalog?.supplierDescription ? <Text style={{ color: colors.textSecondary }}>{catalog.supplierDescription}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 11, backgroundColor: colors.card }}><Search size={16} color={colors.textSecondary} /><TextInput value={search} onChangeText={setSearch} placeholder="Search Supplier products or SKU" placeholderTextColor={colors.textSecondary} style={{ flex: 1, height: 44, color: colors.text }} /></View>
      {loading ? <View style={{ gap: 10 }}><SkeletonBox style={{ height: 105 }} /><SkeletonBox style={{ height: 105 }} /></View> : catalog ? <>
        <ResponsiveDataView
          items={catalog.items}
          columns={[{ label: 'Product', width: 2.2 }, { label: 'SKU', width: 1 }, { label: 'MOQ', width: .8 }, { label: 'Available', width: .9 }, { label: 'Price from', width: 1 }, { label: 'Action', width: .8 }]}
          keyExtractor={(item) => item.id}
          useCards={width < 768}
          onItemPress={(item) => setDetailItem(item)}
          renderCells={(item) => [<View><Text style={{ color: colors.text, fontWeight: '800' }}>{item.name}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.variants.length ? `${item.variants.length} orderable variants` : item.unit}</Text></View>, <Text style={{ color: colors.textSecondary }}>{item.sku ?? '—'}</Text>, <Text style={{ color: colors.text }}>{item.moq} {item.unit}</Text>, <Text style={{ color: colors.text }}>{item.variants.length ? item.variants.reduce((sum, variant) => sum + variant.availableQty, 0) : item.availableQty}</Text>, <Text style={{ color: colors.text, fontWeight: '800' }}>{money(Math.min(item.unitPrice, ...item.priceTiers.map((tier) => tier.price), ...item.variants.flatMap((variant) => [variant.price, ...variant.priceTiers.map((tier) => tier.price)]).filter((value) => value > 0)))}</Text>, <TouchableOpacity onPress={() => setSelected(item)} style={{ minHeight: 38, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '900' }}>Choose</Text></TouchableOpacity>]}
          renderCard={(item) => <DataRecordCard title={item.name} subtitle={item.sku ?? item.unit} fields={[{ label: 'Minimum order', value: `${item.moq} ${item.unit}` }, { label: 'Available', value: String(item.variants.length ? item.variants.reduce((sum, variant) => sum + variant.availableQty, 0) : item.availableQty) }, { label: 'Variants', value: String(item.variants.length) }]} actionLabel="View product" onPress={() => setDetailItem(item)} />}
          emptyState={<EmptyState title="No orderable products found." message="This Supplier may not have published active products matching your search." />}
        />
        <Pagination page={page} pageSize={20} totalItems={catalog.total} pageSizeOptions={[20]} showSummary onPageChange={setPage} onPageSizeChange={() => {}} />
      </> : <EmptyState title="Supplier catalog unavailable" message="The link may no longer be approved." />}
    </ScrollView>
    <ChooseProductModal visible={Boolean(selected)} item={selected} linkId={id} onClose={() => setSelected(null)} onAdd={addLine} />
    <ProductDetailsModal item={detailItem ? ({ ...detailItem, supplierItemImage: [], wholesalePackaging: null, wholesaleShipping: null, wholesaleDocument: [], productSpecifications: [], productWholesaleSettings: null, updatedAt: new Date().toISOString() } as unknown as SupplierItem) : null} visible={Boolean(detailItem)} buyerMode canEdit={false} canDelete={false} onClose={() => setDetailItem(null)} onUpdated={() => {}} />
    <SuccessModal visible={Boolean(submittedPo)} title="Purchase Order Submitted" message={submittedPo ? `${submittedPo.poNumber} has been sent to ${catalog?.supplierName ?? 'the Supplier'} for confirmation.` : ''} confirmLabel="View Purchase Order" onClose={() => { const poId = submittedPo?.id; setSubmittedPo(null); if (poId) router.push(`/(erp)/supplier-links/orders/${poId}` as never) }} />
    <Modal transparent visible={reviewing} animationType="fade" onRequestClose={() => setReviewing(false)}><Pressable onPress={() => setReviewing(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.55)', justifyContent: width < 600 ? 'flex-end' : 'center', alignItems: 'center' }}><Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, width: '100%', maxWidth: 680, maxHeight: '90%', borderRadius: width < 600 ? 0 : 18, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: '900' }}>Review Purchase Order</Text><Text style={{ color: colors.textSecondary }}>{catalog?.supplierName} · {catalog?.outletName}</Text></View><TouchableOpacity onPress={() => setReviewing(false)}><X size={20} color={colors.text} /></TouchableOpacity></View>
      <ScrollView contentContainerStyle={{ gap: 10 }}>{cart.map((line) => <View key={`${line.item.id}:${line.variant?.id ?? ''}`} style={{ padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '800' }}>{line.item.name}</Text><Text style={{ color: colors.textSecondary, fontSize: 12 }}>{line.variant?.name ?? 'Base item'} · {line.quote.qty} {line.quote.unit} × {money(line.quote.unitPrice)}</Text></View><TouchableOpacity onPress={() => setCart((current) => current.filter((candidate) => candidate !== line))}><Text style={{ color: colors.error, fontWeight: '800' }}>Remove</Text></TouchableOpacity></View><Text style={{ color: colors.text, textAlign: 'right', marginTop: 6, fontWeight: '900' }}>{money(line.quote.totalAmount)}</Text></View>)}</ScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.text, fontWeight: '800' }}>Estimated total</Text><Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{money(orderTotal)}</Text></View>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Prices, MOQ, availability, VAT, and totals are recalculated by the server when you submit.</Text>
      <TouchableOpacity disabled={submitting || !cart.length} onPress={submit} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primary, opacity: submitting ? .6 : 1 }}><Text style={{ color: '#fff', fontWeight: '900' }}>{submitting ? 'Submitting…' : 'Submit for Supplier Confirmation'}</Text></TouchableOpacity>
    </Pressable></Pressable></Modal>
  </View>
}

function ChooseProductModal({ visible, item, linkId, onClose, onAdd }: { visible: boolean; item: RetailerCatalogItem | null; linkId?: string; onClose: () => void; onAdd: (line: CartLine) => void }) {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const [variantId, setVariantId] = useState<string | undefined>()
  const [quantity, setQuantity] = useState(1)
  const [quoting, setQuoting] = useState(false)
  useEffect(() => { if (item) { setVariantId(item.variants[0]?.id); setQuantity(item.moq) } }, [item])
  if (!item) return null
  const variant = item.variants.find((candidate) => candidate.id === variantId)
  const available = variant?.availableQty ?? item.availableQty
  const quote = async () => {
    if (!linkId) return
    try {
      setQuoting(true)
      const priced = await quoteRetailerOrderLine({ linkId, supplierItemId: item.id, supplierItemVariantId: variant?.id, qty: quantity })
      onAdd({ item, variant, quote: priced })
    } catch (error: any) { Alert.alert('Product cannot be added', error?.message ?? 'Check the quantity and try again.') }
    finally { setQuoting(false) }
  }
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.55)', justifyContent: width < 600 ? 'flex-end' : 'center', alignItems: 'center' }}><Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 600, maxHeight: '90%', padding: 18, gap: 14, borderRadius: width < 600 ? 0 : 18, backgroundColor: colors.surface }}>
    <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>{item.name}</Text><Text style={{ color: colors.textSecondary }}>Minimum order: {item.moq} {item.unit}</Text></View><TouchableOpacity onPress={onClose}><X size={20} color={colors.text} /></TouchableOpacity></View>
    {item.variants.length ? <View><Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '800', marginBottom: 7 }}>EXACT VARIANT</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{item.variants.map((candidate) => <TouchableOpacity key={candidate.id} onPress={() => setVariantId(candidate.id)} style={{ borderWidth: 1, borderColor: variantId === candidate.id ? colors.primary : colors.border, backgroundColor: variantId === candidate.id ? `${colors.primary}18` : colors.background, padding: 11, borderRadius: 9 }}><Text style={{ color: colors.text, fontWeight: '800' }}>{candidate.name}</Text><Text style={{ color: colors.textSecondary, fontSize: 11 }}>{candidate.sku ?? 'No SKU'} · {candidate.availableQty} available</Text></TouchableOpacity>)}</ScrollView></View> : null}
    <View><Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '800', marginBottom: 7 }}>QUANTITY ({item.unit})</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><TouchableOpacity disabled={quantity <= item.moq} onPress={() => setQuantity((value) => Math.max(item.moq, value - 1))} style={{ width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sidebarMuted }}><Minus size={17} color={colors.text} /></TouchableOpacity><TextInput keyboardType="number-pad" value={String(quantity)} onChangeText={(value) => setQuantity(Math.max(0, Number.parseInt(value, 10) || 0))} style={{ width: 100, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 10, color: colors.text, textAlign: 'center', fontWeight: '900' }} /><TouchableOpacity disabled={quantity >= available} onPress={() => setQuantity((value) => Math.min(available, value + 1))} style={{ width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sidebarMuted }}><Plus size={17} color={colors.text} /></TouchableOpacity></View><Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6 }}>{available} currently available. Final price is resolved server-side.</Text></View>
    <TouchableOpacity disabled={quoting || quantity < item.moq || quantity > available || (item.variants.length > 0 && !variant)} onPress={quote} style={{ minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: quoting ? .6 : 1 }}><Text style={{ color: '#fff', fontWeight: '900' }}>{quoting ? 'Validating…' : 'Validate Price & Add'}</Text></TouchableOpacity>
  </Pressable></Pressable></Modal>
}
