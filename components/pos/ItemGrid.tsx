import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { Package, Plus } from 'lucide-react-native';
import { SkeletonLoader } from './SkeletonLoader';
import { QuantityModal } from './QuantityModal';
import type { Item, ItemUnit } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
const { width: screenWidth } = Dimensions.get('window');
import { useResponsive } from '@/hooks/useResponsive';

interface ItemGridProps {
  items: Item[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  onAddToCart: (item: Item, quantity: number, unit?: ItemUnit) => void; // ← updated
  isDropdownOpen: boolean;
}

export function ItemGrid({
  items,
  loading,
  viewMode,
  onAddToCart,
  isDropdownOpen,
}: ItemGridProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0); // ← measured width
  const { colors } = useTheme();

  const numColumns =
    viewMode === 'list'
      ? 1
      : (() => {
          if (containerWidth >= 900) return 4;
          if (containerWidth >= 600) return 3;
          if (containerWidth >= 400) return 2;
          return 2;
        })();

  const PADDING = 32; // 16px padding on each side of gridContainer
  const GAP = 8; // gap between columns in row style

  const cardWidth =
    viewMode === 'grid' && containerWidth > 0
      ? (containerWidth - PADDING - (numColumns - 1) * GAP) / numColumns
      : undefined;

  const handleItemPress = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleAddToCart = (quantity: number, unit?: ItemUnit) => {
    if (selectedItem) {
      onAddToCart(selectedItem, quantity, unit); // ← pass unit through
      setModalVisible(false);
      setSelectedItem(null);
    }
  };

  if (loading) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.loadingContainer}
      >
        {Array.from({ length: 12 }).map((_, index) => (
          <SkeletonLoader key={index} viewMode={viewMode} />
        ))}
      </ScrollView>
    );
  }

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleItemPress(item)}
      style={[
        styles.itemCard,
        viewMode === 'grid' && cardWidth
          ? { width: cardWidth } // ← just width, no flex:0 needed
          : undefined,
        viewMode === 'list' && styles.listItemCard,
        { backgroundColor: colors.card },
      ]}
    >
      {viewMode === 'grid' && item.image ? (
        <Image
          source={{ uri: item.image }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      ) : viewMode === 'grid' ? (
        <View
          style={[
            styles.itemImage,
            {
              backgroundColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Package size={32} color={colors.textSecondary} strokeWidth={1.5} />
        </View>
      ) : null}
      <View
        style={[styles.itemInfo, viewMode === 'list' && styles.listItemInfo]}
      >
        <Text
          style={[styles.itemName, { color: colors.text }]}
          numberOfLines={viewMode === 'list' ? 1 : 2}
        >
          {item.name}
        </Text>
        <Text style={[styles.itemPrice, { color: colors.accent }]}>
          ₱{item.price}
        </Text>
        {viewMode === 'list' && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => handleItemPress(item)}
        style={[
          styles.selectButton,
          viewMode === 'list' && styles.listSelectButton,
          { backgroundColor: colors.accent },
        ]}
      >
        <Plus size={viewMode === 'list' ? 20 : 16} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      pointerEvents={isDropdownOpen ? 'none' : 'auto'}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)} 
    >
      {/* Don't render FlatList until we have a real width */}
      {containerWidth > 0 && (
        <FlatList
          data={items}
          renderItem={renderItem}
          numColumns={numColumns}
          nestedScrollEnabled={true}
          key={`${viewMode}-${numColumns}`}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={
            viewMode === 'grid' && numColumns > 1 ? styles.row : undefined
          }
        />
      )}

      <QuantityModal
        visible={modalVisible}
        item={selectedItem}
        onAddToCart={handleAddToCart}
        onClose={() => {
          setModalVisible(false);
          setSelectedItem(null);
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
    justifyContent: 'space-between',
  },
  gridContainer: {
    padding: 16,
    gap: 8,
  },
  row: {
    gap: 8,
    marginBottom: 8,
    justifyContent: 'flex-start', // ← not space-between
  },
  itemCard: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 180,
    // NO margin, NO overflow:hidden, NO flex:1
  },
  listItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  itemImage: {
    width: '100%',
    height: 110,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  listItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  selectButton: {
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  listSelectButton: {
    width: 40,
    height: 40,
  },
});
