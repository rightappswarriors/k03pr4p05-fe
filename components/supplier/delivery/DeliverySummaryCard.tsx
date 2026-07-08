// @/components/supplier/delivery/DeliverySummaryCard.tsx
// use this component to display a summary card for delivery KPIs in the supplier dashboard, Catalog kpi
import React from 'react'
import type { LucideIcon } from 'lucide-react-native'
import { StatCard } from '@/screens/supplier/SupplierDashboardScreen'

export function DeliverySummaryCard(props: {
  title: string
  value: string | number
  subtitle: string
  accent: string
  icon: LucideIcon
  widthPct: string
}) {
  return <StatCard title={props.title} value={props.value} subtitle={props.subtitle} accent={props.accent} icon={props.icon} widthPct={props.widthPct} />
}