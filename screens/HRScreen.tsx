import React from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { employees } from '@/data/erpMockData';

const DEPT_COLORS: Record<string, string> = {
  Engineering: '#3B82F6',
  Product: '#8B5CF6',
  Sales: '#10B981',
  Design: '#EC4899',
  Finance: '#F59E0B',
  HR: '#06B6D4',
  Marketing: '#EF4444',
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Active: { bg: 'rgba(16,185,129,0.12)', text: '#10B981' },
  'On Leave': { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' },
  Contract: { bg: 'rgba(139,92,246,0.12)', text: '#8B5CF6' },
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function HRScreen() {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const departments = [...new Set(employees.map((e) => e.department))].length;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, paddingBottom: 0 },
    metaRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    metaCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaValue: { fontSize: 22, fontWeight: '800', color: colors.text },
    metaLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
    listContent: { padding: 16, paddingTop: 0, gap: 10 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    avatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
    role: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
    tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    deptBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    deptText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    statusText: { fontSize: 11, fontWeight: '600' },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text style={styles.metaValue}>{employees.length}</Text>
            <Text style={styles.metaLabel}>Total Employees</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: colors.success }]}>{activeCount}</Text>
            <Text style={styles.metaLabel}>Active</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaValue}>{departments}</Text>
            <Text style={styles.metaLabel}>Departments</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? 'tablet' : 'mobile'}
        columnWrapperStyle={isTablet ? { gap: 10 } : undefined}
        renderItem={({ item }) => {
          const deptColor = DEPT_COLORS[item.department] ?? colors.primary;
          const statusStyle = STATUS_STYLES[item.status] ?? { bg: colors.border, text: colors.textSecondary };
          return (
            <View style={[styles.card, isTablet && { flex: 1 }]}>
              <View style={[styles.avatar, { backgroundColor: deptColor }]}>
                <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.role}>{item.role}</Text>
                <View style={styles.tagsRow}>
                  <View style={[styles.deptBadge, { backgroundColor: deptColor }]}>
                    <Text style={styles.deptText}>{item.department}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}