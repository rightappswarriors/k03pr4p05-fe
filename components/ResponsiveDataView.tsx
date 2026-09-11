import React from 'react'
import { Pressable, Text, View } from 'react-native'
import { DataTable, type FinanceDataTableColumn, type FinanceDataTableRow } from '@/components/DataTable'
import { useTheme } from '@/contexts/ThemeContext'

export interface DataRecordField {
  label: string
  value: React.ReactNode
}

export function DataRecordCard({
  title,
  subtitle,
  status,
  fields,
  actionLabel = 'View details',
  onPress,
  accessibilityLabel,
}: {
  title: string
  subtitle?: string
  status?: React.ReactNode
  fields: DataRecordField[]
  actionLabel?: string
  onPress?: () => void
  accessibilityLabel?: string
}) {
  const { colors } = useTheme()
  return (
    <View accessibilityLabel={accessibilityLabel} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: 12, padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{title}</Text>
          {subtitle ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{subtitle}</Text> : null}
        </View>
        {status}
      </View>
      <View style={{ gap: 7 }}>
        {fields.map((field) => <View key={field.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{field.label}</Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>{typeof field.value === 'string' ? <Text style={{ color: colors.text, fontSize: 12, textAlign: 'right' }}>{field.value}</Text> : field.value}</View>
        </View>)}
      </View>
      {onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${actionLabel}: ${title}`} onPress={onPress} style={{ minHeight: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{actionLabel}</Text>
      </Pressable> : null}
    </View>
  )
}

export function ResponsiveDataView<T>({
  items,
  columns,
  keyExtractor,
  renderCells,
  renderCard,
  useCards,
  emptyState,
  onItemPress,
  activeSortKey,
  sortDirection,
  onSort,
}: {
  items: T[]
  columns: FinanceDataTableColumn[]
  keyExtractor: (item: T) => string | number
  renderCells: (item: T) => React.ReactNode[]
  renderCard: (item: T) => React.ReactNode
  useCards: boolean
  emptyState: React.ReactNode
  onItemPress?: (item: T) => void
  activeSortKey?: string
  sortDirection?: 'ASC' | 'DESC'
  onSort?: (sortKey: string) => void
}) {
  if (items.length === 0) return <>{emptyState}</>
  if (useCards) return <View style={{ gap: 10 }}>{items.map((item) => <React.Fragment key={keyExtractor(item)}>{renderCard(item)}</React.Fragment>)}</View>
  const rowItems = new Map<string | number, T>()
  const rows: FinanceDataTableRow[] = items.map((item) => {
    const key = keyExtractor(item)
    rowItems.set(key, item)
    return { key, cells: renderCells(item) }
  })
  return <DataTable columns={columns} rows={rows} emptyState={emptyState} activeSortKey={activeSortKey} sortDirection={sortDirection} onSort={onSort} onRowPress={onItemPress ? (row) => onItemPress(rowItems.get(row.key)!) : undefined} />
}
