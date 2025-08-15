import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Animated,
} from 'react-native';
import { SearchBar } from './SearchBar';
import { CategoryBadges } from './CategoryBadges';
import { CategoryDropdown } from './CategoryDropdown';
import { ItemGrid } from './ItemGrid';
import { ViewToggle } from './ViewToggle';
import { ShoppingCart } from 'lucide-react-native';
import type { Item, Category } from '@/types';
import { useTheme } from '@/contexts/ThemeContext'

interface ItemBrowserProps {
  items: Item[];
  categories: Category[];
  loading: boolean;
  searchQuery: string;
  selectedCategory: string | null;
  onSearchChange: (query: string) => void;
  onCategorySelect: (categoryId: string | null) => void;
  onAddToCart: (item: Item, quantity: number) => void;
  cartItemsCount: number;
  onToggleCart: () => void;
  onScanPress: () => void;
  style?: any;
  isDesktop?: boolean
}


export function ItemBrowser({
  items,
  categories,
  loading,
  searchQuery,
  selectedCategory,
  onSearchChange,
  onCategorySelect,
  onAddToCart,
  cartItemsCount,
  onToggleCart,
  onScanPress,
  style,
  isDesktop,
}: ItemBrowserProps) {
  const { colors } = useTheme()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<any>(null);

  const screenWidth = Dimensions.get('window').width;
  // padding + viewToggle + gap + cartButton
  const focusedWidth = screenWidth-35;
  const unfocusedWidth = screenWidth * 0.55;

  const searchWidth = useRef(new Animated.Value(unfocusedWidth)).current;

  useEffect(() => {
    if (!isDesktop) {
      Animated.timing(searchWidth, {
        toValue: isSearchFocused ? focusedWidth : unfocusedWidth,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [isSearchFocused, isDesktop]);
  const searchBar = (
    <SearchBar
            ref={searchInputRef}
            value={searchQuery}
            onChangeText={onSearchChange}
            onScanPress={onScanPress}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => {
              setIsSearchFocused(false);
            }}
          />
  )
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.header, {backgroundColor: colors.surface, borderColor: colors.border}]}>
        
      {isDesktop ? (
        searchBar
      ) : (
        <Animated.View style={{ width: searchWidth }}>
          {searchBar}
        </Animated.View>
      )}

        <View style={styles.headerControls}>
          <ViewToggle
            viewMode={viewMode}
            onToggle={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
          />
          <TouchableOpacity onPress={onToggleCart} style={[styles.cartButton, { backgroundColor: colors.background}]}>
            <ShoppingCart size={20} color="#3B82F6" />
            {cartItemsCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartItemsCount > 99 ? '99+' : cartItemsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      <CategoryBadges
        categories={categories}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        onCategorySelect={onCategorySelect}
        onClearSearch={() => {
          onSearchChange('');
          onCategorySelect(null);
        }}
      />

<CategoryDropdown
  selectedCategory={''}
  onCategorySelect={onCategorySelect}
/>
      <ItemGrid
        items={items}
        loading={loading}
        viewMode={viewMode}
        onAddToCart={onAddToCart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
});