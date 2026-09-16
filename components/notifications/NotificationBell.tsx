import React, { useEffect } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { Bell } from 'lucide-react-native'

import { useNotifications } from '@/contexts/NotificationContext'
import type { NotificationAccountContext } from '@/services/notificationService'

export function NotificationBell({ accountContext, enabled, color, onPress }: { accountContext: NotificationAccountContext; enabled: boolean; color: string; onPress: () => void }) {
  const { activate, unreadCount } = useNotifications()

  useEffect(() => {
    if (enabled) activate(accountContext)
  }, [accountContext, activate, enabled])

  if (!enabled) return null
  return (
    <TouchableOpacity accessibilityLabel={`Notifications, ${unreadCount} unread`} onPress={onPress} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
      <Bell size={20} color={color} strokeWidth={2.2} />
      {unreadCount > 0 ? <View style={{ position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View> : null}
    </TouchableOpacity>
  )
}
