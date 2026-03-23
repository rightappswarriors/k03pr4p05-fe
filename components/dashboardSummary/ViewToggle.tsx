


// ─── View Toggle ──────────────────────────────────────────────────────────────

import { LayoutGrid, List } from "lucide-react-native";
import React from "react";
import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
// ─── Constants ───────────────────────────────────────────────────────────────

export const VIEW_MODE_KEY = '@branch_overview_view_mode';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TabKey = 'expense' | 'itemnet';
export type ViewMode = 'table' | 'card';

export const PAGE_SIZE = 6;
export function ViewToggle({
  viewMode,
  onChange,
  colors,
}: {
  viewMode: ViewMode;
  onChange: (v: ViewMode) => void;
  colors: any;
}) {
  return (
    <View
      style={[
        vt.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {(['table', 'card'] as ViewMode[]).map((mode) => {
        const isActive = viewMode === mode;
        const Icon = mode === 'table' ? List : LayoutGrid;
        return (
          <TouchableOpacity
            key={mode}
            style={[vt.btn, isActive && { backgroundColor: colors.primary }]}
            onPress={() => onChange(mode)}
            activeOpacity={0.8}
          >
            <Icon
              size={14}
              color={isActive ? '#fff' : colors.textSecondary}
              strokeWidth={2}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Pagination Controls ──────────────────────────────────────────────────────

export function PaginationControls({
  page,
  totalPages,
  onPrev,
  onNext,
  colors,
  totalItems,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  colors: any;
  totalItems: number;
}) {
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <View style={[pg.container, { borderTopColor: colors.border }]}>
      <Text style={[pg.info, { color: colors.textSecondary }]}>
        {start}–{end} of {totalItems}
      </Text>
      <View style={pg.controls}>
        <TouchableOpacity
          style={[
            pg.btn,
            { borderColor: colors.border, opacity: page <= 1 ? 0.4 : 1 },
          ]}
          onPress={onPrev}
          disabled={page <= 1}
          activeOpacity={0.75}
        >
          <Text style={[pg.btnText, { color: colors.text }]}>‹ Prev</Text>
        </TouchableOpacity>
        <View
          style={[pg.pageIndicator, { backgroundColor: colors.primary + '18' }]}
        >
          <Text style={[pg.pageText, { color: colors.primary }]}>
            {page} / {totalPages}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            pg.btn,
            {
              borderColor: colors.border,
              opacity: page >= totalPages ? 0.4 : 1,
            },
          ]}
          onPress={onNext}
          disabled={page >= totalPages}
          activeOpacity={0.75}
        >
          <Text style={[pg.btnText, { color: colors.text }]}>Next ›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Pagination Styles ────────────────────────────────────────────────────────

const pg = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    marginHorizontal: 12,
    marginTop: 4,
  },
  info: { fontSize: 12, fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnText: { fontSize: 13, fontWeight: '600' },
  pageIndicator: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 7 },
  pageText: { fontSize: 13, fontWeight: '700' },
});


// ─── View Toggle Styles ───────────────────────────────────────────────────────

const vt = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 9,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 7,
  },
  label: { fontSize: 12, fontWeight: '600' },
});

