import React from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { inventoryItems } from '@/data/erpMockData';

export default function InventoryScreen() {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const lowStockCount = inventoryItems.filter((i) => i.lowStock).length;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, paddingBottom: 0 },
    alertBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.25)',
    },
    alertIcon: { fontSize: 18, marginRight: 10 },
    alertText: { fontSize: 13, fontWeight: '600', color: colors.error, flex: 1 },
    listContent: { padding: 16, paddingTop: 0, gap: 10 },
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
    cardLowStock: {
      borderColor: colors.error,
      borderWidth: 1.5,
      backgroundColor: colors.card,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    productName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    lowStockBadge: {
      backgroundColor: 'rgba(239,68,68,0.12)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.error,
    },
    lowStockText: { fontSize: 11, fontWeight: '700', color: colors.error },
    okBadge: {
      backgroundColor: 'rgba(16,185,129,0.12)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.success,
    },
    okText: { fontSize: 11, fontWeight: '700', color: colors.success },
    skuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sku: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: 'monospace',
      letterSpacing: 0.5,
    },
    stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stockLabel: { fontSize: 12, color: colors.textSecondary },
    stockValue: { fontSize: 18, fontWeight: '800' },
    stockBar: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginTop: 8,
      overflow: 'hidden',
    },
    stockBarFill: { height: '100%', borderRadius: 2 },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {lowStockCount > 0 && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertText}>
              {lowStockCount} item{lowStockCount > 1 ? 's' : ''} below minimum stock threshold — restocking required
            </Text>
          </View>
        )}
      </View>
      <FlatList
        data={inventoryItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? 'tablet' : 'mobile'}
        columnWrapperStyle={isTablet ? { gap: 10 } : undefined}
        renderItem={({ item }) => {
          const maxStock = 200;
          const ratio = Math.min(item.stock / maxStock, 1);
          const barColor = item.lowStock ? colors.error : colors.success;

          return (
            <View style={[styles.card, item.lowStock && styles.cardLowStock, isTablet && { flex: 1 }]}>
              <View style={styles.topRow}>
                <Text style={styles.productName}>{item.name}</Text>
                {item.lowStock ? (
                  <View style={styles.lowStockBadge}>
                    <Text style={styles.lowStockText}>Low Stock</Text>
                  </View>
                ) : (
                  <View style={styles.okBadge}>
                    <Text style={styles.okText}>In Stock</Text>
                  </View>
                )}
              </View>
              <View style={styles.skuRow}>
                <Text style={styles.sku}>{item.sku}</Text>
                <View style={styles.stockRow}>
                  <Text style={styles.stockLabel}>Units:</Text>
                  <Text style={[styles.stockValue, { color: item.lowStock ? colors.error : colors.text }]}>
                    {item.stock}
                  </Text>
                </View>
              </View>
              <View style={styles.stockBar}>
                <View style={[styles.stockBarFill, { width: `${ratio * 100}%`, backgroundColor: barColor }]} />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}