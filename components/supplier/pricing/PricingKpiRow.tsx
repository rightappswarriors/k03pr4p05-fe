import React, { useEffect, useState } from 'react'
import { View, useWindowDimensions } from 'react-native'
import {
  BadgePercent,
  CalendarClock,
  DollarSign,
  History,
  Percent,
  Tag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native'
import { getPricingDashboard, type PricingKPIs } from '@/services/supplierService/pricingService'
import { StatCard } from '@/screens/supplier/SupplierDashboardScreen'

interface Props {
  catalogId: string
  onCardPress?: (cardKey: string) => void
  refreshKey?: number
}

const ACCENTS = {
  active: '#2563EB',
  avgPrice: '#059669',
  avgMargin: '#7C3AED',
  highMargin: '#0891B2',
  lowMargin: '#DC2626',
  promo: '#D97706',
  scheduled: '#DB2777',
  updates: '#4F46E5',
}

function formatCurrency(value: number): string {
  return `PHP ${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export default function PricingKPIRow({ catalogId, onCardPress, refreshKey = 0 }: Props) {
  const { width } = useWindowDimensions()
  const [kpis, setKpis] = useState<PricingKPIs | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    if (!catalogId) {
      setKpis(null)
      return
    }

    setLoading(true)
    getPricingDashboard(catalogId)
      .then((data) => {
        if (mounted) setKpis(data)
      })
      .catch((error) => {
        if (__DEV__) console.error('pricingDashboard error', error)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [catalogId, refreshKey])

  const isTablet = width >= 768
  const isDesktop = width >= 1100
  const columns = isDesktop ? 8 : isTablet ? 4 : 2
  const gap = 12
  const shrinkPct = ((gap * (columns - 1)) / columns / 3.6).toFixed(2)
  const widthPct = `${100 / columns - Number(shrinkPct)}%`
  const placeholder = loading ? '-' : undefined

  const cards = [
    {
      key: 'active',
      title: 'Current Active Prices',
      value: placeholder ?? (kpis?.activePriceCount ?? 0).toString(),
      icon: Tag,
      accent: ACCENTS.active,
    },
    {
      key: 'avgPrice',
      title: 'Average Selling Price',
      value: placeholder ?? formatCurrency(kpis?.averageSellingPrice ?? 0),
      icon: DollarSign,
      accent: ACCENTS.avgPrice,
    },
    {
      key: 'avgMargin',
      title: 'Average Margin',
      value: placeholder ?? formatPercent(kpis?.averageMargin ?? 0),
      icon: Percent,
      accent: ACCENTS.avgMargin,
    },
    {
      key: 'highMargin',
      title: 'Highest Margin',
      value: placeholder ?? formatPercent(kpis?.highestMargin ?? 0),
      icon: TrendingUp,
      accent: ACCENTS.highMargin,
    },
    {
      key: 'lowMargin',
      title: 'Lowest Margin',
      value: placeholder ?? formatPercent(kpis?.lowestMargin ?? 0),
      icon: TrendingDown,
      accent: ACCENTS.lowMargin,
    },
    {
      key: 'promo',
      title: 'Products on Promotion',
      value: placeholder ?? (kpis?.productsOnPromotion ?? 0).toString(),
      icon: BadgePercent,
      accent: ACCENTS.promo,
    },
    {
      key: 'scheduled',
      title: 'Scheduled Price Changes',
      value: placeholder ?? (kpis?.scheduledPriceChanges ?? 0).toString(),
      icon: CalendarClock,
      accent: ACCENTS.scheduled,
    },
    {
      key: 'updates',
      title: 'Price Updates This Month',
      value: placeholder ?? (kpis?.priceUpdatesThisMonth ?? 0).toString(),
      icon: History,
      accent: ACCENTS.updates,
    },
  ]

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, marginBottom: 16 }}>
      {cards.map((card) => (
        <StatCard
          key={card.key}
          title={card.title}
          value={card.value}
          icon={card.icon}
          accent={card.accent}
          widthPct={widthPct}
          onPress={onCardPress ? () => onCardPress(card.key) : undefined}
        />
      ))}
    </View>
  )
}
