import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react-native';
import { Category } from '@/types';
import Fuse from 'fuse.js';
import { useTheme } from '@/contexts/ThemeContext';

interface CategoryDropdownProps {

  categories: Category[];
  selectedCategory: string | null;
  searchQuery: string;
  onCategorySelect: (categoryId: string | null) => void;
  onClearSearch: () => void;
}

export function CategoryDropdown({
  categories,
  selectedCategory,
  searchQuery,
  onCategorySelect,
  onClearSearch,
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;
  const dropdownHeight = screenHeight * 0.5;
  const fuse = new Fuse(categories, {
    keys: ['name'],
    threshold: 0.4, // Allows for typos
    includeScore: true,
  });
  const { colors } = useTheme()
  // Don't show badges if search is not focused
  const [sortType, setSortType] = useState<'alphabetical' | 'brand' | 'color'>('alphabetical');

  // Determine which categories to show
  let categoriesToShow: Category[] = [];

  if (searchQuery.trim() === '') {
    categoriesToShow = categories;
  } else {
    const results = fuse.search(searchQuery);
    categoriesToShow = results.map(result => result.item);
  }
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
  // Don't render if no categories to show
  if (categoriesToShow.length === 0) {
    return null;
  }
  const selected = () => {
    if (selectedCategory) {
      const selectedCategoryData = categories.find(c => c.id === selectedCategory);
      return (
        <View style={[styles.container, {flex:1, backgroundColor: colors.card, borderColor: colors.border }]}>
          <View
            style={[styles.scrollContent,]}
          >
            <View style={[styles.selectedBadge, { backgroundColor: colors.background }]}>
              <Text style={[styles.selectedBadgeText, { color: colors.textSecondary}]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {selectedCategoryData?.name}
                {searchQuery && ` > ${searchQuery}`}
              </Text>
              <TouchableOpacity onPress={onClearSearch} style={styles.clearButton}>
                <X size={14} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
  }

  function groupCategories(
    categories: Category[],
    sortType: 'alphabetical' | 'brand' | 'color'
  ): Record<string, Category[]> {
    const grouped: Record<string, Category[]> = {};

    for (const cat of categories) {
      let key = '';

      if (sortType === 'alphabetical') {
        key = cat.name.charAt(0).toUpperCase();
      } else if (sortType === 'brand') {
        key = cat.brand?.trim() || 'Unbranded';
      } else if (sortType === 'color') {
        key = cat.color || 'No Color';
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(cat);
    }

    return Object.fromEntries(
      Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
    );
  }

  const toggleDropdown = () => {
    const toValue = isOpen ? 0 : dropdownHeight;

    Animated.timing(animatedHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setIsOpen(!isOpen);
  };


  return (
    <View style={[styles.container]}>
      <TouchableOpacity style={[styles.filterInput, , { backgroundColor: colors.card, borderColor: colors.card}]} onPress={toggleDropdown}>
        <Filter size={16} color="#2563EB" />
        {selectedCategory ? selected() :
          <Text style={[styles.filterInputText, { color: colors.textSecondary}]}>
            {selectedCategory ? selectedCategory : 'Select Category'}
          </Text>}
        {isOpen ? (
          <ChevronUp size={16} color="#2563EB" />
        ) : (
          <ChevronDown size={16} color="#2563EB" />
        )}
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.dropdown,
          {
            height: animatedHeight,
            opacity: animatedHeight.interpolate({
              inputRange: [0, dropdownHeight],
              outputRange: [0, 1],
            }),
          }
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <View style={[styles.dropdownContent, , { backgroundColor: colors.background, }]}>
          {/* Tabs */}
          <View style={[styles.tabContainer, , { backgroundColor: colors.background}]}>
            {['alphabetical', 'brand', 'color'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.tab,
                  sortType === type && styles.activeTab
                ]}
                onPress={() => setSortType(type as any)}
              >
                <Text style={[
                  styles.tabText,
                  sortType === type && styles.activeTabText
                ]}>
                  {type === 'alphabetical' ? 'A-Z' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Categories */}
          <ScrollView
            style={styles.categoriesContainer}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {Object.entries(groupCategories(sortedCategories, sortType)).map(([group, items]) => (
              <View key={group} style={styles.letterSection}>
                <Text style={[styles.letterHeader, { color: colors.text}]}>{group}</Text>
                <View style={styles.categoryRow}>
                  {items.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => {
                        onCategorySelect(category.id);
                      }}
                      style={[
                        styles.categoryButton,

                        { backgroundColor: category.color ? `${category.color}20` : '#F3F4F6', borderColor: colors.border },
                      ]}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        { color: category.color || '#374151' }
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
    
  },  
  scrollContent: {
    paddingRight: 16,
    gap: 8,
  },
  selectedBadge: {
    flex:1,
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    alignSelf: 'flex-start', // key line to size badge only as needed
    maxWidth: '100%',
    flexShrink: 1
  },
  selectedBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  clearButton: {
    paddingLeft: 2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    paddingVertical: 6,
  },
  filterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
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
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownContent: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
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
    flex: 1,
    padding: 16,
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
  selectedCategoryButton: {
    borderColor: '#2563EB',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: 'white',
  },
});