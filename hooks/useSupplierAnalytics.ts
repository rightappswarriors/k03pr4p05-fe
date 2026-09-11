import { useCallback, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/contexts/AuthContext'
import { getSupplierAnalytics, type AnalyticsRange, type SupplierAnalyticsData } from '@/services/supplierService/supplierAnalyticsService'
import type { CustomerOptions } from '@/services/supplierService/supplierCustomerAnalytics'
import type { ProductOptions } from '@/services/supplierService/supplierProductAnalytics'
import type { OrderOptions } from '@/services/supplierService/supplierOrderAnalytics'
import type { FeeOptions, PayoutOptions } from '@/services/supplierService/supplierFinanceAnalytics'

export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export function presetRange(preset: number): AnalyticsRange {
  // Calendar selection always starts with today's Manila date, independent of device timezone.
  const today = new Date(new Date().valueOf() + 8 * 3600000).toISOString().slice(0, 10)
  const start = new Date(`${today}T12:00:00Z`)
  if (preset <= 30) start.setUTCDate(start.getUTCDate() - preset + 1)
  else {
    const day = start.getUTCDate()
    start.setUTCDate(1)
    start.setUTCMonth(start.getUTCMonth() - preset / 30)
    const monthEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate()
    start.setUTCDate(Math.min(day, monthEnd))
    start.setUTCDate(start.getUTCDate() + 1)
  }
  return { startDate: start.toISOString().slice(0, 10), endDate: today }
}
export function validAnalyticsRange(range: AnalyticsRange) {
  const dates = [range.startDate, range.endDate]
  if (!dates.every(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d)) return false
  const days = (Date.parse(range.endDate) - Date.parse(range.startDate)) / 86400000 + 1
  return days >= 1 && days <= 366
}

export function useSupplierAnalytics() {
  const { user } = useAuth()
  const [range, setRangeState] = useState<AnalyticsRange>(() => presetRange(180))
  const [viewMode, setViewState] = useState<'cards' | 'table'>('table')
  const [ready, setReady] = useState(false)
  const [search, setSearch] = useState('')
  const [querySearch, setQuerySearch] = useState('')
  const [data, setData] = useState<SupplierAnalyticsData | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [productOptions, setProductOptionsState] = useState<ProductOptions>({ productPage: 1, productLimit: 20, productSort: 'REVENUE', productDirection: 'DESC' })
  const [customerOptions, setCustomerOptionsState] = useState<CustomerOptions>({ customerPage: 1, customerLimit: 20, customerSort: 'REVENUE', customerDirection: 'DESC' })
  const [orderOptions, setOrderOptionsState] = useState<OrderOptions>({ orderPage: 1, orderLimit: 20, orderSort: 'CREATED', orderDirection: 'DESC' })
  const [feeOptions, setFeeOptionsState] = useState<FeeOptions>({ feePage: 1, feeLimit: 20, feeSort: 'SETTLED', feeDirection: 'DESC' })
  const [payoutOptions, setPayoutOptionsState] = useState<PayoutOptions>({ payoutPage: 1, payoutLimit: 20, payoutSort: 'REQUESTED', payoutDirection: 'DESC' })
  const [productPageFilter, setProductPageFilter] = useState('')
  const [customerPageFilter, setCustomerPageFilter] = useState('')
  const [orderPageFilter, setOrderPageFilter] = useState('')
  const [feePageFilter, setFeePageFilter] = useState('')
  const [payoutPageFilter, setPayoutPageFilter] = useState('')
  const productFilter = `${range.startDate}:${range.endDate}:${querySearch}`
  const productPage = productPageFilter === productFilter ? productOptions.productPage : 1
  const { productLimit, productSort, productDirection } = productOptions
  const customerPage = customerPageFilter === productFilter ? customerOptions.customerPage : 1
  const { customerLimit, customerSort, customerDirection } = customerOptions
  const orderPage = orderPageFilter === productFilter ? orderOptions.orderPage : 1
  const { orderLimit, orderSort, orderDirection } = orderOptions
  const feePage = feePageFilter === productFilter ? feeOptions.feePage : 1
  const { feeLimit, feeSort, feeDirection } = feeOptions
  const payoutPage = payoutPageFilter === productFilter ? payoutOptions.payoutPage : 1
  const { payoutLimit, payoutSort, payoutDirection } = payoutOptions
  const loaded = useRef<SupplierAnalyticsData | null>(null)
  const sequence = useRef(0)
  const invalidate = useCallback(() => { sequence.current++ }, [])
  const key = `supplierInsights:overview:v18:${user?.orgId ?? 'signed-out'}:prefs`

  useEffect(() => {
    let mounted = true
    setReady(false)
    setData(null)
    loaded.current = null
    setProductPageFilter('')
    setCustomerPageFilter('')
    setOrderPageFilter('')
    setFeePageFilter('')
    setPayoutPageFilter('')
    setSearch('')
    setQuerySearch('')
    AsyncStorage.getItem(key).then(saved => {
      if (!mounted) return
      const parsed = saved ? JSON.parse(saved) : null
      setRangeState(parsed?.range && validAnalyticsRange(parsed.range) ? parsed.range : presetRange(180))
      setViewState(parsed?.viewMode === 'cards' ? 'cards' : 'table')
    }).catch(() => { if (mounted) setRangeState(presetRange(180)) }).finally(() => { if (mounted) setReady(true) })
    return () => { mounted = false; invalidate() }
  }, [invalidate, key])

  useEffect(() => {
    const timer = setTimeout(() => setQuerySearch(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (ready) AsyncStorage.setItem(key, JSON.stringify({ range, viewMode })).catch(() => {})
  }, [key, range, ready, viewMode])

  const load = useCallback(async (refresh = false) => {
    if (!ready || !user?.orgId) return
    const request = ++sequence.current
    const sameFilter = loaded.current?.range.startDate === range.startDate && loaded.current?.range.endDate === range.endDate && loaded.current?.search === querySearch
    if (refresh || sameFilter) setRefreshing(true)
    else { setLoading(true); setData(null) }
    setError(false)
    try {
      const result = await getSupplierAnalytics({ ...range, search: querySearch, productPage, productLimit, productSort, productDirection,
        customerPage, customerLimit, customerSort, customerDirection, orderPage, orderLimit, orderSort, orderDirection,
        feePage, feeLimit, feeSort, feeDirection, payoutPage, payoutLimit, payoutSort, payoutDirection })
      if (request === sequence.current) { loaded.current = result; setData(result) }
    } catch (e) {
      if (request === sequence.current) setError(true)
      // eslint-disable-next-line no-console -- Keep useful diagnostics out of the production UI.
      if (__DEV__) console.warn('Supplier analytics request failed', e)
    } finally {
      if (request === sequence.current) { setLoading(false); setRefreshing(false) }
    }
  }, [querySearch, range, ready, user?.orgId, productPage, productLimit, productSort, productDirection, customerPage, customerLimit, customerSort, customerDirection, orderPage, orderLimit, orderSort, orderDirection, feePage, feeLimit, feeSort, feeDirection, payoutPage, payoutLimit, payoutSort, payoutDirection])

  useEffect(() => { void load(); return invalidate }, [invalidate, load])
  const setRange = (next: AnalyticsRange) => { if (validAnalyticsRange(next)) setRangeState(next) }
  const matches = data && data.range.startDate === range.startDate && data.range.endDate === range.endDate && data.search === search.trim()
  const pageMatches = data?.productAnalytics.performance.limit === productLimit && data?.productAnalytics.performance.sort === productSort
    && data?.productAnalytics.performance.direction === productDirection && data?.productAnalytics.performance.page === Math.min(productPage, data?.productAnalytics.performance.totalPages)
  const customerPageMatches = data?.customerAnalytics.performance.limit === customerLimit && data?.customerAnalytics.performance.sort === customerSort
    && data?.customerAnalytics.performance.direction === customerDirection && data?.customerAnalytics.performance.page === Math.min(customerPage, data?.customerAnalytics.performance.totalPages)
  const orderPageMatches = data?.orderAnalytics.performance.limit === orderLimit && data?.orderAnalytics.performance.sort === orderSort
    && data?.orderAnalytics.performance.direction === orderDirection && data?.orderAnalytics.performance.page === Math.min(orderPage, data?.orderAnalytics.performance.totalPages)
  const feePageMatches = data?.feeAnalytics.history.limit === feeLimit && data?.feeAnalytics.history.sort === feeSort
    && data?.feeAnalytics.history.direction === feeDirection && data?.feeAnalytics.history.page === Math.min(feePage, data?.feeAnalytics.history.totalPages)
  const payoutPageMatches = data?.payoutAnalytics.history.limit === payoutLimit && data?.payoutAnalytics.history.sort === payoutSort
    && data?.payoutAnalytics.history.direction === payoutDirection && data?.payoutAnalytics.history.page === Math.min(payoutPage, data?.payoutAnalytics.history.totalPages)
  const setProductOptions = (next: Partial<ProductOptions>) => {
    setProductPageFilter(productFilter)
    setProductOptionsState(previous => ({ ...previous, ...next, productPage: next.productPage ?? 1 }))
  }
  const setCustomerOptions = (next: Partial<CustomerOptions>) => {
    setCustomerPageFilter(productFilter)
    setCustomerOptionsState(previous => ({ ...previous, ...next, customerPage: next.customerPage ?? 1 }))
  }
  const setOrderOptions = (next: Partial<OrderOptions>) => {
    setOrderPageFilter(productFilter)
    setOrderOptionsState(previous => ({ ...previous, ...next, orderPage: next.orderPage ?? 1 }))
  }
  const setFeeOptions = (next: Partial<FeeOptions>) => {
    setFeePageFilter(productFilter)
    setFeeOptionsState(previous => ({ ...previous, ...next, feePage: next.feePage ?? 1 }))
  }
  const setPayoutOptions = (next: Partial<PayoutOptions>) => {
    setPayoutPageFilter(productFilter)
    setPayoutOptionsState(previous => ({ ...previous, ...next, payoutPage: next.payoutPage ?? 1 }))
  }
  return { range, setRange, viewMode, setViewMode: setViewState, search, setSearch, data, error,
    productOptions: { ...productOptions, productPage }, setProductOptions,
    customerOptions: { ...customerOptions, customerPage }, setCustomerOptions,
    orderOptions: { ...orderOptions, orderPage }, setOrderOptions,
    feeOptions: { ...feeOptions, feePage }, setFeeOptions,
    payoutOptions: { ...payoutOptions, payoutPage }, setPayoutOptions,
    loading: !ready || loading, refreshing, refresh: () => load(true), retry: () => load(false), canExport: !!matches && pageMatches && customerPageMatches && orderPageMatches && feePageMatches && payoutPageMatches && !loading && !refreshing && !error }
}
