import React from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

export interface AdminDataTableColumn<T> {
  key: string
  label: string
  width?: number
  flex?: number
  render: (row: T) => React.ReactNode
}

interface AdminDataTableProps<T> {
  columns: AdminDataTableColumn<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  loading?: boolean
  emptyState: string
  onRowPress?: (row: T) => void
  minWidth?: number
}

export function AdminDataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyState,
  onRowPress,
  minWidth = 900,
}: AdminDataTableProps<T>) {
  const { colors } = useTheme()
  const styles = makeStyles(colors)

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>Loading records…</Text>
      </View>
    )
  }

  if (!data.length) {
    return (
      <View style={styles.state}>
        <Text style={styles.muted}>{emptyState}</Text>
      </View>
    )
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={{ minWidth, flexGrow: 1 }}>
        <View style={[styles.row, styles.header]}>
          {columns.map((column) => (
            <View
              key={column.key}
              style={[
                styles.cell,
                column.width ? { width: column.width, flexGrow: 0, flexShrink: 0 } : { flex: column.flex ?? 1 },
              ]}
            >
              <Text style={styles.headerText}>{column.label}</Text>
            </View>
          ))}
        </View>

        {data.map((row) => (
          <Pressable
            key={keyExtractor(row)}
            onPress={() => onRowPress?.(row)}
            style={({ pressed }) => [styles.row, pressed && onRowPress && styles.rowPressed]}
          >
            {columns.map((column) => (
              <View
                key={column.key}
                style={[
                  styles.cell,
                  column.width ? { width: column.width, flexGrow: 0, flexShrink: 0 } : { flex: column.flex ?? 1 },
                ]}
              >
                {column.render(row)}
              </View>
            ))}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    scroll: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    scrollContent: {
      flexGrow: 1,
    },
    row: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingHorizontal: 8,
    },
    header: {
      minHeight: 42,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
    },
    rowPressed: {
      opacity: 0.7,
      backgroundColor: colors.background,
    },
    cell: {
      paddingHorizontal: 8,
      justifyContent: 'center',
    },
    headerText: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: '800',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    state: {
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
    },
    muted: {
      color: colors.textSecondary,
      fontSize: 13,
    },
  })