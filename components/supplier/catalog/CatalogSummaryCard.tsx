import React from 'react'
import type { LucideIcon } from 'lucide-react-native'
import { StatCard } from '@/screens/supplier/SupplierDashboardScreen'

export function CatalogSummaryCard(props: {
  title: string
  value: string | number
  subtitle: string
  accent: string
  icon: LucideIcon
  widthPct: string
}) {
  return <StatCard {...props} />
}