// components/dashboardSummary/ExportModal.tsx
// Export config sheet — slides up before any export
// User picks: table, date range, theme, format, name, org

import React, { useRef, useState } from 'react';
import {
  Animated, Modal, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import {
  Download, FileSpreadsheet, FileText, Moon, Sun, X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { ExportConfig, ExportTable } from '@/utils/exportERP';
import { exportERPExcel, exportERPPDF } from '@/utils/exportERP';
import type { GISRow, SummaryRow } from '@/data/SummaryData';

// ─── Date presets ─────────────────────────────────────────────────────────────

const DATE_OPTIONS = [
  'This Month', 'Last Month', 'Last 3 Months',
  'Last 6 Months', 'This Year', 'Custom',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExportModalProps {
  visible:     boolean;
  onClose:     () => void;
  gisRows:     GISRow[];
  summaryRows: SummaryRow[];
  defaultTab:  ExportTable;  // pre-selects whichever tab is active
  defaultDate: string;       // pre-fills from dashboard date picker
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportModal({
  visible, onClose, gisRows, summaryRows, defaultTab, defaultDate,
}: ExportModalProps) {
  const { colors, theme, toggleTheme } = useTheme();

  // Config state
  const [table,        setTable]        = useState<ExportTable>(defaultTab);
  const [dateLabel,    setDateLabel]    = useState(defaultDate);
  const [customDate,   setCustomDate]   = useState('');
  const [exportTheme,  setExportTheme]  = useState<'light' | 'dark'>(theme);
  const [fullName,     setFullName]     = useState('');
  const [organization, setOrganization] = useState('Right Apps Inc.');
  const [format,       setFormat]       = useState<'excel' | 'pdf'>('excel');
  const [loading,      setLoading]      = useState(false);
  const [done,         setDone]         = useState(false);
  const [error,        setError]        = useState('');

  const slideAnim = useRef(new Animated.Value(600)).current;

  React.useEffect(() => {
    if (visible) {
      setDone(false);
      setError('');
      setTable(defaultTab);
      setDateLabel(defaultDate);
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 260, useNativeDriver: true }).start();
    }
  }, [visible, defaultTab, defaultDate]);

  const handleExport = async () => {
    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    setLoading(true);
    setError('');
    try {
      const cfg: ExportConfig = {
        table,
        theme:        exportTheme,
        fullName:     fullName.trim(),
        organization: organization.trim() || 'Right Apps Inc.',
        dateLabel:    dateLabel === 'Custom' ? (customDate || 'Custom Range') : dateLabel,
        gisRows,
        summaryRows,
      };
      if (format === 'excel') await exportERPExcel(cfg);
      else                    await exportERPPDF(cfg);
      setDone(true);
      setTimeout(() => { setDone(false); onClose(); }, 1800);
    } catch (e: any) {
      setError(e?.message ?? 'Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.surface, paddingBottom: 32, maxHeight: '92%' },
    handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    title:      { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    body:       { padding: 20 },
    label:      { fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
    segRow:     { flexDirection: 'row', gap: 8 },
    seg:        { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
    segActive:  { borderColor: colors.primary, backgroundColor: colors.primary },
    segText:    { fontSize: 13, fontWeight: '600', color: colors.text },
    segTextAct: { color: '#fff' },
    input:      { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: colors.text, marginBottom: 4 },
    themeRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
    themeLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
    formatRow:  { flexDirection: 'row', gap: 10 },
    formatBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border },
    formatAct:  { borderColor: colors.accent, backgroundColor: colors.accent + '18' },
    formatText: { fontSize: 13, fontWeight: '600', color: colors.text },
    formatActTx:{ color: colors.accent },
    dateGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    datePill:   { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    datePillAct:{ borderColor: colors.primary, backgroundColor: colors.primary },
    datePillTxt:{ fontSize: 12, fontWeight: '500', color: colors.text },
    datePillATx:{ color: '#fff' },
    exportBtn:  { backgroundColor: colors.primary, borderRadius: 13, paddingVertical: 16, alignItems: 'center', marginTop: 20, flexDirection: 'row', justifyContent: 'center', gap: 8 },
    exportTxt:  { fontSize: 16, fontWeight: '700', color: '#fff' },
    errorTxt:   { fontSize: 12, color: colors.error, marginTop: 8, textAlign: 'center' },
    doneTxt:    { fontSize: 16, fontWeight: '700', color: colors.success },
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>

            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Export Report</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={16} color={colors.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Table selector */}
              <Text style={styles.label}>Report Table</Text>
              <View style={styles.segRow}>
                {([['expense', 'Expense Summary (GIS)'], ['itemnet', 'Item Net Summary']] as const).map(([key, lbl]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.seg, table === key && styles.segActive]}
                    onPress={() => setTable(key)}
                  >
                    <Text style={[styles.segText, table === key && styles.segTextAct]}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date range */}
              <Text style={styles.label}>Date Range</Text>
              <View style={styles.dateGrid}>
                {DATE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.datePill, dateLabel === opt && styles.datePillAct]}
                    onPress={() => setDateLabel(opt)}
                  >
                    <Text style={[styles.datePillTxt, dateLabel === opt && styles.datePillATx]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {dateLabel === 'Custom' && (
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  placeholder="e.g. Jan 2026 – Mar 2026"
                  placeholderTextColor={colors.textSecondary}
                  value={customDate}
                  onChangeText={setCustomDate}
                />
              )}

              {/* Full name */}
              <Text style={styles.label}>Prepared By</Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={colors.textSecondary}
                value={fullName}
                onChangeText={setFullName}
                autoCorrect={false}
              />

              {/* Organization */}
              <Text style={styles.label}>Organization</Text>
              <TextInput
                style={styles.input}
                placeholder="Company or branch name"
                placeholderTextColor={colors.textSecondary}
                value={organization}
                onChangeText={setOrganization}
                autoCorrect={false}
              />

              {/* Export theme */}
              <Text style={styles.label}>Report Theme</Text>
              <View style={styles.themeRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {exportTheme === 'dark'
                    ? <Moon size={16} color={colors.primary} strokeWidth={2} />
                    : <Sun  size={16} color={colors.accent}  strokeWidth={2} />
                  }
                  <Text style={styles.themeLabel}>
                    {exportTheme === 'dark' ? 'Dark (Navy)' : 'Light (Clean)'}
                  </Text>
                </View>
                <Switch
                  value={exportTheme === 'dark'}
                  onValueChange={v => setExportTheme(v ? 'dark' : 'light')}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              {/* Format */}
              <Text style={styles.label}>Export Format</Text>
              <View style={styles.formatRow}>
                <TouchableOpacity
                  style={[styles.formatBtn, format === 'excel' && styles.formatAct]}
                  onPress={() => setFormat('excel')}
                >
                  <FileSpreadsheet size={16} color={format === 'excel' ? colors.accent : colors.textSecondary} strokeWidth={2} />
                  <Text style={[styles.formatText, format === 'excel' && styles.formatActTx]}>Excel (.xlsx)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formatBtn, format === 'pdf' && styles.formatAct]}
                  onPress={() => setFormat('pdf')}
                >
                  <FileText size={16} color={format === 'pdf' ? colors.accent : colors.textSecondary} strokeWidth={2} />
                  <Text style={[styles.formatText, format === 'pdf' && styles.formatActTx]}>PDF</Text>
                </TouchableOpacity>
              </View>

              {/* Export button */}
              <TouchableOpacity
                style={[styles.exportBtn, (loading || done) && { opacity: 0.8 }]}
                onPress={handleExport}
                disabled={loading || done}
                activeOpacity={0.85}
              >
                {done ? (
                  <Text style={styles.doneTxt}>✓ Exported Successfully</Text>
                ) : loading ? (
                  <>
                    <Download size={18} color="#fff" strokeWidth={2} />
                    <Text style={styles.exportTxt}>Generating…</Text>
                  </>
                ) : (
                  <>
                    <Download size={18} color="#fff" strokeWidth={2} />
                    <Text style={styles.exportTxt}>Export {format === 'excel' ? 'Excel' : 'PDF'}</Text>
                  </>
                )}
              </TouchableOpacity>

              {error ? <Text style={styles.errorTxt}>{error}</Text> : null}
              <View style={{ height: 12 }} />
            </ScrollView>

          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}