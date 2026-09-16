import React, { useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'

export function formatDeliveryAgreementDeadline(deadline: string) {
  return new Date(deadline).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  })
}

export function deliveryAgreementRemaining(deadline: string, nowMs = Date.now()) {
  const remainingMs = Math.max(0, new Date(deadline).getTime() - nowMs)
  const totalMinutes = Math.ceil(remainingMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return { expired: remainingMs <= 0, label: `${hours}h ${minutes}m` }
}

export function DeliveryAgreementCountdown({
  deadline,
  audience,
  color,
  onExpired,
}: {
  deadline: string
  audience: 'BUYER' | 'SUPPLIER' | 'DELIVERY'
  color: string
  onExpired?: () => void
}) {
  const [nowMs, setNowMs] = useState(Date.now())
  const refreshedDeadline = useRef<string | null>(null)
  const remaining = deliveryAgreementRemaining(deadline, nowMs)

  useEffect(() => {
    setNowMs(Date.now())
    const interval = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [deadline])

  useEffect(() => {
    if (!remaining.expired || !onExpired || refreshedDeadline.current === deadline) return
    refreshedDeadline.current = deadline
    onExpired()
  }, [deadline, onExpired, remaining.expired])

  const countdown = remaining.expired
    ? 'Response period expired. Refreshing the server-authoritative agreement state.'
    : audience === 'BUYER'
      ? `You have ${remaining.label} remaining to accept or request another delivery date.`
      : audience === 'SUPPLIER'
        ? `Buyer has ${remaining.label} remaining to accept or request another delivery date.`
        : `Auto-agreement in ${remaining.label}.`

  return (
    <View style={{ gap: 3 }}>
      {audience !== 'DELIVERY' ? <Text style={{ color, fontSize: 13, fontWeight: '700' }}>Buyer response deadline: {formatDeliveryAgreementDeadline(deadline)}</Text> : null}
      <Text style={{ color, fontSize: 12.5, lineHeight: 18 }}>{countdown}</Text>
    </View>
  )
}
