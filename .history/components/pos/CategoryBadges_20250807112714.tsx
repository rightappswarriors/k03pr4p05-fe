import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import CategoryDropdown from '@/components/Animated'
import { X, Filter } from 'lucide-react-native';
import Fuse from 'fuse.js';

import type { Category } from '@/types';
import { useTheme } from '@/contexts/ThemeContext'
interface CategoryBadgesProps {
  categories: Category[];
  selectedCategory: string | null;
  searchQuery: string;
  onCategorySelect: (categoryId: string | null) => void;
  onClearSearch: () => void;

}

export function CategoryBadges({
  categories,
  selectedCategory,
  searchQuery,
  onCategorySelect,
  onClearSearch,

}: CategoryBadgesProps) {
  // Initialize Fuse.js for fuzzy search
  const fuse = new Fuse(categories, {
    keys: ['name'],
    threshold: 0.4, // Allows for typos
    includeScore: true,
  });
  const { colors } = useTheme()
  const [categoryToggle, setCategoryToggle] = useState(false)
  // Don't show badges if search is not focused
  useEffect(() => {
    // Force update or debug log
    console.log('Selected category changed:', selectedCategory);
  }, [selectedCategory]);

  const slideAnim = useRef(new Animated.Value(-20)).current;
const opacityAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (categoryToggle) {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  } else {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }
}, [categoryToggle]);



  // If a category is selected, show the selected badge
  if (selectedCategory) {
    const selectedCategoryData = categories.find(c => c.id === selectedCategory);
    return (
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View
          style={[styles.scrollContent,]}
        >
          <View style={[styles.selectedBadge, { backgroundColor: colors.background }]}>
            <Text style={styles.selectedBadgeText}
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

  // Determine which categories to show
  let categoriesToShow: Category[] = [];

  if (searchQuery.trim() === '') {
    // Show all categories when no search query
    categoriesToShow = categories;
  } else {
    // Perform fuzzy search when there's a search query
    const results = fuse.search(searchQuery);
    categoriesToShow = results.map(result => result.item);
  }

  // Don't render if no categories to show
  if (categoriesToShow.length === 0) {
    return null;
  }

  return (
    <>
      <View  style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          className='gap-2 flex-row items-center'
          onPress={() => setCategoryToggle(!categoryToggle)}
          style={[styles.categoryBadge, { backgroundColor: colors.background, }]}>
          <Filter size={15} color={colors.text} />
          <Text style={{ color: colors.text }}>Filter List</Text>
        </TouchableOpacity>
        <ScrollView
          style={{ borderColor: colors.border }}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {categoriesToShow.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => {
                console.log('Badge tapped', category.id);
                onCategorySelect(category.id)
              }}
              style={[
                styles.categoryBadge,
                { backgroundColor: category.color ? `${category.color}20` : '#F3F4F6' }
              ]}
            >
              <Text
                style={[
                  styles.categoryBadgeText,
                  { color: category.color || '#374151' }
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View
        className={`
          absolute top-10 left-0 w-full bg-slate-800 z-50 p-2 rounded
          transition-all duration-300 ease-in-out
          ${categoryToggle ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'}
          pointer-events-${categoryToggle ? 'auto' : 'none'}
        `}
      >
        <Text className="text-white">Hello</Text>
        <Text className="text-white">Hello</Text>
        <Text className="text-white">Hello</Text>
        <Text className="text-white">Hello</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,

    minHeight: 50,
    gap: 16,
    paddingLeft: 16,
  },
  scrollContent: {
    paddingRight: 16,
    paddingVertical: 12,
    gap: 8,
  },
  selectedBadge: {
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
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
    padding: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  categoryBadge: {
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,

  },
  categoryBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});