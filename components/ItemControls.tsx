import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// ─── Item Controls (Search + Take + Pagination) ───────────────────────────────

export default function ItemControls({
  search,
  onSearchChange,
  take,
  onTakeChange,
  page,
  totalPages,
  onPrev,
  onNext,
  colors,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  take: string;
  onTakeChange: (v: string) => void;
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  colors: any;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      {/* Search + Take row */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        {/* Search */}
        <View
          style={[
            itc.inputWrap,
            {
              flex: 1,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              marginRight: 6,
            }}
          >
            🔍
          </Text>
          <TextInput
            style={[itc.input, { color: colors.text }]}
            placeholder="Search items..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={onSearchChange}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Take input */}
        <View
          style={[
            itc.inputWrap,
            {
              width: 90,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            style={[itc.input, { color: colors.text, width: 38 }]}
            placeholder="20"
            placeholderTextColor={colors.textSecondary}
            value={take}
            onChangeText={onTakeChange}
            keyboardType="numeric"
          />
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>
            / pg
          </Text>
        </View>

        {/* Quick-take buttons */}
        {(['50', 'All'] as const).map((opt) => {
          const isActive = opt === 'All' ? take === '99999' : take === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                itc.quickBtn,
                {
                  backgroundColor: isActive ? colors.primary : colors.card,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onTakeChange(opt === 'All' ? '99999' : opt)}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: isActive ? '#fff' : colors.textSecondary,
                }}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Pagination row — only shown when there are multiple pages */}
      {totalPages > 1 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <TouchableOpacity
            style={[
              itc.pageBtn,
              {
                backgroundColor: page > 1 ? colors.card : colors.border + '33',
                borderColor: page > 1 ? colors.border : 'transparent',
                opacity: page > 1 ? 1 : 0.4,
              },
            ]}
            onPress={onPrev}
            disabled={page <= 1}
          >
            <Text
              style={{ fontSize: 12, fontWeight: '700', color: colors.text }}
            >
              ‹ Prev
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 11,
              color: colors.textSecondary,
              fontWeight: '600',
            }}
          >
            {page} / {totalPages}
          </Text>

          <TouchableOpacity
            style={[
              itc.pageBtn,
              {
                backgroundColor:
                  page < totalPages ? colors.primary : colors.border + '33',
                borderColor: page < totalPages ? colors.primary : 'transparent',
                opacity: page < totalPages ? 1 : 0.4,
              },
            ]}
            onPress={onNext}
            disabled={page >= totalPages}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: page < totalPages ? '#fff' : colors.textSecondary,
              }}
            >
              Next ›
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const itc = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  input: { flex: 1, fontSize: 13, padding: 0 },
  quickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
});