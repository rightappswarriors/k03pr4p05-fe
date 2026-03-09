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
import { usePOS } from '@/contexts/POSContext'
import { useResponsive } from '@/hooks/useResponsive';

interface ItemBrowserProps {
  cartItemsCount: number
  style?: any;
  isDesktop?: boolean
  onToggleCart: () => void
}


export function ItemBrowser({
  style,
  cartItemsCount,
  onToggleCart
}: ItemBrowserProps) {
  const {
    filteredItems: items,
    items: storedItems,
    categories,
    loading,
    searchQuery,
    setSearchQuery: onSearchChange,
    setSelectedCategory: onCategorySelect,
    addToCart: onAddToCart,
    handleScanPress: onScanPress
  } = usePOS()
  const { isDesktop, isMobile } = useResponsive()
  const { colors } = useTheme()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const screenWidth = Dimensions.get('window').width;
  // padding + viewToggle + gap + cartButton
  const focusedWidth = screenWidth - 35;
  const unfocusedWidth = screenWidth * 0.55;

  const searchWidth = useRef(new Animated.Value(unfocusedWidth)).current;
  const [dropdownItems, setDropdownItems] = useState(
    categories.map(c => ({ label: c.name, value: c.id })) // 👈 transform categories
  );
  //useEffect(() => {
    //console.warn("storedItems updated:", items)
  //}, [storedItems])

  useEffect(() => {
    setDropdownItems(categories.map(c => ({ label: c.name, value: c.id })));
  }, [categories]);
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
      <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>

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
          <TouchableOpacity disabled={!isMobile} onPress={onToggleCart} style={[styles.cartButton, { backgroundColor: colors.background }]}>
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
      <CategoryDropdown
        onCategorySelect={onCategorySelect}
        onClearSearch={() => {
          onSearchChange('');
          onCategorySelect(null);
        }}
        onToggleDropdown={setIsDropdownOpen}
      />
      <ItemGrid
        items={items}
        isDropdownOpen={isDropdownOpen}
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