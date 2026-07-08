import React, { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react-native'
import { useTheme } from '@/contexts/ThemeContext'

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

function getPageNumbers(current: number, total: number): Array<number | '...'> {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages = new Set<number>([1, total, current, current - 1, current + 1])
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
    const result: Array<number | '...'> = []
    let prev = 0
    for (const p of sorted) {
        if (prev && p - prev > 1) result.push('...')
        result.push(p)
        prev = p
    }
    return result
}

export function CatalogPagination({
    page, pageSize, totalItems, onPageChange, onPageSizeChange,
}: {
    page: number
    pageSize: number
    totalItems: number
    onPageChange: (p: number) => void
    onPageSizeChange: (s: number) => void
}) {
    const { colors } = useTheme()
    const [sizeMenuOpen, setSizeMenuOpen] = useState(false)
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const pages = getPageNumbers(page, totalPages)

    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, flexWrap: 'wrap', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Rows per page</Text>
                <View>
                    <TouchableOpacity onPress={() => setSizeMenuOpen((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{pageSize}</Text>
                        <ChevronDown size={13} color={colors.textSecondary} />
                    </TouchableOpacity>
                    {sizeMenuOpen && (
                        <View style={{ position: 'absolute', bottom: 36, left: 0, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border, zIndex: 10 }}>
                            {ROWS_PER_PAGE_OPTIONS.map((opt) => (
                                <TouchableOpacity key={opt} onPress={() => { onPageSizeChange(opt); setSizeMenuOpen(false) }} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                                    <Text style={{ fontSize: 13, color: colors.text }}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity onPress={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: 6, opacity: page === 1 ? 0.4 : 1 }}>
                    <ChevronLeft size={16} color={colors.text} />
                </TouchableOpacity>
                {pages.map((p, i) =>
                    p === '...' ? (
                        <Text key={`e${i}`} style={{ fontSize: 13, color: colors.textSecondary, paddingHorizontal: 4 }}>…</Text>
                    ) : (
                        <TouchableOpacity key={p} onPress={() => onPageChange(p)} style={{ width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: p === page ? colors.primary : 'transparent' }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: p === page ? '#fff' : colors.text }}>{p}</Text>
                        </TouchableOpacity>
                    )
                )}
                <TouchableOpacity onPress={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ padding: 6, opacity: page === totalPages ? 0.4 : 1 }}>
                    <ChevronRight size={16} color={colors.text} />
                </TouchableOpacity>
            </View>
        </View>
    )
}