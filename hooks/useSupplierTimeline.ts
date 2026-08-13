import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getTimeline,
  type TimelineDateRange,
  type TimelineEventType,
  type TimelineResult,
  type TimelineSort,
  type TimelineStatus,
} from '@/services/supplierTimelineService'

const EMPTY_RESULT: TimelineResult = {
  groups: [],
  totalCount: 0,
  hasNextPage: false,
  summary: {
    total: 0,
    purchaseOrders: 0,
    deliveries: 0,
    wallet: 0,
    mandates: 0,
    inventory: 0,
    notifications: 0,
    attention: 0,
  },
}

interface UseSupplierTimelineOptions {
  supplierOrgId?: number | null
  search: string
  status: TimelineStatus | 'ALL'
  eventTypes: TimelineEventType[]
  dateRange: TimelineDateRange
  sort: TimelineSort
  pageSize?: number
}

function mergeGroups(current: TimelineResult, next: TimelineResult): TimelineResult {
  const map = new Map(current.groups.map((group) => [group.label, [...group.events]]))
  for (const group of next.groups) {
    map.set(group.label, [...(map.get(group.label) ?? []), ...group.events])
  }
  const labels = ['Today', 'Yesterday', 'Last 7 Days', 'Earlier']
  return {
    ...next,
    groups: labels
      .map((label) => ({ label, events: map.get(label) ?? [] }))
      .filter((group) => group.events.length > 0),
  }
}

export function useSupplierTimeline({
  supplierOrgId,
  search,
  status,
  eventTypes,
  dateRange,
  sort,
  pageSize = 30,
}: UseSupplierTimelineOptions) {
  const [data, setData] = useState<TimelineResult>(EMPTY_RESULT)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const flattenedCount = useMemo(
    () => data.groups.reduce((total, group) => total + group.events.length, 0),
    [data.groups]
  )

  const load = useCallback(async (offset = 0, append = false) => {
    if (!supplierOrgId) {
      setData(EMPTY_RESULT)
      setLoading(false)
      return
    }

    if (append) setLoadingMore(true)
    else setLoading(true)

    try {
      const result = await getTimeline({
        supplierOrgId,
        search,
        status,
        eventTypes,
        dateRange,
        sort,
        limit: pageSize,
        offset,
      })
      setData((current) => (append ? mergeGroups(current, result) : result))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load order timeline.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [dateRange, eventTypes, pageSize, search, sort, status, supplierOrgId])

  useEffect(() => {
    load(0, false)
  }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load(0, false)
    setRefreshing(false)
  }, [load])

  const loadMore = useCallback(async () => {
    if (loadingMore || !data.hasNextPage) return
    await load(flattenedCount, true)
  }, [data.hasNextPage, flattenedCount, load, loadingMore])

  return {
    data,
    loading,
    refreshing,
    loadingMore,
    error,
    refresh,
    loadMore,
  }
}
