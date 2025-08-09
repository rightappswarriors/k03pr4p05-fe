import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import SlideView from '@/components/Animated'
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

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
      <SlideView visible={categoryToggle}>
        <View className="flex-1 px-4 h-[50%]" style={{ backgroundColor: colors.card }}>
          {/* Sort Option Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 8 }}>
            {['alphabetical', 'brand', 'color'].map(type => (
              <TouchableOpacity key={type} onPress={() => setSortType(type as any)}>
                <Text style={{ color: sortType === type ? '#3B82F6' : colors.text }}>
                  {type === 'alphabetical' ? 'A-Z' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView>
            {Object.entries(groupCategories(sortedCategories, sortType)).map(([group, items]) => (
              <View key={group}>
                <Text style={{ fontWeight: 'bold', color: colors.text, marginTop: 12 }}>{group}</Text>
                {items.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => {
                      console.log('Badge tapped', category.id);
                      onCategorySelect(category.id);
                    }}
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: category.color ? `${category.color}20` : '#F3F4F6' },
                    ]}
                  >
                    <Text style={[styles.categoryBadgeText, { color: category.color || '#374151' }]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </SlideView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',

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