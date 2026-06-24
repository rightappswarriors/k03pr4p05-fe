// ─── Catalog Search Modal ──────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
// screens/(admin)/add-inventory-item.tsx
// Search item catalog → configure price, qty, units → add to outlet inventory
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Search, Package, X } from 'lucide-react-native';
import { InventoryService } from '@/services/inventoryService';
import { CatalogItem } from '@/types';

async function searchCatalog(
  q: string,
  setLoading: (loading: boolean) => void,
): Promise<CatalogItem[]> {
  try {
    setLoading(true);
    const items = await InventoryService.getOrgItems(q, 50);
    if (__DEV__) {
      console.log('Catalog search results:', items);
    }
    return items.map((item) => ({
      id: item.id.toString(),
      name: item.name,
      barcode: item.barcode,
      itemCode: item.itemCode,
      brand: item.brandDetails?.name,
      category: item.category?.name,
      image: item.image,
      sellingPrice: item.sellingPrice, // Default price since Item doesn't have price at org level
      stock: item.stock,
      costLines: item.costLines || [],
    }));
  } catch (error) {
    console.error('Failed to search catalog:', error);
    return [];
  } finally {
    setLoading(false);
  }
}

export function CatalogSearchModal({
  visible,
  onClose,
  onSelect,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: CatalogItem) => void;
  colors: any;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { isMobile, width } = useResponsive();

  // Show full catalog on open — no need to search for the first load
  React.useEffect(() => {
    if (visible && !hasSearched) {
      searchCatalog('', setLoading).then(setResults);
    }
    if (!visible) {
      // Reset when closed so next open shows full list again
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }
  }, [visible]);

  const doSearch = async () => {
    const q = query.trim();
    setLoading(true);
    setHasSearched(true);
    const res = await searchCatalog(q || '', setLoading); // empty string returns all
    setResults(res);
    setLoading(false);
  };

  const handleClear = () => {
    setQuery('');
    searchCatalog('', setLoading).then(setResults);
    setHasSearched(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',

          justifyContent: isMobile ? 'flex-end' : 'center',
        }}
      >
        <TouchableOpacity
          //style={{ flex: 1 }}
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            csm.sheet,
            {
              backgroundColor: colors.surface,
              width: isMobile ? '100%' : Math.min(600, width * 0.7),
              maxHeight: isMobile ? '90%' : '80%',
              borderTopLeftRadius: isMobile ? 20 : 16,
              borderTopRightRadius: isMobile ? 20 : 16,
              borderRadius: isMobile ? 0 : 16,
              alignSelf: 'center',
              ...(isMobile
                ? {}
                : {
                  shadowColor: '#000',
                  shadowOpacity: 0.2,
                  shadowRadius: 20,
                  elevation: 10,
                }),
            },
          ]}
        >
          {isMobile && (
            <View style={[csm.handle, { backgroundColor: colors.border }]} />
          )}
          <View style={[csm.header, { borderBottomColor: colors.border }]}>
            <Text style={[csm.title, { color: colors.text }]}>
              Search Item Catalog
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {/* Search row */}

          <View style={[csm.searchRow, { borderBottomColor: colors.border }]}>
            <View
              style={[
                csm.searchBox,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={13} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                style={[csm.searchInput, { color: colors.text }]}
                placeholder="Search by name, barcode, brand…"
                placeholderTextColor={colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                onSubmitEditing={doSearch}
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={handleClear}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={13} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                csm.searchBtn,
                { backgroundColor: loading ? colors.border : colors.primary },
              ]}
              onPress={doSearch}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Search size={13} color="#fff" strokeWidth={2.5} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
                {loading ? '…' : 'Search'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading state — shown above FlatList so it's always visible */}
          {loading && (
            <View
              style={{
                padding: 20,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <ActivityIndicator />
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                Searching catalog…
              </Text>
            </View>
          )}

          {!loading && (
            <FlatList
              data={results}
              keyExtractor={(i) => i.id}
              style={{ maxHeight: 320 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={{ padding: 28, alignItems: 'center' }}>
                  <Package size={32} color={colors.border} strokeWidth={1.5} />
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      marginTop: 10,
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator />
                    ) : query ? (
                      `No items found for "${query}"`
                    ) : (
                      <>
                        <ActivityIndicator />
                        <Text>'No catalog items available.'</Text>
                      </>
                    )}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[csm.resultRow, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.75}
                >
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={csm.itemImage}
                      resizeMode="cover"
                      defaultSource={require('@/assets/images/placeholder.png')}
                    />
                  ) : (
                    <View
                      style={[
                        csm.icon,
                        { backgroundColor: colors.primary + '18' },
                      ]}
                    >
                      <Package
                        size={16}
                        color={colors.primary}
                        strokeWidth={2}
                      />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[csm.itemName, { color: colors.text }]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[csm.itemMeta, { color: colors.textSecondary }]}
                    >
                      {item.brand ? `${item.brand} · ` : ''}
                      {item.category} · {item.barcode}
                    </Text>
                  </View>
                  <Text style={[csm.selectTxt, { color: colors.primary }]}>
                    Select
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const csm = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  itemImage: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: '800' },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13 },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    justifyContent: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemMeta: { fontSize: 11, marginTop: 2 },
  selectTxt: { fontSize: 13, fontWeight: '700' },
});
