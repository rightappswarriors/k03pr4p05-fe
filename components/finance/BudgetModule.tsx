// components/finance/BudgetModule.tsx
// Budget planner — mirrors Image 2 (the Budget Info screen from their old ERP)
// but clean and mobile-friendly.
//
// What it does:
//   - Pick a year and account (chart of accounts category)
//   - Enter a budget amount for each month + beginning balance
//   - Compare budgeted vs actual (actual comes from GIS expense rows)
//   - Shows variance: over/under budget per month
//   - Warns if cumulative monthly budgets exceed beginning balance

import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Plus, X, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { BudgetService } from '@/services/budgetService';
import { useResponsive } from '@/hooks/useResponsive';
import type { GISRow } from '@/data/SummaryData';

// ─── Types ────────────────────────────────────────────────────────────────────

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
type Month = (typeof MONTHS)[number];

// Accounts from the GIS groups — these are what you budget against
const ACCOUNT_OPTIONS = [
  'Salaries and Wages',
  'SSS / PhilHealth / Pag-IBIG',
  'Electricity',
  'Rent Expense',
  'Internet and Communication',
  'Fuel and Transportation',
  'Office Supplies',
  'Representation and Entertainment',
  'VAT Payable',
  'Depreciation',
  'Cost of Sales',
  'Delivery Fee',
  'Other Operating Expenses',
];

const getBudgetYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear + 1, currentYear + 2].map(String);
};

interface BudgetEntry {
  id: string;
  year: string;
  account: string;
  begBal: number;
  months: Record<Month, number>;
}

// ─── Compute actuals from GIS rows ────────────────────────────────────────────
// Maps GIS description text to account names — rough match

function getActualForAccount(account: string, gisRows: GISRow[]): number {
  const match = gisRows.find((r) =>
    r.description
      .toLowerCase()
      .includes(account.toLowerCase().split(' ')[0].toLowerCase()),
  );
  return match ? Math.abs(match.total) : 0;
}

// ─── Budget Entry Form ────────────────────────────────────────────────────────

function BudgetEntryModal({
  visible,
  onClose,
  onSave,
  colors,
  existing,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (entry: BudgetEntry) => void;
  colors: any;
  existing?: BudgetEntry;
}) {
  const defaultYear = existing?.year ?? getBudgetYearOptions()[0];
  const [year, setYear] = useState(defaultYear);
  const [account, setAccount] = useState(existing?.account ?? '');
  const [begBal, setBegBal] = useState(String(existing?.begBal ?? 0));
  const [showAccounts, setShowAccounts] = useState(false);
  const [monthVals, setMonthVals] = useState<Record<Month, string>>(
    MONTHS.reduce(
      (acc, m) => ({ ...acc, [m]: String(existing?.months[m] ?? 0) }),
      {} as Record<Month, string>,
    ),
  );
  const [error, setError] = useState('');

  useEffect(() => {
    setYear(existing?.year ?? getBudgetYearOptions()[0]);
    setAccount(existing?.account ?? '');
    setBegBal(String(existing?.begBal ?? 0));
    setMonthVals(
      MONTHS.reduce(
        (acc, m) => ({ ...acc, [m]: String(existing?.months[m] ?? 0) }),
        {} as Record<Month, string>,
      ),
    );
  }, [existing]);

  const total = MONTHS.reduce((s, m) => s + (parseFloat(monthVals[m]) || 0), 0);
  const begBalNum = parseFloat(begBal) || 0;
  const remainingBudget = begBalNum - total;
  const isOverBudget = remainingBudget < 0;

  const handleSave = () => {
    if (!account) {
      setError('Please select an account.');
      return;
    }
    const entry: BudgetEntry = {
      id: existing?.id ?? `bgt_${Date.now()}`,
      year,
      account,
      begBal: parseFloat(begBal) || 0,
      months: MONTHS.reduce(
        (acc, m) => ({ ...acc, [m]: parseFloat(monthVals[m]) || 0 }),
        {} as Record<Month, number>,
      ),
    };
    onSave(entry);
    onClose();
  };

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 32,
      maxHeight: '95%',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 16, fontWeight: '800', color: colors.text },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 6,
      marginTop: 14,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      color: colors.text,
    },
    yearRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    yearPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    yearAct: { borderColor: colors.primary, backgroundColor: colors.primary },
    accBtn: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    accList: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      marginTop: 4,
      overflow: 'hidden',
    },
    accItem: {
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    mCell: { width: '47%' },
    mLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    mInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 13,
      color: colors.text,
      textAlign: 'right',
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 20,
    },
    saveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
    errTxt: { fontSize: 12, color: colors.error, marginTop: 6 },
    totalRow: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    warningBox: {
      backgroundColor: colors.error + '15',
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
      borderWidth: 1,
      borderColor: colors.error,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    warningText: {
      fontSize: 12,
      color: colors.error,
      flex: 1,
      lineHeight: 18,
    },
    balanceRow: {
      backgroundColor: isOverBudget ? colors.error + '15' : colors.success + '15',
      borderRadius: 10,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: isOverBudget ? colors.error : colors.success,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });
  const { isDesktop } = useResponsive();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>
              {existing ? 'Edit Budget' : 'New Budget Entry'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.label}>YEAR</Text>
            <View style={s.yearRow}>
              {Array.from(
                new Set([...getBudgetYearOptions(), existing?.year ?? year]),
              )
                .filter(Boolean)
                .map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[s.yearPill, year === y && s.yearAct]}
                    onPress={() => setYear(y)}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: year === y ? '#fff' : colors.text,
                      }}
                    >
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            <Text style={s.label}>ACCOUNT *</Text>
            <TouchableOpacity
              style={s.accBtn}
              onPress={() => setShowAccounts((v) => !v)}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: account ? colors.text : colors.textSecondary,
                }}
              >
                {account || 'Select account…'}
              </Text>
              <Text style={{ color: colors.textSecondary }}>▾</Text>
            </TouchableOpacity>
            {showAccounts && (
              <View style={s.accList}>
                {ACCOUNT_OPTIONS.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={s.accItem}
                    onPress={() => {
                      setAccount(a);
                      setShowAccounts(false);
                    }}
                  >
                    <Text style={{ fontSize: 13, color: colors.text }}>
                      {a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.label}>BEGINNING BALANCE ₱</Text>
            <TextInput
              style={s.input}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={begBal}
              onChangeText={setBegBal}
              keyboardType="decimal-pad"
            />

            <Text style={s.label}>MONTHLY BUDGET AMOUNTS ₱</Text>
            <View style={s.grid}>
              {MONTHS.map((m) => (
                <View key={m} style={s.mCell}>
                  <Text style={s.mLabel}>{m}</Text>
                  <TextInput
                    style={s.mInput}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={monthVals[m]}
                    onChangeText={(v) =>
                      setMonthVals((prev) => ({ ...prev, [m]: v }))
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>

            <View style={s.totalRow}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: colors.textSecondary,
                }}
              >
                ANNUAL BUDGET TOTAL
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '900',
                  color: colors.primary,
                }}
              >
                ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {/* Remaining Balance Calculation */}
            <View style={s.balanceRow}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: isOverBudget ? colors.error : colors.success,
                }}
              >
                REMAINING BALANCE
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '900',
                  color: isOverBudget ? colors.error : colors.success,
                }}
              >
                ₱{remainingBudget.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {/* Warning if over budget */}
            {isOverBudget && (
              <View style={s.warningBox}>
                <AlertTriangle size={18} color={colors.error} strokeWidth={2.5} />
                <Text style={s.warningText}>
                  <Text style={{ fontWeight: '700' }}>Budget Exceeded!</Text>
                  {'\n'}
                  Your monthly budgets total ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}, which is ₱{Math.abs(remainingBudget).toLocaleString('en-PH', { minimumFractionDigits: 2 })} more than your beginning balance of ₱{begBalNum.toLocaleString('en-PH', { minimumFractionDigits: 2 })}. Consider adjusting your monthly amounts or increasing the beginning balance.
                </Text>
              </View>
            )}

            {error ? <Text style={s.errTxt}>{error}</Text> : null}
            <TouchableOpacity
              style={s.saveBtn}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={s.saveTxt}>Save Budget</Text>
            </TouchableOpacity>
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Budget List + Comparison View ────────────────────────────────────────────

export function BudgetModule({
  gisRows,
  colors,
}: {
  gisRows: GISRow[];
  colors: any;
}) {
  const [budgets, setBudgets] = useState<BudgetEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<BudgetEntry | undefined>();
  const [activeYear, setActiveYear] = useState(getBudgetYearOptions()[0]);
  const [openBudgetId, setOpenBudgetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadBudgets = async () => {
      setLoading(true);
      try {
        const rows = await BudgetService.getBudgetEntries();
        if (!mounted) return;
        setBudgets(
          rows.map((item) => ({
            id: String(item.id),
            year: String(item.year),
            account: item.account,
            begBal: Number(item.begBal ?? 0),
            months: {
              ...MONTHS.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<Month, number>),
              ...(item.months ?? {}),
            },
          })),
        );
      } catch (error) {
        if (__DEV__) console.warn('Unable to load budgets', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadBudgets();
    return () => {
      mounted = false;
    };
  }, []);

  const yearOptions = useMemo(() => {
    const years = new Set<string>([...getBudgetYearOptions(), ...budgets.map((b) => b.year)]);
    return Array.from(years).sort((a, b) => Number(a) - Number(b));
  }, [budgets]);

  const yearBudgets = budgets.filter((b) => b.year === activeYear);

  const saveBudget = async (entry: BudgetEntry) => {
    try {
      const payload = {
        year: Number(entry.year),
        account: entry.account,
        begBal: entry.begBal,
        months: entry.months,
      };
      const saved = entry.id.startsWith('bgt_')
        ? await BudgetService.createBudgetEntry(payload.year, payload.account, payload.begBal, payload.months)
        : await BudgetService.updateBudgetEntry(Number(entry.id), payload.year, payload.account, payload.begBal, payload.months);

      const persisted: BudgetEntry = {
        id: String(saved.id),
        year: String(saved.year),
        account: saved.account,
        begBal: Number(saved.begBal ?? 0),
        months: {
          ...MONTHS.reduce((acc, m) => ({ ...acc, [m]: 0 }), {} as Record<Month, number>),
          ...(saved.months ?? {}),
        },
      };

      setBudgets((prev) => {
        const exists = prev.find((b) => b.id === persisted.id);
        return exists
          ? prev.map((b) => (b.id === persisted.id ? persisted : b))
          : [persisted, ...prev];
      });
      setActiveYear(persisted.year);
    } catch (error) {
      if (__DEV__) console.warn('Unable to save budget', error);
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      await BudgetService.deleteBudgetEntry(Number(id));
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      if (openBudgetId === id) {
        setOpenBudgetId(null);
      }
    } catch (error) {
      if (__DEV__) console.warn('Unable to delete budget', error);
    }
  };

  const s = StyleSheet.create({
    wrap: { marginTop: 8 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionTt: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    addTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
    yearRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
    yearPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    yearAct: { borderColor: colors.primary, backgroundColor: colors.primary },
    empty: {
      alignItems: 'center',
      padding: 32,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTxt: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      overflow: 'hidden',
    },
    cardHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    account: { fontSize: 14, fontWeight: '700', color: colors.text },
    annual: { fontSize: 13, fontWeight: '700', color: colors.primary },
    monthGrid: { padding: 12 },
    monthRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '80',
    },
    mName: { fontSize: 12, color: colors.textSecondary, width: 36 },
    mBudget: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      textAlign: 'right',
    },
    mActual: { fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' },
    mVariance: { fontSize: 11, fontWeight: '700', flex: 1, textAlign: 'right' },
    colHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.background,
    },
    colHdTxt: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    delBtn: { padding: 6 },
    budgetWarning: {
      backgroundColor: colors.error + '15',
      borderLeftWidth: 3,
      borderLeftColor: colors.error,
      padding: 10,
      marginHorizontal: 14,
      marginTop: 8,
      marginBottom: 4,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    budgetWarningText: {
      fontSize: 11,
      color: colors.error,
      flex: 1,
      lineHeight: 16,
    },
  });

  return (
    <View style={s.wrap}>
      <View style={s.headerRow}>
        <Text style={s.sectionTt}>Budget Planner</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => {
            setEditEntry(undefined);
            setModalOpen(true);
          }}
        >
          <Plus size={13} color="#fff" strokeWidth={2.5} />
          <Text style={s.addTxt}>New Budget</Text>
        </TouchableOpacity>
      </View>

      {/* Year selector */}
      <View style={s.yearRow}>
        {yearOptions.map((y) => (
          <TouchableOpacity
            key={y}
            style={[s.yearPill, activeYear === y && s.yearAct]}
            onPress={() => setActiveYear(y)}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: activeYear === y ? '#fff' : colors.text,
              }}
            >
              {y}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {yearBudgets.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 28 }}>📊</Text>
          <Text style={s.emptyTxt}>
            No budget entries for {activeYear} yet.{'\n'}Tap "New Budget" to
            start planning.
          </Text>
        </View>
      ) : (
        yearBudgets.map((entry) => {
          const annualTotal = MONTHS.reduce((s, m) => s + entry.months[m], 0);
          const actual = getActualForAccount(entry.account, gisRows);
          const remainingBudget = entry.begBal - annualTotal;
          const isOverBudget = remainingBudget < 0;

          return (
            <View key={entry.id} style={s.card}>
              <View style={s.cardHead}>
                <View>
                  <Text style={s.account}>{entry.account}</Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {entry.year} · Beg. Bal: ₱{entry.begBal.toLocaleString()}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.annual}>₱{annualTotal.toLocaleString()}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setOpenBudgetId((prev) => (prev === entry.id ? null : entry.id));
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.textSecondary,
                          fontWeight: '700',
                        }}
                      >
                        {openBudgetId === entry.id ? 'Collapse' : 'Details'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Warning if budget exceeds beginning balance */}
              {isOverBudget && (
                <View style={s.budgetWarning}>
                  <AlertTriangle size={16} color={colors.error} strokeWidth={2.5} />
                  <Text style={s.budgetWarningText}>
                    <Text style={{ fontWeight: '700' }}>Over Budget:</Text> Monthly totals exceed beginning balance by ₱{Math.abs(remainingBudget).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    setEditEntry(entry);
                    setModalOpen(true);
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.primary,
                      fontWeight: '600',
                    }}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteBudget(entry.id)}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.error,
                      fontWeight: '600',
                    }}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Column headers */}
              <View style={[s.colHead, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                <Text style={[s.colHdTxt, { width: 36 }]}>MO</Text>
                <Text style={[s.colHdTxt, { flex: 1, textAlign: 'right' }]}>
                  BUDGETED
                </Text>
                <Text style={[s.colHdTxt, { flex: 1, textAlign: 'right' }]}>
                  ACTUAL
                </Text>
                <Text style={[s.colHdTxt, { flex: 1, textAlign: 'right' }]}>
                  VARIANCE
                </Text>
              </View>

              {openBudgetId === entry.id ? (
                <View style={s.monthGrid}>
                  {MONTHS.map((m) => {
                    const budgeted = entry.months[m];
                    const monthActual = budgeted > 0 ? actual / 12 : 0;
                    const variance = budgeted - monthActual;
                    const isOver = variance < 0;
                    const varianceColor = budgeted === 0 ? colors.textSecondary : isOver ? colors.error : colors.success;
                    return (
                      <View key={m} style={s.monthRow}>
                        <Text style={s.mName}>{m}</Text>
                        <Text style={s.mBudget}>
                          ₱{budgeted.toLocaleString()}
                        </Text>
                        <Text
                          style={[s.mActual, { color: colors.textSecondary }]}
                        >
                          {monthActual > 0 ? `₱${monthActual.toFixed(0)}` : '—'}
                        </Text>
                        <Text
                          style={[s.mVariance, { color: varianceColor }]}
                        >
                          {budgeted === 0
                            ? '—'
                            : `${isOver ? '▼' : '▲'} ₱${Math.abs(variance).toFixed(0)}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <BudgetEntryModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={saveBudget}
        colors={colors}
        existing={editEntry}
      />
    </View>
  );
}