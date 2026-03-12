import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity
  , Animated, Dimensions, ScrollView } from 'react-native';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react-native';
import { Category } from '@/types';
import Fuse from 'fuse.js';
import { useResponsive } from "@/hooks/useResponsive"
import { useTheme } from '@/contexts/ThemeContext';
import { usePOS } from "@/contexts/POSContext"
interface CategoryDropdownProps {
  onCategorySelect: (categoryId: string | null) => void;
  onClearSearch: () => void;
  onToggleDropdown: any;
}


export function CategoryDropdown({
  onClearSearch,
  onCategorySelect,
  onToggleDropdown
}: CategoryDropdownProps) {
  const { 
    categories,
    selectedCategory,
    searchQuery,
  } = usePOS()
  const { isDesktop} = useResponsive()
  const [isOpen, setIsOpen] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;
  const dropdownHeight = screenHeight * 0.5;

  const { colors } = useTheme();
  const [sortType, setSortType] = useState<'alphabetical' | 'brand' | 'color'>('alphabetical');

  useEffect(() => {
    onToggleDropdown(isOpen);
  }, [isOpen]);

  // Handle animation when dropdown state changes
  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isOpen ? dropdownHeight : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const fuse = useMemo(() => new Fuse(categories, {
    keys: ['name'],
    threshold: 0.4,
    includeScore: true,
  }), [categories]);

  const categoriesToShow = useMemo(() => {
    if (searchQuery.trim() === '') {
      return categories;
    }
    const results = fuse.search(searchQuery);
    return results.map(result => result.item);
  }, [categories, searchQuery, fuse]);

  const sortedCategories = useMemo(() => {
    const list = [...categoriesToShow];
    if (sortType === 'alphabetical') {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortType === 'brand') {
      return list.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
    } else if (sortType === 'color') {
      return list.sort((a, b) => (a.color || '').localeCompare(b.color || ''));
    }
    return list;
  }, [categoriesToShow, sortType]);

  const groupCategories = (list: Category[], type: 'alphabetical' | 'brand' | 'color') => {
    const grouped: Record<string, Category[]> = {};
    for (const cat of list) {
      let key = '';
      if (type === 'alphabetical') {
        key = cat.name.charAt(0).toUpperCase();
      } else if (type === 'brand') {
        key = cat.brand?.trim() || 'Unbranded';
      } else if (type === 'color') {
        key = cat.color || 'No Color';
      }
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(cat);
    }
    return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)));
  };

  const selectedBadge = () => {
    if (selectedCategory) {
      const selectedCategoryData = categories.find(c => c.id === selectedCategory);
      return (
        <View style={[styles.selectedBadge, { backgroundColor: colors.background }]}>
          <Text
            style={[styles.selectedBadgeText, { color: colors.textSecondary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selectedCategoryData?.name}
            {searchQuery && ` > ${searchQuery}`}
          </Text>
          <TouchableOpacity onPress={onClearSearch} style={styles.clearButton}>
            <X size={14} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      );
    }
  };
  if (categoriesToShow.length === 0 && searchQuery.trim() !== '') {
    return (
      <View style={{ padding: 16 }}>
        <Text>No results</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, isDesktop && { zIndex: 1000} ]} pointerEvents="auto">
      <TouchableOpacity
        style={[styles.filterInput, { backgroundColor: colors.card, borderColor: colors.card }]}
        onPress={toggleDropdown}
      >
        <Filter size={16} color={colors.accent} />
        {selectedCategory ? (
          selectedBadge()
        ) : (
          <Text style={[styles.filterInputText, { color: colors.textSecondary }]}>
            {'Select Category'}
          </Text>
        )}
        {isOpen ? <ChevronUp size={16} color={colors.accent} /> : <ChevronDown size={16} color={colors.accent} />}
      </TouchableOpacity>

      {isOpen && (
        <View
          style={[
            styles.dropdown,
            { maxHeight: dropdownHeight - 25 },
            { borderColor: colors.border}
          ]}
        >
          {/* Tabs */}
          <View style={[styles.tabContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
            {['alphabetical', 'brand', 'color'].map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.tab, sortType === type && styles.activeTab]}
                onPress={() => setSortType(type as any)}
              >
                <Text style={[styles.tabText, sortType === type && styles.activeTabText]}>
                  {type === 'alphabetical' ? 'A-Z' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Scrollable Categories */}
          <ScrollView
            style={{ maxHeight: dropdownHeight - 50 }} // leave space for tabs
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {Object.entries(groupCategories(sortedCategories, sortType)).map(([group, items]) => (
              <View key={group} style={styles.letterSection}>
                <Text style={[styles.letterHeader, { color: colors.text }]}>{group}</Text>
                <View style={styles.categoryRow}>
                  {items.map(category => (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => onCategorySelect(category.id)}
                      style={[
                        styles.categoryButton,
                        {
                          backgroundColor: category.color ? `${category.color}20` : '#F3F4F6',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.categoryButtonText, { color: category.color || '#374151' }]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    
  },
  scrollContent: {
    paddingRight: 16,
    gap: 8,
  },
  selectedBadge: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexShrink: 1,
  },
  selectedBadgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    paddingLeft: 2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    paddingVertical: 6,
  },
  filterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    padding: 12,
    gap: 8,
    minHeight: 48,
  },
  filterInputText: {
    flex: 1,
    fontSize: 16,
  },
  dropdown: {
    position: "absolute",
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    maxHeight: 450,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 500, // ✅ ensure on top of ItemGrid
    //overflow: 'hidden',
  },
  dropdownContent: {
    zIndex: 10000
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderBottomWidth: 1,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: 'white',
  },
  categoriesContainer: {
    flexGrow: 0,
    padding: 16,
    zIndex: 20000, // ✅ ensure on top of ItemGrid
  },
  letterSection: {
    marginBottom: 16,
  },
  letterHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});
