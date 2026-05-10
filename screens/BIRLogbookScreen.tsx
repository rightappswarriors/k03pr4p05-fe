import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Download, Printer, RefreshCcw } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { SalesService } from '@/services/salesService';

const DISCOUNT_FILTERS = ['ALL', 'SENIOR_CITIZEN', 'PWD', 'BNPC_SENIOR_CITIZEN', 'BNPC_PWD'];

export default function BIRLogbookScreen() {
  const { colors } = useTheme();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [discountType, setDiscountType] = useState('ALL');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredRows = useMemo(
    () => rows.filter((row) => discountType === 'ALL' || row.discountType === discountType),
    [rows, discountType],
  );

  const totalDiscount = filteredRows.reduce((sum, row) => sum + Number(row.discountAmount || 0), 0);

  const loadLogbook = async () => {
    setLoading(true);
    try {
      const data = await SalesService.getBirDiscountLogbook(startDate || undefined, endDate || undefined);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogbook();
  }, []);

  const csv = useMemo(() => {
    const header = [
      'Date',
      'OR/Invoice Number',
      'SC/PWD Full Name',
      'SC/PWD ID Number',
      'Items Purchased',
      'Total Amount Before Discount',
      'Discount Amount',
      'Net Amount Paid',
    ];
    const body = filteredRows.map((row) => [
      new Date(row.date).toLocaleDateString('en-PH'),
      row.orNumber,
      row.fullName,
      row.idNumber,
      row.itemsPurchased,
      Number(row.totalBeforeDiscount || 0).toFixed(2),
      Number(row.discountAmount || 0).toFixed(2),
      Number(row.netAmountPaid || 0).toFixed(2),
    ]);
    return [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }, [filteredRows]);

  const exportCsv = () => {
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bir-discount-logbook.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const printLogbook = () => {
    if (Platform.OS === 'web') window.print();
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    title: { fontSize: 20, fontWeight: '800', color: colors.text },
    toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
    input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, borderRadius: 8, paddingHorizontal: 10, height: 40, minWidth: 140 },
    button: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 12, height: 40, backgroundColor: colors.primary },
    buttonText: { color: '#fff', fontWeight: '700' },
    chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.text, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: '#fff' },
    table: { minWidth: 980, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' },
    row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
    headerRow: { backgroundColor: colors.card },
    cell: { padding: 8, color: colors.text, fontSize: 12, width: 120 },
    wideCell: { width: 240 },
    total: { marginTop: 12, fontSize: 14, color: colors.text, fontWeight: '800' },
  });

  return (
    <View style={s.container}>
      <Text style={s.title}>BIR Discount Logbook</Text>
      <View style={s.toolbar}>
        <TextInput style={s.input} placeholder="Start date YYYY-MM-DD" placeholderTextColor={colors.textSecondary} value={startDate} onChangeText={setStartDate} />
        <TextInput style={s.input} placeholder="End date YYYY-MM-DD" placeholderTextColor={colors.textSecondary} value={endDate} onChangeText={setEndDate} />
        <TouchableOpacity style={s.button} onPress={loadLogbook}>
          <RefreshCcw size={16} color="#fff" />
          <Text style={s.buttonText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.button} onPress={exportCsv}>
          <Download size={16} color="#fff" />
          <Text style={s.buttonText}>CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.button} onPress={printLogbook}>
          <Printer size={16} color="#fff" />
          <Text style={s.buttonText}>Print</Text>
        </TouchableOpacity>
      </View>
      <View style={s.toolbar}>
        {DISCOUNT_FILTERS.map((filter) => (
          <TouchableOpacity key={filter} style={[s.chip, discountType === filter && s.chipActive]} onPress={() => setDiscountType(filter)}>
            <Text style={[s.chipText, discountType === filter && s.chipTextActive]}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <ScrollView horizontal>
          <View style={s.table}>
            <View style={[s.row, s.headerRow]}>
              {['Date', 'OR/Invoice Number', 'SC/PWD Full Name', 'SC/PWD ID Number', 'Items Purchased', 'Total Before Discount', 'Discount Amount', 'Net Amount Paid'].map((heading) => (
                <Text key={heading} style={[s.cell, heading === 'Items Purchased' && s.wideCell, { fontWeight: '800' }]}>{heading}</Text>
              ))}
            </View>
            {filteredRows.map((row) => (
              <View key={`${row.orNumber}-${row.idNumber}`} style={s.row}>
                <Text style={s.cell}>{new Date(row.date).toLocaleDateString('en-PH')}</Text>
                <Text style={s.cell}>{row.orNumber}</Text>
                <Text style={s.cell}>{row.fullName}</Text>
                <Text style={s.cell}>{row.idNumber}</Text>
                <Text style={[s.cell, s.wideCell]}>{row.itemsPurchased}</Text>
                <Text style={s.cell}>Php {Number(row.totalBeforeDiscount || 0).toFixed(2)}</Text>
                <Text style={s.cell}>Php {Number(row.discountAmount || 0).toFixed(2)}</Text>
                <Text style={s.cell}>Php {Number(row.netAmountPaid || 0).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      <Text style={s.total}>Running total discounts granted: Php {totalDiscount.toFixed(2)}</Text>
    </View>
  );
}
