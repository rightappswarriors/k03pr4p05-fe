import React from 'react'
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import type { LucideIcon } from 'lucide-react-native'

export type FinanceBreakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide'

interface FinanceScreenShellProps {
  title: string
  subtitle: string
  action?: React.ReactNode
  children: React.ReactNode
  loading?: boolean
}

export function useFinanceBreakpoint(): FinanceBreakpoint {
  const { width } = useWindowDimensions()
  if (width >= 1440) return 'wide'
  if (width >= 1024) return 'desktop'
  if (width >= 768) return 'tablet'
  return 'mobile'
}

export function FinanceScreenShell({ title, subtitle, action, children, loading = false }: FinanceScreenShellProps) {
  const { colors } = useTheme()
  const breakpoint = useFinanceBreakpoint()
  const maxWidth = breakpoint === 'wide' ? 1760 : breakpoint === 'desktop' ? 1480 : 1200

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}> 
      <View style={[styles.frame, { maxWidth }]}> 
        <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          </View>
          {action}
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading finance data…</Text> : children}
        </ScrollView>
      </View>
    </View>
  )
}

interface FinanceStatCardProps {
  title: string
  value: string
  hint?: string
  accent?: string
  icon?: LucideIcon
}

export function FinanceStatCard({ title, value, hint, accent, icon: Icon }: FinanceStatCardProps) {
  const { colors } = useTheme()
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={[styles.statIcon, { backgroundColor: accent ? `${accent}18` : `${colors.primary}18` }]}> 
        {Icon ? <Icon size={16} color={accent ?? colors.primary} strokeWidth={2.2} /> : null}
      </View>
      <View style={styles.statBody}>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        {hint ? <Text style={[styles.statHint, { color: colors.textSecondary }]}>{hint}</Text> : null}
      </View>
    </View>
  )
}

export function FinanceStatGrid({ children }: { children: React.ReactNode }) {
  const breakpoint = useFinanceBreakpoint()
  const columns = breakpoint === 'mobile' ? 2 : breakpoint === 'tablet' ? 3 : breakpoint === 'desktop' ? 4 : 6
  const flexBasis = columns === 2 ? '48%' : columns === 3 ? '31%' : columns === 4 ? '23%' : '15.5%'

  return (
    <View style={styles.statGrid}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={{ flexBasis, minWidth: breakpoint === 'mobile' ? 140 : 180, flexGrow: 1, maxWidth: '100%' }}>
          {child}
        </View>
      ))}
    </View>
  )
}

interface FinanceHeroCardProps {
  title: string
  value: string
  subtitle?: string
  description?: string
  accent?: string
  icon?: LucideIcon
  action?: React.ReactNode
}

export function FinanceHeroCard({ title, value, subtitle, description, accent, icon: Icon, action }: FinanceHeroCardProps) {
  const { colors } = useTheme()
  return (
    <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.heroHeader}>
        <View style={[styles.heroIcon, { backgroundColor: accent ? `${accent}18` : `${colors.primary}18` }]}> 
          {Icon ? <Icon size={20} color={accent ?? colors.primary} strokeWidth={2.2} /> : null}
        </View>
        {action ? <View>{action}</View> : null}
      </View>
      <Text style={[styles.heroTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.heroValue, { color: colors.text }]}>{value}</Text>
      {subtitle ? <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      {description ? <Text style={[styles.heroDescription, { color: colors.textSecondary }]}>{description}</Text> : null}
    </View>
  )
}

export function FinanceSplitLayout({ children }: { children: React.ReactNode }) {
  const breakpoint = useFinanceBreakpoint()
  return (
    <View style={[styles.splitLayout, breakpoint === 'mobile' ? styles.splitColumn : styles.splitRow]}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={styles.splitItem}>
          {child}
        </View>
      ))}
    </View>
  )
}

export function FinanceSectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.sectionHeading}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  )
}

interface FinanceDataTableColumn {
  label: string
  width?: number | string
  align?: 'left' | 'right' | 'center'
}

interface FinanceDataTableRow {
  key: string | number
  cells: React.ReactNode[]
}

interface FinanceDataTableProps {
  columns: FinanceDataTableColumn[]
  rows: FinanceDataTableRow[]
  emptyState?: React.ReactNode
}

export function FinanceDataTable({ columns, rows, emptyState }: FinanceDataTableProps) {
  const { colors } = useTheme()
  const breakpoint = useFinanceBreakpoint()

  if (breakpoint === 'mobile') {
    return (
      <View style={{ gap: 8 }}>
        {rows.length === 0 ? emptyState : rows.map((row) => (
          <View key={row.key} style={[styles.mobileRow, { backgroundColor: colors.background, borderColor: colors.border }]}> 
            {row.cells.map((cell, index) => (
              <View key={`${row.key}-${index}`} style={styles.mobileCell}>
                {index === 0 ? <Text style={[styles.mobileLabel, { color: colors.textSecondary }]}>{columns[index]?.label}</Text> : null}
                {cell}
              </View>
            ))}
          </View>
        ))}
      </View>
    )
  }

  return (
    <View style={[styles.tableShell, { borderColor: colors.border }]}> 
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: 760 }}>
          <View style={[styles.tableHeader, { backgroundColor: colors.background }]}> 
            {columns.map((column, index) => (
              <View key={`${column.label}-${index}`} style={[styles.tableCell, { width: column.width ?? 'auto', alignItems: column.align === 'right' ? 'flex-end' : column.align === 'center' ? 'center' : 'flex-start' }]}> 
                <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>{column.label}</Text>
              </View>
            ))}
          </View>
          {rows.length === 0 ? (
            <View style={[styles.tableEmpty, { backgroundColor: colors.surface }]}> 
              {emptyState}
            </View>
          ) : rows.map((row) => (
            <View key={row.key} style={[styles.tableRow, { borderTopColor: colors.border }]}> 
              {row.cells.map((cell, index) => (
                <View key={`${row.key}-${index}`} style={[styles.tableCell, { width: columns[index]?.width ?? 'auto', alignItems: columns[index]?.align === 'right' ? 'flex-end' : columns[index]?.align === 'center' ? 'center' : 'flex-start' }]}> 
                  {cell}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

export function FinanceFormGrid({ children }: { children: React.ReactNode }) {
  const breakpoint = useFinanceBreakpoint()
  return <View style={[styles.formGrid, breakpoint === 'mobile' ? styles.formGridColumn : styles.formGridRow]}>{children}</View>
}

export function FinanceEmptyState({ title, message }: { title: string; message: string }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.background }]}> 
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  frame: { flex: 1, alignSelf: 'center', width: '100%' },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  content: { padding: 18, gap: 14 },
  loadingText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    minHeight: 186,
  },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 15, fontWeight: '800' },
  heroValue: { fontSize: 24, fontWeight: '900' },
  heroSubtitle: { fontSize: 13, fontWeight: '600' },
  heroDescription: { fontSize: 12, lineHeight: 18 },
  splitLayout: { gap: 12 },
  splitColumn: { flexDirection: 'column' },
  splitRow: { flexDirection: 'row', alignItems: 'flex-start' },
  splitItem: { flex: 1, minWidth: 280 },
  statCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 96,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statBody: { flex: 1 },
  statTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  statValue: { fontSize: 17, fontWeight: '800' },
  statHint: { fontSize: 12, marginTop: 3 },
  section: { borderWidth: 1, borderRadius: 15, padding: 14, gap: 10 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  tableShell: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 },
  tableHeaderText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: 1 },
  tableCell: { paddingHorizontal: 4, justifyContent: 'center' },
  tableEmpty: { padding: 12 },
  mobileRow: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 6 },
  mobileCell: { gap: 2 },
  mobileLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  formGrid: { gap: 10 },
  formGridColumn: { flexDirection: 'column' },
  formGridRow: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyState: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 16, alignItems: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '700' },
  emptyMessage: { fontSize: 12, marginTop: 4, textAlign: 'center' },
})
