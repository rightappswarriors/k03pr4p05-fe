import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { gql } from 'graphql-request';
import { useTheme } from '@/contexts/ThemeContext';
import { graphQLRequest } from '@/services/apiClient';

const LIST = gql`
  query {
    listFeeRules {
      id
      appliesTo
      rateType
      rate
      category
      unitType
      effectiveFrom
      effectiveTo
      isActive
      updatedAt
    }
  }
`;

const CREATE = gql`
  mutation (
    $appliesTo: FeeApplication!
    $rateType: FeeRateType!
    $rate: Float!
    $effectiveFrom: DateTime!
    $category: String
    $unitType: String
  ) {
    createFeeRule(
      appliesTo: $appliesTo
      rateType: $rateType
      rate: $rate
      effectiveFrom: $effectiveFrom
      category: $category
      unitType: $unitType
    ) {
      id
    }
  }
`;

const TOGGLE = gql`
  mutation ($id: String!, $isActive: Boolean!) {
    toggleFeeRule(id: $id, isActive: $isActive) {
      id
      isActive
    }
  }
`;

type Rule = {
  id: string;
  appliesTo: string;
  rateType: 'PERCENTAGE' | 'PER_UNIT' | 'FLAT';
  rate: number;
  category?: string;
  unitType?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  updatedAt: string;
};

type RateType = Rule['rateType'];
type FilterKey = 'ALL' | 'ACTIVE' | 'INACTIVE';
type FeeApplication = 'MANDATE_TRANSACTION' | 'RETAIL_ORDER' | 'PURCHASE_ORDER';

const RATE_TYPES: { key: RateType; label: string; symbol: string; helper: string }[] = [
  { key: 'PERCENTAGE', label: 'Percentage', symbol: '%', helper: 'Enter as a decimal — 0.01 = 1% of order value.' },
  { key: 'PER_UNIT', label: 'Per Unit', symbol: '∕', helper: 'Amount charged per unit, e.g. per kg or per item.' },
  { key: 'FLAT', label: 'Flat Fee', symbol: '₱', helper: 'Fixed amount in PHP charged per order.' },
];

const FEE_APPLICATIONS: { key: FeeApplication; label: string }[] = [
  { key: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { key: 'RETAIL_ORDER', label: 'Retail Order' },
  { key: 'MANDATE_TRANSACTION', label: 'Mandate Transaction' },
];

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'INACTIVE', label: 'Inactive' },
];

/** Strips anything that isn't a digit or a decimal point, and collapses to a single point. */
function sanitizeDecimalInput(text: string): string {
  const digitsAndDots = text.replace(/[^0-9.]/g, '');
  const firstDot = digitsAndDots.indexOf('.');
  if (firstDot === -1) return digitsAndDots;
  return digitsAndDots.slice(0, firstDot + 1) + digitsAndDots.slice(firstDot + 1).replace(/\./g, '');
}

function formatRate(rule: Rule) {
  if (rule.rateType === 'PERCENTAGE') return `${(rule.rate * 100).toLocaleString()}%`;
  if (rule.rateType === 'PER_UNIT') return `₱${rule.rate.toLocaleString()} / unit`;
  return `₱${rule.rate.toLocaleString()}`;
}

function formatAppliesTo(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

/** Server-side feeConfigPage permission is the authorization boundary. */
export default function FeeConfigScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rate, setRate] = useState('');
  const [rateType, setRateType] = useState<RateType>('PERCENTAGE');
  const [appliesTo, setAppliesTo] = useState<FeeApplication>('PURCHASE_ORDER');
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRules((await graphQLRequest<{ listFeeRules: Rule[] }>(LIST)).listFeeRules);
    } catch (e: any) {
      Alert.alert('Fee configuration unavailable', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    const trimmed = rate.trim();
    const isNumeric = /^\d+(\.\d+)?$/.test(trimmed);
    const value = Number(trimmed);

    if (!isNumeric || !Number.isFinite(value) || value < 0) {
      return Alert.alert('Invalid rate', 'Enter a non-negative number, digits only (e.g. 0.01 or 250).');
    }

    setSaving(true);
    try {
      await graphQLRequest(CREATE, {
        appliesTo,
        rateType,
        rate: value,
        effectiveFrom: new Date().toISOString(),
      });
      setRate('');
      await load();
    } catch (e: any) {
      Alert.alert('Unable to save fee rule', e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rule: Rule) => {
    try {
      await graphQLRequest(TOGGLE, { id: rule.id, isActive: !rule.isActive });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)));
      await load();
    } catch (e: any) {
      Alert.alert('Unable to update fee rule', e.message);
    }
  };

  const activeCount = useMemo(() => rules.filter((r) => r.isActive).length, [rules]);
  const inactiveCount = rules.length - activeCount;

  const filtered = useMemo(() => {
    if (filter === 'ACTIVE') return rules.filter((r) => r.isActive);
    if (filter === 'INACTIVE') return rules.filter((r) => !r.isActive);
    return rules;
  }, [rules, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, Rule[]>();
    for (const r of filtered) {
      const key = r.appliesTo;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    for (const list of map.values()) {
      list.sort((a, b) => Number(b.isActive) - Number(a.isActive));
    }
    return Array.from(map.entries());
  }, [filtered]);

  const selectedType = RATE_TYPES.find((t) => t.key === rateType)!;
  const isRateValid = /^\d+(\.\d+)?$/.test(rate.trim()) && Number(rate) >= 0;

  const formCard = (
    <View style={[styles.card, styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>NEW RULE</Text>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Add a fee rule</Text>

      <View style={{ gap: 8 }}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Applies to</Text>
        <View style={styles.chipRow}>
          {FEE_APPLICATIONS.map((app) => {
            const selected = appliesTo === app.key;
            return (
              <TouchableOpacity
                key={app.key}
                onPress={() => setAppliesTo(app.key)}
                activeOpacity={0.8}
                style={[
                  styles.filterChip,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>
                  {app.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Rate type</Text>
        <View style={styles.pillRow}>
        {RATE_TYPES.map((t) => {
          const selected = rateType === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setRateType(t.key)}
              activeOpacity={0.8}
              style={[
                styles.pill,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary + '18' : 'transparent',
                },
              ]}
            >
              <View
                style={[
                  styles.pillSymbol,
                  { backgroundColor: selected ? colors.primary : colors.border },
                ]}
              >
                <Text style={[styles.pillSymbolText, { color: selected ? '#fff' : colors.textSecondary }]}>
                  {t.symbol}
                </Text>
              </View>
              <Text style={[styles.pillLabel, { color: colors.text, fontWeight: selected ? '700' : '500' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        </View>
      </View>

      <View>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Rate</Text>
        <TextInput
          value={rate}
          onChangeText={(text) => setRate(sanitizeDecimalInput(text))}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder={selectedType.key === 'PERCENTAGE' ? '0.01' : '0.00'}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        />
        <Text style={[styles.helper, { color: colors.textSecondary }]}>{selectedType.helper}</Text>
      </View>

      <TouchableOpacity
        onPress={add}
        disabled={saving || !isRateValid}
        activeOpacity={0.85}
        style={[styles.save, { backgroundColor: colors.primary, opacity: saving || !isRateValid ? 0.5 : 1 }]}
      >
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Add Fee Rule</Text>}
      </TouchableOpacity>
    </View>
  );

  const listSection = (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={styles.listHeaderRow}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Fee Rules</Text>
        <View style={styles.summaryPill}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            {activeCount} active · {inactiveCount} inactive
          </Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const selected = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : 'transparent',
                },
              ]}
            >
              <Text style={{ color: selected ? '#fff' : colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerPad}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : groups.length === 0 ? (
        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No fee rules {filter !== 'ALL' ? 'here' : 'yet'}</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            {filter !== 'ALL'
              ? 'Try a different filter to see more rules.'
              : 'Rules you add will show up here and apply to new payment attempts.'}
          </Text>
        </View>
      ) : (
        groups.map(([appliesTo, groupRules]) => (
          <View key={appliesTo} style={{ gap: 8 }}>
            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
              {formatAppliesTo(appliesTo)}
            </Text>
            <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {groupRules.map((rule, i) => {
                const symbol = RATE_TYPES.find((t) => t.key === rule.rateType)?.symbol ?? '•';
                return (
                  <View
                    key={rule.id}
                    style={[
                      styles.ruleRow,
                      i < groupRules.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={[styles.ruleSymbol, { backgroundColor: colors.primary + '18' }]}>
                      <Text style={[styles.ruleSymbolText, { color: colors.primary }]}>{symbol}</Text>
                    </View>

                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[styles.ruleRate, { color: colors.text }]}>{formatRate(rule)}</Text>
                      <Text style={[styles.ruleMeta, { color: colors.textSecondary }]}>
                        Effective {new Date(rule.effectiveFrom).toLocaleDateString()}
                        {rule.effectiveTo ? ` – ${new Date(rule.effectiveTo).toLocaleDateString()}` : ''}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => toggle(rule)}
                      activeOpacity={0.75}
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: rule.isActive ? colors.primary + '18' : colors.border + '60',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: rule.isActive ? colors.primary : colors.textSecondary, marginRight: 6 },
                        ]}
                      />
                      <Text
                        style={{
                          color: rule.isActive ? colors.primary : colors.textSecondary,
                          fontWeight: '700',
                          fontSize: 12.5,
                        }}
                      >
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <ScrollView style={[styles.page, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={{ gap: 4 }}>
        <Text style={[styles.title, { color: colors.text }]}>Fee Configuration</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Rules affect new payment attempts only. Historical payment snapshots never change.
        </Text>
      </View>

      {isWide ? (
        <View style={styles.wideLayout}>
          <View style={styles.wideFormCol}>{formCard}</View>
          <View style={styles.wideListCol}>{listSection}</View>
        </View>
      ) : (
        <>
          {formCard}
          {listSection}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 20, gap: 22, maxWidth: 1100, width: '100%', alignSelf: 'center' },

  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 14, lineHeight: 20, maxWidth: 520 },

  wideLayout: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  wideFormCol: { width: 340 },
  wideListCol: { flex: 1 },

  card: { borderWidth: 1, borderRadius: 16, padding: 18 },
  formCard: { gap: 14 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  fieldLabel: { fontSize: 12.5, fontWeight: '600' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  pillSymbol: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pillSymbolText: { fontSize: 12, fontWeight: '800' },
  pillLabel: { fontSize: 13.5 },

  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  helper: { fontSize: 12.5, marginTop: 6, lineHeight: 17 },

  save: { borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, marginTop: 2 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  summaryPill: { flexDirection: 'row', alignItems: 'center' },
  summaryText: { fontSize: 13, fontWeight: '600' },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },

  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },

  centerPad: { paddingVertical: 32, alignItems: 'center' },

  emptyState: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 28, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyBody: { fontSize: 13.5, textAlign: 'center', maxWidth: 320, lineHeight: 19 },

  groupLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', paddingLeft: 2 },
  groupCard: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },

  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  ruleSymbol: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  ruleSymbolText: { fontSize: 14, fontWeight: '800' },
  ruleRate: { fontSize: 15.5, fontWeight: '700' },
  ruleMeta: { fontSize: 12.5 },

  statusPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
});