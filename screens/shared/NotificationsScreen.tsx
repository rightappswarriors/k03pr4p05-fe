import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { CheckCheck, ChevronRight, RefreshCw } from 'lucide-react-native'
import { useRouter } from 'expo-router'

import { SkeletonBox } from '@/components/LoadingSkeleton'
import { NOTIFICATION_CATEGORY_PRESENTATION, NOTIFICATION_FILTERS, notificationMatchesFilter, resolveNotificationDestination } from '@/components/notifications/notificationConfig'
import { useNotifications } from '@/contexts/NotificationContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { getNotificationPage, markAllNotificationsRead, markNotificationRead, type NotificationAccountContext, type NotificationFilter, type NotificationItem } from '@/services/notificationService'

const PAGE_SIZE = 20
const manilaDate = (value: string | number | Date) => new Date(value).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' })
const dateGroup = (createdAt: string) => {
  const today = manilaDate(new Date())
  const yesterday = manilaDate(Date.now() - 86_400_000)
  const value = manilaDate(createdAt)
  return value === today ? 'TODAY' : value === yesterday ? 'YESTERDAY' : 'EARLIER'
}
const timeLabel = (createdAt: string) => new Date(createdAt).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })
const dedupe = (items: NotificationItem[]) => Array.from(new Map(items.map((item) => [item.id, item])).values())

export default function NotificationsScreen({ accountContext }: { accountContext: NotificationAccountContext }) {
  const { colors } = useTheme()
  const toast = useToast()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { activate, latestNotification, markAllReadLocal, markReadLocal, setCanonicalUnreadCount, unreadCount } = useNotifications()
  const [filter, setFilter] = useState<NotificationFilter>('ALL')
  const [items, setItems] = useState<NotificationItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => activate(accountContext), [accountContext, activate])

  const load = useCallback(async (targetPage: number, append: boolean, refresh = false) => {
    if (append) setLoadingMore(true)
    else if (refresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const result = await getNotificationPage(accountContext, filter, targetPage, PAGE_SIZE)
      setItems((current) => dedupe(append ? [...current, ...result.items] : result.items))
      setPage(result.page)
      setTotal(result.total)
      setHasNextPage(result.hasNextPage)
      setCanonicalUnreadCount(result.unreadCount)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load notifications.'
      setError(message)
      if (!append) setItems((current) => refresh ? current : [])
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }, [accountContext, filter, setCanonicalUnreadCount])

  useEffect(() => { void load(1, false) }, [load])

  useEffect(() => {
    if (!latestNotification || !notificationMatchesFilter(latestNotification, filter)) return
    setItems((current) => {
      if (current.some((item) => item.id === latestNotification.id)) return current.map((item) => item.id === latestNotification.id ? latestNotification : item)
      setTotal((value) => value + 1)
      return [latestNotification, ...current]
    })
  }, [filter, latestNotification])

  const grouped = useMemo(() => items.reduce<Record<string, NotificationItem[]>>((groups, item) => {
    const key = dateGroup(item.createdAt)
    ;(groups[key] ??= []).push(item)
    return groups
  }, {}), [items])

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(accountContext, notification.id)
        markReadLocal(notification.id)
        setItems((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item))
      } catch (readError) {
        toast.show(readError instanceof Error ? readError.message : 'Unable to mark notification as read.', 'error')
        return
      }
    }
    const destination = resolveNotificationDestination(notification, accountContext)
    if (destination) router.push(destination as never)
    else Alert.alert(notification.title, `${notification.message}\n\nRelated record is no longer available or this notification has no destination.`)
  }

  const markAll = async () => {
    setMarkingAll(true)
    try {
      await markAllNotificationsRead(accountContext)
      markAllReadLocal()
      setItems((current) => filter === 'UNREAD' ? [] : current.map((item) => ({ ...item, isRead: true })))
      if (filter === 'UNREAD') { setTotal(0); setHasNextPage(false) }
      toast.show('All notifications marked as read.', 'success')
    } catch (markError) {
      toast.show(markError instanceof Error ? markError.message : 'Unable to mark notifications as read.', 'error')
    } finally {
      setMarkingAll(false)
    }
  }

  const emptyTitle = filter === 'UNREAD' ? "You're all caught up" : filter === 'ALL' ? 'No notifications yet' : `No ${NOTIFICATION_FILTERS.find((item) => item.key === filter)?.label.toLowerCase()} notifications`
  const emptyMessage = filter === 'UNREAD' ? 'You have no unread notifications.' : filter === 'ALL' ? 'Updates about your orders, payments, and account activity will appear here.' : 'New activity in this category will appear here.'

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ alignItems: 'center', padding: width < 600 ? 14 : 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(1, false, true)} tintColor={colors.primary} />}>
      <View style={{ width: '100%', maxWidth: 980, gap: 16 }}>
        <View style={{ flexDirection: width < 600 ? 'column' : 'row', alignItems: width < 600 ? 'stretch' : 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: width < 600 ? 24 : 28, fontWeight: '900' }}>Notifications</Text><Text style={{ color: colors.textSecondary, marginTop: 4 }}>Stay updated on orders, payments, and account activity.</Text></View>
          <TouchableOpacity accessibilityLabel="Mark all notifications as read" disabled={markingAll || unreadCount === 0} onPress={markAll} style={{ minHeight: 42, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: markingAll || unreadCount === 0 ? 0.45 : 1 }}><CheckCheck size={17} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '800' }}>{markingAll ? 'Marking…' : 'Mark all as read'}</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {NOTIFICATION_FILTERS.map((item) => <TouchableOpacity key={item.key} accessibilityRole="button" accessibilityState={{ selected: filter === item.key }} onPress={() => setFilter(item.key)} style={{ minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 19, backgroundColor: filter === item.key ? colors.primary : colors.card, borderWidth: 1, borderColor: filter === item.key ? colors.primary : colors.border }}><Text style={{ color: filter === item.key ? '#fff' : colors.text, fontWeight: '700' }}>{item.label}</Text></TouchableOpacity>)}
        </ScrollView>

        {loading ? <View style={{ gap: 10 }}>{Array.from({ length: 5 }).map((_, index) => <SkeletonBox key={index} style={{ height: 104, width: '100%' }} />)}</View> : null}
        {!loading && error && items.length === 0 ? <View style={{ padding: 28, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card }}><Text style={{ color: colors.error, fontWeight: '800' }}>{error}</Text><TouchableOpacity accessibilityLabel="Retry loading notifications" onPress={() => void load(1, false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><RefreshCw size={16} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '800' }}>Retry</Text></TouchableOpacity></View> : null}
        {!loading && items.length === 0 && !error ? <View style={{ padding: 36, alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card }}><Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>{emptyTitle}</Text><Text style={{ color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>{emptyMessage}</Text></View> : null}

        {!loading ? ['TODAY', 'YESTERDAY', 'EARLIER'].map((group) => grouped[group]?.length ? <View key={group} style={{ gap: 8 }}><Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 }}>{group}</Text>{grouped[group].map((notification) => {
          const presentation = NOTIFICATION_CATEGORY_PRESENTATION[notification.category] ?? NOTIFICATION_CATEGORY_PRESENTATION.SYSTEM
          const Icon = presentation.icon
          return <TouchableOpacity key={notification.id} accessibilityRole="button" accessibilityLabel={`${notification.isRead ? 'Read' : 'Unread'} notification: ${notification.title}`} onPress={() => void openNotification(notification)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: width < 600 ? 13 : 16, borderRadius: 14, borderWidth: 1, borderColor: notification.isRead ? colors.border : presentation.color, backgroundColor: notification.isRead ? colors.card : colors.primaryLight }}><View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${presentation.color}18` }}><Icon size={19} color={presentation.color} /></View><View style={{ flex: 1, minWidth: 0, gap: 4 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>{!notification.isRead ? <View accessibilityLabel="Unread" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: presentation.color }} /> : null}<Text numberOfLines={2} style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: notification.isRead ? '700' : '900' }}>{notification.title}</Text><Text style={{ color: colors.textSecondary, fontSize: 11 }}>{timeLabel(notification.createdAt)}</Text></View><Text style={{ color: colors.textSecondary, lineHeight: 19 }} numberOfLines={width < 600 ? 3 : 2}>{notification.message}</Text><Text style={{ color: presentation.color, fontSize: 11, fontWeight: '800' }}>{presentation.label}{notification.isRead ? ' · Read' : ' · Unread'}</Text></View><ChevronRight size={17} color={colors.textSecondary} style={{ marginTop: 10 }} /></TouchableOpacity>
        })}</View> : null) : null}

        {!loading && items.length > 0 ? <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}><Text style={{ color: colors.textSecondary }}>Loaded {items.length} of {Math.max(total, items.length)} notifications</Text>{error ? <Text style={{ color: colors.error, textAlign: 'center' }}>{error}</Text> : null}{hasNextPage ? <TouchableOpacity accessibilityLabel="Load more notifications" disabled={loadingMore} onPress={() => void load(page + 1, true)} style={{ minHeight: 44, minWidth: 150, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>{loadingMore ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900' }}>Load More</Text>}</TouchableOpacity> : <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>All notifications are loaded</Text>}</View> : null}
      </View>
    </ScrollView>
  )
}
