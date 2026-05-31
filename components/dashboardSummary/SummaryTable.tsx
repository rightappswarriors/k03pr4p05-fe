import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import {
  X,
  ChevronRight,
  LucideIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Edit2,
  Save,
} from 'lucide-react-native';
import { SkeletonPulse } from '@/app/(erp)/branch';
import {
  formatPeso,
  formatPesoCompact,
  getProfitOrExpense,
} from '@/utils/moneyHelpers';
import { GISRow, SummaryRow } from '@/data/SummaryData';
import { useTheme } from '@/contexts/ThemeContext';
import { DropdownField } from '@/app/(erp)/branch';
import { FinanceService } from '@/services';

export function SkeletonStatCard({ colors }: { colors: any }) {
  return (
    <View style={[sk.statCard, { backgroundColor: colors.card }]}>
      <SkeletonPulse
        colors={colors}
        style={{ width: 22, height: 22, borderRadius: 11 }}
      />
      <SkeletonPulse
        colors={colors}
        style={{ width: '80%', height: 20, marginTop: 8 }}
      />
      <SkeletonPulse
        colors={colors}
        style={{ width: '60%', height: 12, marginTop: 6 }}
      />
    </View>
  );
}

export function SkeletonBranchCard({ colors }: { colors: any }) {
  return (
    <View
      style={[
        sk.branchCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonPulse colors={colors} style={{ width: '55%', height: 15 }} />
          <SkeletonPulse colors={colors} style={{ width: '35%', height: 12 }} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <SkeletonPulse colors={colors} style={{ width: 80, height: 16 }} />
          <SkeletonPulse colors={colors} style={{ width: 55, height: 11 }} />
        </View>
      </View>
      <SkeletonPulse
        colors={colors}
        style={{ width: 90, height: 13, marginTop: 6 }}
      />
    </View>
  );
}

export function SkeletonTableRow({ colors }: { colors: any }) {
  return (
    <View style={[sk.tableRow, { borderBottomColor: colors.border }]}>
      {[220, 200, 130, 130].map((w, i) => (
        <View key={i} style={{ width: w, padding: 10 }}>
          <SkeletonPulse colors={colors} style={{ height: 12, width: '85%' }} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonFinancialCard({
  colors,
  cardWidth,
}: {
  colors: any;
  cardWidth: number;
}) {
  return (
    <View
      style={[
        sk.financialCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          width: cardWidth - 12,
        },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <SkeletonPulse colors={colors} style={{ width: '60%', height: 14 }} />
        <SkeletonPulse
          colors={colors}
          style={{ width: 18, height: 18, borderRadius: 9 }}
        />
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <SkeletonPulse colors={colors} style={{ width: 70, height: 13 }} />
        <SkeletonPulse colors={colors} style={{ width: 80, height: 16 }} />
      </View>
    </View>
  );
}

// ─── Financial Card Component ─────────────────────────────────────────────────

interface FinancialCardGIS {
  type: 'gis';
  row: GISRow;
}
interface FinancialCardSummary {
  type: 'summary';
  row: SummaryRow;
}
export type FinancialCardData = FinancialCardGIS | FinancialCardSummary;

// ─── Edit GIS Row Modal ───────────────────────────────────────────────────────

interface EditGISModalProps {
  visible: boolean;
  row: GISRow | null;
  onClose: () => void;
  onSave: (updatedRow: GISRow) => void;
  colors: any;
  accountTitles: { id: string; label: string }[];
  centers: { id: string; label: string }[];
  subCenters: { id: string; label: string }[];
}

function EditGISModal({
  visible,
  row,
  onClose,
  onSave,
  colors,
  accountTitles,
  centers,
  subCenters,
}: EditGISModalProps) {
  const [editForm, setEditForm] = useState({
    description: row?.description || '',
    debit: row?.debit?.toString() || '0',
    credit: row?.credit?.toString() || '0',
    accountTitleId: row?.accountTitleId?.toString() || '',
    centerId: row?.centerId?.toString() || '',
    subCenterId: row?.subCenterId?.toString() || '',
    main: row?.main || 'Expenses',
    group: row?.group || 'General',
    code: row?.code || '',
  });

  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  React.useEffect(() => {
    if (row) {
      setEditForm({
        description: row.description || '',
        debit: row.debit?.toString() || '0',
        credit: row.credit?.toString() || '0',
        accountTitleId: row.accountTitleId?.toString() || '',
        centerId: row.centerId?.toString() || '',
        subCenterId: row.subCenterId?.toString() || '',
        main: row.main || 'Expenses',
        group: row.group || 'General',
        code: row.code || '',
      });
    }
  }, [row]);

  const handleSave = async () => {
    if (!row) return;

    try {
      const updated = await FinanceService.updateGISRow(
        Number(row.id),
        Number(editForm.accountTitleId) || undefined,
        Number(editForm.centerId) || undefined,
        Number(editForm.subCenterId) || undefined,
        parseFloat(editForm.debit) || 0,
        parseFloat(editForm.credit) || 0,
        editForm.description,
        editForm.main,
        editForm.group,
        editForm.code,
      );

      onSave({
        ...row,
        description: editForm.description,
        debit: parseFloat(editForm.debit) || 0,
        credit: parseFloat(editForm.credit) || 0,
        total:
          (parseFloat(editForm.debit) || 0) -
          (parseFloat(editForm.credit) || 0),
        accountTitleId: Number(editForm.accountTitleId),
        centerId: Number(editForm.centerId),
        subCenterId: Number(editForm.subCenterId),
        main: editForm.main,
        group: editForm.group,
        code: editForm.code,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update GIS row:', error);
    }
  };

  if (!row) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={em.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={[
            em.sheet,
            isTablet && em.sheetTablet,
            { backgroundColor: colors.surface },
          ]}
          activeOpacity={1}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={[em.header, { borderBottomColor: colors.border }]}>
            <Edit2 size={20} color={colors.primary} strokeWidth={2} />
            <Text style={[em.title, { color: colors.text }]}>Edit Entry</Text>
            <TouchableOpacity
              style={[em.closeBtn, { backgroundColor: colors.background }]}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={16} color={colors.text} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            contentContainerStyle={em.body}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
          >
            <Text style={[em.fieldLabel, { color: colors.textSecondary }]}>
              Description
            </Text>
            <TextInput
              style={[
                em.input,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Entry description"
              placeholderTextColor={colors.textSecondary}
              value={editForm.description}
              onChangeText={(v) =>
                setEditForm((f) => ({ ...f, description: v }))
              }
              multiline
              numberOfLines={2}
            />

            <View
              style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[em.fieldLabel, { color: colors.textSecondary }]}>
                  Debit (₱)
                </Text>
                <TextInput
                  style={[
                    em.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={editForm.debit}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, debit: v }))}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[em.fieldLabel, { color: colors.textSecondary }]}>
                  Credit (₱)
                </Text>
                <TextInput
                  style={[
                    em.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={editForm.credit}
                  onChangeText={(v) =>
                    setEditForm((f) => ({ ...f, credit: v }))
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View
              style={[
                em.totalPreview,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[em.totalLabel, { color: colors.textSecondary }]}>
                Total (Credit - Debit)
              </Text>
              <Text
                style={[
                  em.totalValue,
                  {
                    color:
                      (parseFloat(editForm.debit) || 0) -
                        (parseFloat(editForm.credit) || 0) >=
                      0
                        ? colors.success
                        : colors.error,
                  },
                ]}
              >
                {formatPeso(
                  (parseFloat(editForm.debit) || 0) -
                    (parseFloat(editForm.credit) || 0),
                )}
              </Text>
            </View>

            <DropdownField
              label="Account Title"
              value={editForm.accountTitleId}
              options={accountTitles}
              onSelect={(v) =>
                setEditForm((f) => ({ ...f, accountTitleId: String(v.id) }))
              }
              colors={colors}
            />

            <View
              style={{ flexDirection: isTablet ? 'row' : 'column', gap: 12 }}
            >
              <View style={{ flex: 1 }}>
                <DropdownField
                  label="Center / Dept"
                  value={editForm.centerId}
                  options={centers}
                  onSelect={(v) =>
                    setEditForm((f) => ({ ...f, centerId: String(v.id) }))
                  }
                  colors={colors}
                />
              </View>
              <View style={{ flex: 1 }}>
                <DropdownField
                  label="Sub Center"
                  value={editForm.subCenterId}
                  options={subCenters}
                  onSelect={(v) =>
                    setEditForm((f) => ({ ...f, subCenterId: String(v.id) }))
                  }
                  colors={colors}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                em.saveBtn,
                {
                  backgroundColor: colors.primary,
                  opacity:
                    !editForm.description ||
                    !editForm.accountTitleId ||
                    !editForm.centerId ||
                    !editForm.subCenterId
                      ? 0.5
                      : 1,
                },
              ]}
              onPress={handleSave}
              disabled={
                !editForm.description ||
                !editForm.accountTitleId ||
                !editForm.centerId ||
                !editForm.subCenterId
              }
              activeOpacity={0.85}
            >
              <Save size={16} color="#fff" strokeWidth={2} />
              <Text style={em.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

export function FinancialDetailModal({
  visible,
  data,
  onClose,
  colors,
}: {
  visible: boolean;
  data: FinancialCardData | null;
  onClose: () => void;
  colors: any;
}) {
  if (!data) return null;
  const isGIS = data.type === 'gis';

  const fields: { label: string; value: string; valueColor?: string }[] = isGIS
    ? [
        { label: 'Description', value: data.row.description },
        {
          label: 'Category',
          value: data.row.main,
          valueColor:
            data.row.main === 'Income' ? colors.success : colors.error,
        },
        { label: 'Item Code', value: data.row.code },
        { label: 'Group', value: data.row.group },

        {
          label: 'Credit',
          value: data.row.credit > 0 ? formatPeso(data.row.credit) : '—',
          valueColor:
            data.row.credit > 0 ? colors.success : colors.textSecondary,
        },
        {
          label: 'Debit',
          value: data.row.debit > 0 ? formatPeso(data.row.debit) : '—',
          valueColor: data.row.debit > 0 ? colors.error : colors.textSecondary,
        },
        {
          label: 'Net Total',
          value: formatPeso(data.row.total),
          valueColor: data.row.total >= 0 ? colors.success : colors.error,
        },
      ]
    : [
        { label: 'Item Name', value: data.row.description },
        {
          label: 'Status',
          value: data.row.netProfit >= 0 ? 'Income' : 'Expense',
          valueColor: data.row.netProfit >= 0 ? colors.success : colors.error,
        },
        { label: 'Item Code', value: data.row.itemCode },
        {
          label: '% OpEx Contribution',
          value: `${(data.row.opExPct * 100).toFixed(0)}%`,
        },
        {
          label: 'Selling Price',
          value: formatPeso(data.row.sellingPrice),
        },
        {
          label: 'Cost Contribution',
          value: formatPeso(data.row.costContribution),
        },
        {
          label: 'OpEx Amount',
          value: formatPeso(data.row.opExAmount),
        },
        {
          label: 'Total Cost',
          value: formatPeso(data.row.costContribution + data.row.opExAmount),
          valueColor:
            getProfitOrExpense(data.row.netProfit) >= 0
              ? colors.success
              : colors.error,
        },
        {
          label: data.row.netProfit > 0 ? 'Profit' : 'Loss (Net Profit)',
          value: `${data.row.netProfit > 0 ? '' : '-'}${formatPeso(
            getProfitOrExpense(data.row.netProfit),
          )}`,
          valueColor:
            getProfitOrExpense(data.row.netProfit) >= 0
              ? colors.success
              : colors.error,
        },
      ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={dm.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={[dm.sheet, { backgroundColor: colors.surface }]}
          activeOpacity={1}
          onPress={() => {}}
        >
          {/* Header */}
          <View style={[dm.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text
                style={[dm.title, { color: colors.text }]}
                numberOfLines={1}
              >
                {isGIS ? data.row.description : data.row.description}
              </Text>
              <Text style={[dm.subtitle, { color: colors.textSecondary }]}>
                {isGIS ? 'Expense Summary Entry' : 'Item Net Summary Entry'}
              </Text>
            </View>
            <TouchableOpacity
              style={[dm.closeBtn, { backgroundColor: colors.background }]}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={16} color={colors.text} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            contentContainerStyle={dm.body}
            showsVerticalScrollIndicator={false}
          >
            {fields.map((f) => (
              <View
                key={f.label}
                style={[dm.row, { borderBottomColor: colors.border }]}
              >
                <Text style={[dm.fieldLabel, { color: colors.textSecondary }]}>
                  {f.label}
                </Text>
                <Text
                  style={[
                    dm.fieldValue,
                    { color: f.valueColor || colors.text },
                  ]}
                >
                  {f.value}
                </Text>
              </View>
            ))}

            {data.type === 'summary' &&
            Array.isArray(data.row.costLines) &&
            data.row.costLines.length > 0 ? (
              <View
                style={{
                  marginTop: 8,
                  paddingTop: 4,
                  paddingHorizontal: 10,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: '700',
                    marginBottom: 12,
                    marginLeft: 8,
                  }}
                >
                  Cost Breakdown
                </Text>

                {data.row.costLines?.map((line, idx) => (
                  <View
                    key={`${line.label}-${idx}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      backgroundColor:
                        idx % 2 === 0 ? colors.background : 'transparent',
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 13,
                        flex: 1,
                      }}
                    >
                      {line.label}
                    </Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {formatPeso(line.amount)}
                    </Text>
                  </View>
                ))}

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor:
                      data.row.costLines.length % 2 === 0
                        ? colors.background
                        : 'transparent',
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      flex: 1,
                    }}
                  >
                    Operating Expense
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {formatPeso(data.row.opExAmount)}
                  </Text>
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.border,
                    marginVertical: 8,
                  }}
                />

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: colors.primary + '15',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.primary + '30',
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: '700',
                      flex: 1,
                    }}
                  >
                    Computed Cost (Total)
                  </Text>
                  <Text
                    style={{
                      color:
                        data.row.netProfit > 0 ? colors.success : colors.error,
                      fontSize: 15,
                      fontWeight: '800',
                    }}
                  >
                    {formatPeso(data.row.computedCost + data.row.opExAmount)}
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={{ height: 20 }} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── GIS Table with Edit Support ─────────────────────────────────────────────

export function GISTable({
  rows,
  colors,
  onDeleteRow,
  onEditRow,
  accountTitles,
  centers,
  subCenters,
}: {
  rows: GISRow[];
  colors: any;
  onDeleteRow?: (row: GISRow) => void;
  onEditRow?: (row: GISRow) => void;
  accountTitles?: { id: string; label: string }[];
  centers?: { id: string; label: string }[];
  subCenters?: { id: string; label: string }[];
}) {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRow, setSelectedRow] = useState<GISRow | null>(null);
  const { width } = Dimensions.get('window');
  const isDesktop = width >= 768;

  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const netIncome = totalCredit - totalDebit;

  const COL_CONFIG = [
    { flex: 1, minWidth: 90 },
    { flex: 1.2, minWidth: 110 },
    { flex: 1.8, minWidth: 220 },
    { flex: 1, minWidth: 130 },
    { flex: 1, minWidth: 130 },
    { flex: 1, minWidth: 120 },
    { flex: 0.6, minWidth: 60 },
  ];
  const HEADERS = [
    'Main',
    'Group',
    'Description',
    'Credit',
    'Debit',
    'Total',
    '',
  ];
  const rowsBg = (idx: number) =>
    idx % 2 === 0 ? colors.card : colors.background;

  const handleRowClick = (row: GISRow) => {
    if (isDesktop && onEditRow) {
      setSelectedRow(row);
      setEditModalVisible(true);
    }
  };

  const handleSave = (updatedRow: GISRow) => {
    if (onEditRow) {
      onEditRow(updatedRow);
    }
    setEditModalVisible(false);
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={{ minWidth: '100%' }}
        style={{ width: '100%' }}
      >
        <View style={{ minWidth: '100%' }}>
          {/* Header */}
          <View
            style={{ flexDirection: 'row', backgroundColor: colors.primary }}
          >
            {HEADERS.map((h, i) => (
              <View
                key={i}
                style={{
                  flex: COL_CONFIG[i].flex,
                  minWidth: COL_CONFIG[i].minWidth,
                  padding: 10,
                  alignItems: i > 2 ? 'flex-end' : 'flex-start',
                  justifyContent: i > 2 ? 'flex-start' : 'flex-end',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {h}
                </Text>
              </View>
            ))}
          </View>

          {/* Rows */}
          {rows.map((row, idx) => (
            <TouchableOpacity
              key={row.id}
              style={{
                flexDirection: 'row',
                backgroundColor: rowsBg(idx),
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
              onPress={() => handleRowClick(row)}
              activeOpacity={isDesktop ? 0.7 : 1}
            >
              <View
                style={{
                  flex: COL_CONFIG[0].flex,
                  minWidth: COL_CONFIG[0].minWidth,
                  padding: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color:
                      row.main === 'Income' ? colors.success : colors.error,
                  }}
                >
                  {row.main}
                </Text>
              </View>
              <View
                style={{
                  flex: COL_CONFIG[1].flex,
                  minWidth: COL_CONFIG[1].minWidth,
                  padding: 10,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {row.group}
                </Text>
              </View>
              <View
                style={{
                  flex: COL_CONFIG[2].flex,
                  minWidth: COL_CONFIG[2].minWidth,
                  padding: 10,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.text }}>
                  {row.description}
                </Text>
              </View>

              <View
                style={{
                  flex: COL_CONFIG[4].flex,
                  minWidth: COL_CONFIG[4].minWidth,
                  padding: 10,
                  alignItems: 'flex-end',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color:
                      row.credit > 0 ? colors.success : colors.textSecondary,
                  }}
                >
                  {row.credit > 0 ? formatPeso(row.credit) : '—'}
                </Text>
              </View>
              <View
                style={{
                  flex: COL_CONFIG[3].flex,
                  minWidth: COL_CONFIG[3].minWidth,
                  padding: 10,
                  alignItems: 'flex-end',
                  justifyContent: 'flex-end',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: row.debit > 0 ? colors.error : colors.textSecondary,
                  }}
                >
                  {row.debit > 0 ? formatPeso(row.debit) : '—'}
                </Text>
              </View>
              <View
                style={{
                  flex: COL_CONFIG[5].flex,
                  minWidth: COL_CONFIG[5].minWidth,
                  padding: 10,
                  alignItems: 'flex-end',
                  justifyContent: 'flex-end',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: row.total >= 0 ? colors.success : colors.error,
                  }}
                >
                  {formatPeso(row.total)}
                </Text>
              </View>
              <View
                style={{
                  flex: COL_CONFIG[6].flex,
                  minWidth: COL_CONFIG[6].minWidth,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isDesktop && onEditRow && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRowClick(row);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Edit2 size={14} color={colors.primary} strokeWidth={2} />
                  </TouchableOpacity>
                )}
                {onDeleteRow && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      onDeleteRow(row);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={14} color={colors.error} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Footer totals */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.primary + '22',
              borderTopWidth: 2,
              borderTopColor: colors.primary,
            }}
          >
            <View
              style={{
                flex:
                  COL_CONFIG[0].flex + COL_CONFIG[1].flex + COL_CONFIG[2].flex,
                minWidth:
                  COL_CONFIG[0].minWidth +
                  COL_CONFIG[1].minWidth +
                  COL_CONFIG[2].minWidth,
                padding: 10,
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: '800', color: colors.text }}
              >
                NET INCOME / (LOSS)
              </Text>
            </View>

            <View
              style={{
                flex: COL_CONFIG[4].flex,
                minWidth: COL_CONFIG[4].minWidth,
                padding: 10,
                alignItems: 'flex-end',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.success,
                }}
              >
                {formatPeso(totalCredit)}
              </Text>
            </View>
            <View
              style={{
                flex: COL_CONFIG[3].flex,
                minWidth: COL_CONFIG[3].minWidth,
                padding: 10,
                alignItems: 'flex-end',
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: '700', color: colors.error }}
              >
                {formatPeso(totalDebit)}
              </Text>
            </View>
            <View
              style={{
                flex: COL_CONFIG[5].flex,
                minWidth: COL_CONFIG[5].minWidth,
                padding: 10,
                alignItems: 'flex-end',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: netIncome >= 0 ? colors.success : colors.error,
                }}
              >
                {netIncome >= 0 ? '+' : '-'}
                {formatPeso(Math.abs(netIncome))}
              </Text>
            </View>
            <View
              style={{
                flex: COL_CONFIG[6].flex,
                minWidth: COL_CONFIG[6].minWidth,
              }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      {selectedRow && accountTitles && centers && subCenters && (
        <EditGISModal
          visible={editModalVisible}
          row={selectedRow}
          onClose={() => setEditModalVisible(false)}
          onSave={handleSave}
          colors={colors}
          accountTitles={accountTitles}
          centers={centers}
          subCenters={subCenters}
        />
      )}
    </>
  );
}

// ─── FinancialCard ────────────────────────────────────────────────────────────

export function FinancialCard({
  data,
  colors,
  cardWidth,
  onPress,
  onDelete,
}: {
  data: FinancialCardData;
  colors: any;
  cardWidth: number;
  onPress: (data: FinancialCardData) => void;
  onDelete?: () => void;
}) {
  const isGIS = data.type === 'gis';
  const name = isGIS ? data.row.description : data.row.description;
  const status = isGIS
    ? data.row.main
    : getProfitOrExpense(data.row.netProfit) >= 0
      ? 'Income'
      : 'Expense';
  const amount = isGIS
    ? data.row.total
    : getProfitOrExpense(data.row.netProfit);
  const statusColor = status === 'Income' ? colors.success : colors.error;

  return (
    <TouchableOpacity
      style={[
        fc.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          width: cardWidth - 12,
        },
      ]}
      onPress={() => onPress(data)}
      activeOpacity={0.82}
    >
      {/* Top row */}
      <View style={fc.topRow}>
        <Text style={[fc.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={14} color={colors.error} strokeWidth={2} />
            </TouchableOpacity>
          )}
          <ChevronRight
            size={16}
            color={colors.textSecondary}
            strokeWidth={2}
          />
        </View>
      </View>
      {/* Bottom row */}
      <View style={fc.bottomRow}>
        <Text style={[fc.status, { color: statusColor }]}>{status}</Text>
        <Text
          style={[
            fc.amount,
            { color: amount >= 0 ? colors.success : colors.error },
          ]}
        >
          {formatPesoCompact(amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Summary Table (Item Net Summary) ────────────────────────────────────────

export function SummaryTable({
  rows,
  colors,
}: {
  rows: SummaryRow[];
  colors: any;
}) {
  const totalSales = rows.reduce((s, r) => s + r.sellingPrice, 0);
  const totalContrib = rows.reduce((s, r) => s + r.costContribution, 0);
  const totalNet = rows.reduce(
    (s, r) => s + r.sellingPrice - r.costContribution,
    0,
  );

  const COL_CONFIG = [
    { flex: 2, minWidth: 160 },
    { flex: 2, minWidth: 160 },
    { flex: 1.2, minWidth: 130 },
    { flex: 1, minWidth: 110 },
    { flex: 0.8, minWidth: 90 },
  ];
  const HEADERS = [
    'Items',
    'Contribution(%) Cost', //Contribution(%) Cost
    'Selling Price',
    'Profit',
    'Status',
  ];
  const rowsBg = (idx: number) =>
    idx % 2 === 0 ? colors.card : colors.background;

  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<SummaryRow | null>(null);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ minWidth: '100%' }}
      style={{ width: '100%' }}
    >
      <View style={{ minWidth: '100%' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.accent }}>
          {HEADERS.map((h, i) => (
            <View
              key={h}
              style={{
                flex: COL_CONFIG[i].flex,
                minWidth: COL_CONFIG[i].minWidth,
                paddingHorizontal: 10,
                paddingVertical: 10,
                alignItems: i > 0 ? 'flex-end' : 'flex-start',
                justifyContent: i > 0 ? 'flex-start' : 'flex-end',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                {h}
              </Text>
            </View>
          ))}
        </View>

        {/* Rows */}
        {rows.map((row, idx) => {
          const itemPct =
            row.sellingPrice > 0
              ? (row.costContribution / row.sellingPrice) * 100
              : 0;
          const profit = getProfitOrExpense(row.netProfit);
          const Icon: LucideIcon =
            profit > 0 ? TrendingUp : profit === 0 ? Minus : TrendingDown;
          const profitMargin = row.sellingPrice
            ? (profit / row.sellingPrice) * 100
            : 0;
          return (
            <View
              key={row.id}
              style={{
                flexDirection: 'row',
                backgroundColor: rowsBg(idx),
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              {/* Items */}
              <View
                style={{
                  flex: COL_CONFIG[0].flex,
                  minWidth: COL_CONFIG[0].minWidth,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: colors.text,
                  }}
                  numberOfLines={2}
                >
                  {row.description}
                </Text>
              </View>

              <View
                style={{
                  flex: COL_CONFIG[1].flex,
                  minWidth: COL_CONFIG[1].minWidth,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  alignItems: 'flex-end',
                  justifyContent: 'flex-end',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: colors.text,
                  }}
                  numberOfLines={1}
                >
                  {formatPeso(row.costContribution + row.opExAmount)}{' '}
                  {/**<Text
                    style={{
                      fontSize: 11,
                      fontWeight: '500',
                      color: colors.accent,
                    }}
                  >
                    ({itemPct.toFixed(1)}%)
                  </Text> **/}
                </Text>
              </View>

              <View
                style={{
                  flex: COL_CONFIG[2].flex,
                  minWidth: COL_CONFIG[2].minWidth,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  alignItems: 'flex-end',
                  justifyContent: 'flex-end',
                }}
              >
                <Text style={{ fontSize: 12, color: colors.text }}>
                  {formatPeso(row.sellingPrice)}
                </Text>
              </View>

              <View
                style={{
                  flex: COL_CONFIG[3].flex,
                  minWidth: COL_CONFIG[3].minWidth,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  alignItems: 'flex-end',
                  justifyContent: 'flex-end',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: profit >= 0 ? colors.success : colors.error,
                  }}
                >
                  {formatPeso(profit)}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={{
                  flex: COL_CONFIG[4].flex,
                  minWidth: COL_CONFIG[4].minWidth,
                  paddingHorizontal: 8,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  justifyContent: 'center',
                  backgroundColor:
                    profit > 0
                      ? `${colors.success}33`
                      : profit === 0
                        ? `${colors.text}33`
                        : `${colors.error}33`,
                  borderRadius: 999,
                }}
                onPress={() => {
                  setSelectedRow(row);
                  setModalVisible(true);
                }}
              >
                <Icon
                  size={16}
                  color={
                    profit > 0
                      ? colors.success
                      : profit === 0
                        ? colors.text
                        : colors.error
                  }
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color:
                      profit > 0
                        ? colors.success
                        : profit === 0
                          ? colors.text
                          : colors.error,
                  }}
                >
                  {Number.isFinite(profitMargin)
                    ? `${profitMargin.toFixed(1)}%`
                    : '0.0%'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {selectedRow && (
          <DetailModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            title={selectedRow.itemName || selectedRow.description}
            sellingPrice={selectedRow.sellingPrice}
            costContribution={selectedRow.costContribution}
            profit={getProfitOrExpense(selectedRow.netProfit)}
            opExAmount={selectedRow.opExAmount}
            costLines={selectedRow.costLines}
            computedCost={selectedRow.computedCost}
          />
        )}

        {/* Footer totals */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.accent + '22',
            borderTopWidth: 2,
            borderTopColor: colors.accent,
          }}
        >
          <View
            style={{
              flex: COL_CONFIG[0].flex,
              minWidth: COL_CONFIG[0].minWidth,
              paddingHorizontal: 10,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: '800', color: colors.text }}
            >
              TOTAL
            </Text>
          </View>
          <View
            style={{
              flex: COL_CONFIG[1].flex,
              minWidth: COL_CONFIG[1].minWidth,
              paddingHorizontal: 10,
              paddingVertical: 10,
              alignItems: 'flex-end',
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: '700', color: colors.text }}
              numberOfLines={1}
            >
              {formatPeso(totalContrib)}{' '}
              {/**<Text style={{ fontSize: 11, color: colors.accent }}>
                (
                {totalSales > 0
                  ? ((totalContrib / totalSales) * 100).toFixed(1)
                  : '0.0'}
                %)
              </Text>**/}
            </Text>
          </View>
          <View
            style={{
              flex: COL_CONFIG[2].flex,
              minWidth: COL_CONFIG[2].minWidth,
              paddingHorizontal: 10,
              paddingVertical: 10,
              alignItems: 'flex-end',
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: '700', color: colors.text }}
            >
              {formatPeso(totalSales)}
            </Text>
          </View>
          <View
            style={{
              flex: COL_CONFIG[3].flex,
              minWidth: COL_CONFIG[3].minWidth,
              paddingHorizontal: 10,
              paddingVertical: 10,
              alignItems: 'flex-end',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: totalNet >= 0 ? colors.success : colors.error,
              }}
            >
              {formatPeso(totalNet)}
            </Text>
          </View>
          <View
            style={{
              flex: COL_CONFIG[4].flex,
              minWidth: COL_CONFIG[4].minWidth,
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
}

interface DetailModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  sellingPrice: number;
  costContribution: number;
  profit: number;
  opExAmount: number;
  costLines?: { label: string; amount: number }[];
  computedCost: number;
}

export function DetailModal({
  visible,
  onClose,
  title,
  sellingPrice,
  costContribution,
  profit,
  opExAmount = 0,
  costLines = [],
  computedCost,
}: DetailModalProps) {
  const { colors } = useTheme();
  const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  const contributionPct =
    sellingPrice > 0 ? (costContribution / sellingPrice) * 100 : 0;
  const totalCost = costContribution + opExAmount;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {title} Details
          </Text>

          <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Selling Price:
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>
                ₱{sellingPrice.toFixed(2)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Contribution Cost:
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>
                ₱{costContribution.toFixed(2)} ({contributionPct.toFixed(1)}%)
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                OpEx Amount:
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>
                ₱{opExAmount.toFixed(2)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Total Cost:
              </Text>
              <Text style={[styles.value, { color: colors.text }]}>
                ₱{totalCost.toFixed(2)}
              </Text>
            </View>

            <View style={styles.row}>
              <Text
                style={[
                  styles.label,
                  { color: profit >= 0 ? colors.success : colors.error },
                ]}
              >
                {profit >= 0 ? 'Profit' : 'Loss'}:
              </Text>
              <Text
                style={[
                  styles.value,
                  { color: profit >= 0 ? colors.success : colors.error },
                ]}
              >
                ₱{profit.toFixed(2)} ({profitMargin.toFixed(1)}%)
              </Text>
            </View>

            <View
              style={[styles.calculation, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.calcTitle, { color: colors.text }]}>
                Calculation:
              </Text>
              <Text style={[styles.calcText, { color: colors.textSecondary }]}>
                Contribution Cost ={' '}
                <Text style={{ color: colors.error }}>
                  {formatPeso(costContribution)}
                </Text>{' '}
                +{' '}
                <Text style={{ color: colors.error }}>
                  {formatPeso(opExAmount)}
                </Text>
                {'\n'}
                Total Cost ={' '}
                <Text style={{ color: colors.error }}>
                  {formatPeso(totalCost)}
                </Text>
                {'\n'}
                Profit ={' '}
                <Text style={{ color: colors.success }}>
                  Selling Price
                </Text> -{' '}
                <Text style={{ color: colors.error }}>Total Cost</Text>
                {'\n'}
                Profit ={' '}
                <Text style={{ color: colors.success }}>
                  ₱{sellingPrice.toFixed(2)}
                </Text>{' '}
                -{' '}
                <Text style={{ color: colors.error }}>
                  ₱{totalCost.toFixed(2)}
                </Text>
                {'\n'}
                {profit >= 0 ? 'Profit' : 'Loss'} ={' '}
                <Text
                  style={{ color: profit >= 0 ? colors.success : colors.error }}
                >
                  ₱{profit.toFixed(2)}
                </Text>
              </Text>
            </View>

            {costLines.length > 0 ? (
              <View
                style={{
                  marginTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingTop: 8,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: '700',
                    marginBottom: 12,
                  }}
                >
                  Cost Breakdown
                </Text>

                {costLines.map((line, idx) => (
                  <View
                    key={`${line.label}-${idx}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor:
                        idx % 2 === 0 ? colors.card : 'transparent',
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 13,
                        flex: 1,
                      }}
                    >
                      {line.label}
                    </Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {formatPeso(line.amount)}
                    </Text>
                  </View>
                ))}

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor:
                      costLines.length % 2 === 0 ? colors.card : 'transparent',
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      flex: 1,
                    }}
                  >
                    Operating Expense
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {formatPeso(opExAmount)}
                  </Text>
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.border,
                    marginVertical: 10,
                  }}
                />

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    backgroundColor: colors.primary + '15',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.primary + '30',
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: '700',
                      flex: 1,
                    }}
                  >
                    Computed Cost (Total)
                  </Text>
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 15,
                      fontWeight: '800',
                    }}
                  >
                    {formatPeso(computedCost)}
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>
          <Pressable
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.closeText, { color: colors.background }]}>
              Close
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
  calculation: {
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
  },
  calcTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  calcText: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    marginTop: 16,
    alignSelf: 'center',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  closeText: {
    fontWeight: '700',
  },
});

const sk = StyleSheet.create({
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  branchCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1 },
  financialCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
});

const fc = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amount: { fontSize: 15, fontWeight: '800' },
});

const dm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingBottom: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  fieldLabel: { fontSize: 12, fontWeight: '500', flex: 1 },
  fieldValue: { fontSize: 13, fontWeight: '700', textAlign: 'right', flex: 1 },
});

const em = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 20,
    maxHeight: '85%',
  },
  sheetTablet: {
    maxWidth: 600,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, flex: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 12,
  },
  totalPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalValue: { fontSize: 15, fontWeight: '800' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
