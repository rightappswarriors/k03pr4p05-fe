import { useTheme } from "@/contexts/ThemeContext"
import { useFinanceBreakpoint } from "./supplier/finance/FinanceScreenShell"
import { View, Text, ScrollView, StyleSheet } from "react-native"
import React from "react"

interface FinanceDataTableRow {
    key: string | number
    cells: React.ReactNode[]
}

interface FinanceDataTableColumn {
    label: string
    /** Relative flex weight for this column (defaults to 1). Not a pixel width. */
    width?: number
    align?: 'left' | 'right' | 'center'
}

interface FinanceDataTableProps {
    columns: FinanceDataTableColumn[]
    rows: FinanceDataTableRow[]
    emptyState?: React.ReactNode
}

function alignFor(align?: 'left' | 'right' | 'center') {
    return align === 'right' ? 'flex-end' as const : align === 'center' ? 'center' as const : 'flex-start' as const
}

export function DataTable({ columns, rows, emptyState }: FinanceDataTableProps) {
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <View style={{ flex: 1, minWidth: 760 }}>
                    <View style={[styles.tableHeader, { backgroundColor: colors.background }]}>
                        {columns.map((column, index) => (
                            <View
                                key={`${column.label}-${index}`}
                                style={[styles.tableCell, { flex: column.width ?? 1, alignItems: alignFor(column.align) }]}
                            >
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
                                <View
                                    key={`${row.key}-${index}`}
                                    style={[styles.tableCell, { flex: columns[index]?.width ?? 1, alignItems: alignFor(columns[index]?.align) }]}
                                >
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

export function EmptyState({ title, message }: { title: string; message: string }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.background }]}> 
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
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