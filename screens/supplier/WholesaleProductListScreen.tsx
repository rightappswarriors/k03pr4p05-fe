import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { WholesaleService } from '@/services/wholesaleService';
import type { SupplierItem } from '@/types/index';
import { Package, Search, ChevronLeft, Filter } from 'lucide-react-native';

// ─── Helper Functions ─────────────────────────────────────────────────────

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

const formatQty = (qty: number | null | undefined) => {
  if (qty == null) return '0';
  return new Intl.NumberFormat('en-PH').format(qty);
};

// ─── Product Card ───────────────────────────────────────────────────────────

function WholesaleProductCard({
  product,
  onPress,
}: {
  product: SupplierItem;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const basePrice = product.priceTiers?.find((t) => t.minQty === 1)?.price ?? product.unitPrice;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
      activeOpacity={0.7}
    >
      {/* Image placeholder */}
      <View
        style={{
          height: 120,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {product.image ? (
          <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={32} color={colors.primary} strokeWidth={1.5} />
          </View>
        ) : (
          <Package size={48} color={colors.textSecondary} strokeWidth={1.5} />
        )}
      </View>

      {/* Content */}
      <View style={{ padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={2}>
          {product.name}
        </Text>

        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>
          {formatPHP(basePrice)}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              MOQ: {formatQty(product.moq)}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {formatQty(product.availableQty)} in stock
          </Text>
        </View>

        {product.priceTiers && product.priceTiers.length > 1 && (
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            {product.priceTiers.length} price tiers available
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Product List Screen ───────────────────────────────────────────────

export default function WholesaleProductListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<SupplierItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const data = await WholesaleService.getWholesaleProducts({
        search: searchQuery || undefined,
        isActive: true,
      });
      setProducts(data);
    } catch (error) {
      if (__DEV__) console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const numColumns = useMemo(() => {
    if (isDesktop) return 4;
    if (isTablet) return 2;
    return 1;
  }, [isTablet, isDesktop]);

  const handleProductPress = (id: string) => {
    router.push(`/supplier/wholesale/${id}` as any);
  };

  const renderProduct = ({ item }: { item: SupplierItem }) => (
    <WholesaleProductCard
      product={item}
      onPress={() => handleProductPress(item.id)}
    />
  );

  const renderEmpty = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
      <Package size={64} color={colors.textSecondary} strokeWidth={1.5} />
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 }}>
        No products found
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
        Try adjusting your search or check back later
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: isDesktop ? 24 : 56,
          paddingHorizontal: isDesktop ? 32 : 20,
          paddingBottom: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
          Wholesale Products
        </Text>
      </View>

      {/* Search & Filter Bar */}
      <View
        style={{
          paddingHorizontal: isDesktop ? 32 : 20,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
          }}
        >
          <Search size={18} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            placeholder="Search products..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 8,
              fontSize: 14,
              color: colors.text,
            }}
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Filter size={18} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1, padding: isDesktop ? 32 : isTablet ? 24 : 16 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={renderProduct}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
            contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={renderEmpty}
          />
        )}
      </View>
    </View>
  );
}