import React from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { salesOrders } from '@/data/erpMockData';

const STATUS_COLORS: Record<string, string> = {
  Completed: '#10B981',
  Processing: '#3B82F6',
  Pending: '#F59E0B',
  Shipped: '#8B5CF6',
  Cancelled: '#EF4444',
};

export default function SalesScreen() {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      paddingBottom: 0,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    metaCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaValue: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    metaLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 3,
    },
    listContent: {
      padding: 16,
      paddingTop: 0,
      gap: 10,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    cardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    orderId: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 0.3,
    },
    customerName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
    },
    detailsRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    detailChip: {
      backgroundColor: colors.background,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    detailLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginBottom: 1,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    detailValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    totalAmount: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.accent,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 10,
    },
  });

  const totalRevenue = salesOrders.reduce((acc, o) => acc + o.total, 0);
  const completedOrders = salesOrders.filter((o) => o.status === 'Completed').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text style={styles.metaValue}>{salesOrders.length}</Text>
            <Text style={styles.metaLabel}>Total Orders</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: colors.success }]}>{completedOrders}</Text>
            <Text style={styles.metaLabel}>Completed</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={[styles.metaValue, { color: colors.accent }]}>
              ₱{(totalRevenue / 1000).toFixed(0)}K
            </Text>
            <Text style={styles.metaLabel}>Revenue</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={salesOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? 'tablet' : 'mobile'}
        columnWrapperStyle={isTablet ? { gap: 10 } : undefined}
        renderItem={({ item }) => (
          <View style={[styles.card, isTablet && { flex: 1 }]}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.orderId}>{item.id}</Text>
                <Text style={styles.customerName}>{item.customer}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: STATUS_COLORS[item.status] ?? '#6B7280' },
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailsRow}>
              <View style={styles.detailChip}>
                <Text style={styles.detailLabel}>Product</Text>
                <Text style={styles.detailValue}>{item.product}</Text>
              </View>
              <View style={styles.detailChip}>
                <Text style={styles.detailLabel}>Qty</Text>
                <Text style={styles.detailValue}>{item.qty}</Text>
              </View>
              <View style={styles.detailChip}>
                <Text style={styles.detailLabel}>Total</Text>
                <Text style={[styles.detailValue, { color: colors.accent }]}>
                  ₱{item.total.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}