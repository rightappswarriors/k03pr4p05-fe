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
import { Plus } from 'lucide-react-native';
import { SkeletonLoader } from './SkeletonLoader';
import { QuantityModal } from './QuantityModal';
import type { Item } from '@/types';
import { useTheme} from '@/contexts/ThemeContext'
const { width: screenWidth } = Dimensions.get('window');
import { useResponsive } from '@/hooks/useResponsive'
interface ItemGridProps {
  items: Item[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  onAddToCart: (item: Item, quantity: number) => void;
}

export function ItemGrid({ items, loading, viewMode, onAddToCart }: ItemGridProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { isDesktop } = useResponsive()
  const { colors} = useTheme()
  const getNumColumns = () => {
    const availableWidth = screenWidth; // Full width
    if (availableWidth >= 1200) return 4;
    if (availableWidth >= 768) return 3;
    return 2;
  };

  const numColumns = viewMode === 'grid' ? getNumColumns() : 1;

  const handleItemPress = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleAddToCart = (quantity: number) => {
    if (selectedItem) {
      onAddToCart(selectedItem, quantity);
      setModalVisible(false);
      setSelectedItem(null);
    }
  };

  if (loading) {
    return (
      <ScrollView style={[styles.container, {backgroundColor:colors.background}]} 
      contentContainerStyle={[
        styles.loadingContainer,
        isDesktop && styles.desktopLoadingContainer, // typo: destop → desktop
      ]}
      
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
        viewMode === 'list' && styles.listItemCard,
        { backgroundColor: colors.card}
      ]}
    >
      { viewMode === 'grid' && (
        <Image source={{ uri: item.data.image }} style={[
        styles.itemImage,
        
      ]}/>)
      }
      <View style={[
        styles.itemInfo,
        viewMode === 'list' && styles.listItemInfo,
      ]}>
        <Text style={[styles.itemName, { color: colors.text}]} numberOfLines={viewMode === 'list' ? 1 : 2}>
          {item.data.name}
        </Text>
        <Text style={styles.itemPrice}>₱{item.data.price}</Text>
        {viewMode === 'list' && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.data.description}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => handleItemPress(item)}
        style={[
          styles.selectButton,
          viewMode === 'list' && styles.listSelectButton,
        ]}
      >
        <Plus size={viewMode === 'list' ? 20 : 16} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <FlatList
        data={items}
        renderItem={renderItem}
        numColumns={numColumns}
        key={`${viewMode}-${numColumns}`}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={viewMode === 'grid' && numColumns > 1 ? styles.row : undefined}
      />
      
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
    margin: 4,
    gap: 0,
    justifyContent: 'space-between', // optional, improves spacing
  },
  desktopLoadingContainer: {
    justifyContent: 'flex-start', // optional, improves spacing
  },
  gridContainer: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  itemCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 200,
  },
  listItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
    marginBottom: 8,
  },
  itemImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  listItemImage: {
    width: 60,
    height: 60,
    marginBottom: 0,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  listItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  selectButton: {
    backgroundColor: '#3B82F6',
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