import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Plus,
  Search,
  Tag,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useSocket } from '@/contexts/SocketContext';
import { DataTable, EmptyState } from '@/components/DataTable';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { SkeletonBox } from '@/components/LoadingSkeleton';
import { FadeDialogModal } from '@/components/supplier/catalog/FadeDialogModal';
import { GlobalParentCategoryPicker } from '@/components/GlobalParentCategoryPicker';
import { FilterTabs } from '@/components/FilterTabs';
import { useResponsive } from '@/hooks/useResponsive';
import { usePermissions } from '@/hooks/usePermissions';
import {
  createCategorySuggestion,
  getCategoryPlacementSuggestions,
  getCategoryTree,
  getCategoryUsage,
  getMyCategorySuggestions,
  type CategoryPlacementSuggestion,
  type CategorySuggestion,
  type CategorySuggestionStatus,
  type CategoryTreeNode,
} from '@/services/globalCategoryService';

const STATUS_COLORS: Record<CategorySuggestionStatus, string> = {
  PENDING: '#D97706',
  APPROVED: '#059669',
  REJECTED: '#DC2626',
  MERGED: '#7C3AED',
};
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));

function StatusBadge({ status }: { status: CategorySuggestionStatus }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 99,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: `${STATUS_COLORS[status]}1A`,
      }}
    >
      <Text
        style={{
          color: STATUS_COLORS[status],
          fontSize: 11,
          fontWeight: '800',
        }}
      >
        {status === 'MERGED'
          ? 'Merged into existing category'
          : status === 'PENDING'
            ? 'Pending review'
            : status[0] + status.slice(1).toLowerCase()}
      </Text>
    </View>
  );
}

function SuggestModal({
  visible,
  onClose,
  categories,
  onSubmitted,
}: {
  visible: boolean;
  onClose: () => void;
  categories: CategoryTreeNode[];
  onSubmitted: () => void;
}) {
  const { colors } = useTheme();
  const { isMobile, height } = useResponsive();
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [placements, setPlacements] = useState<CategoryPlacementSuggestion[]>(
    [],
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => {
    if (visible) {
      setName('');
      setDescription('');
      setParentId(null);
      setPlacements([]);
      setConfirmOpen(false);
    }
  }, [visible]);
  useEffect(() => {
    const proposedName = name.trim();
    if (!visible || proposedName.length < 2) {
      setPlacements([]);
      return;
    }
    const timer = setTimeout(() => {
      getCategoryPlacementSuggestions(
        proposedName,
        description.trim() || undefined,
      )
        .then(setPlacements)
        .catch(() => setPlacements([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [visible, name, description]);
  const selectedParent = categories.find(
    (category) => category.id === parentId,
  );
  const parentBreadcrumb = selectedParent
    ? (() => {
      const path: string[] = [];
      let current: CategoryTreeNode | undefined = selectedParent;
      while (current) {
        path.unshift(current.name);
        current = categories.find(
          (category) => category.id === current?.parentId,
        );
      }
      return path.join(' › ');
    })()
    : 'Main category';
  const submit = async () => {
    setSaving(true);
    try {
      const result = await createCategorySuggestion({
        proposedName: name.trim(),
        proposedDescription: description.trim() || undefined,
        parentCategoryId: parentId,
      });
      if (result.possibleDuplicates.length) {
        toast.show(
          'A matching category already exists. Please use it from the product form.',
          'warning',
        );
        setConfirmOpen(false);
        return;
      }
      toast.show('Category suggestion submitted for review.', 'success');
      setConfirmOpen(false);
      onSubmitted();
      onClose();
    } catch {
      toast.show("We couldn't submit this category suggestion.", 'error');
    } finally {
      setSaving(false);
    }
  };
  const requestSubmit = () => {
    if (!name.trim()) return toast.show('Enter a category name.', 'warning');
    if (name.trim().length > 120 || description.length > 1000)
      return toast.show(
        'Keep the category name and description concise.',
        'warning',
      );
    setConfirmOpen(true);
  };
  const body = (
    <>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 20,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
            Suggest Category
          </Text>
          <Text
            style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}
          >
            Suggest a missing marketplace category for Admin review.
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Close suggestion form"
          onPress={onClose}
          disabled={saving}
        >
          <X color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, gap: 12 }}
      >
        <Text style={{ color: colors.text, fontWeight: '700' }}>
          Proposed Category Name *
        </Text>
        <TextInput
          autoFocus={visible}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Organic Agricultural Inputs"
          placeholderTextColor={colors.textSecondary}
          style={{
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            padding: 12,
          }}
        />
        <Text style={{ color: colors.text, fontWeight: '700', marginTop: 4 }}>
          Parent Category
        </Text>
        <GlobalParentCategoryPicker
          categories={categories}
          suggestedCategories={placements}
          selectedId={parentId}
          onSelect={setParentId}
          disabled={saving}
        />
        <Text style={{ color: colors.text, fontWeight: '700', marginTop: 4 }}>
          Description / example products
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Describe the products this category covers."
          placeholderTextColor={colors.textSecondary}
          style={{
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            padding: 12,
            minHeight: 96,
            textAlignVertical: 'top',
          }}
        />
      </ScrollView>
      <View
        style={{
          flexDirection: isMobile ? 'column-reverse' : 'row',
          justifyContent: 'flex-end',
          gap: 10,
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={onClose}
          disabled={saving}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '800' }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Submit category suggestion"
          onPress={requestSubmit}
          disabled={saving}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>
            Submit Suggestion
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
  const confirmation = (
    <Modal
      visible={confirmOpen}
      transparent
      animationType="fade"
      onRequestClose={() => !saving && setConfirmOpen(false)}
    >
      <View
        style={{
          flex: 1,
          padding: 24,
          backgroundColor: 'rgba(0,0,0,.55)',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            alignSelf: 'center',
            width: '100%',
            maxWidth: 480,
            borderRadius: 16,
            padding: 22,
            gap: 12,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
            Submit category suggestion?
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            You're suggesting '{name.trim()}'{' '}
            {parentId
              ? `under '${parentBreadcrumb}'.`
              : 'as a new main category.'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            An Admin will review it before it becomes available to suppliers.
          </Text>
          <View
            style={{
              flexDirection: isMobile ? 'column-reverse' : 'row',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => setConfirmOpen(false)}
              disabled={saving}
              style={{ padding: 12, alignItems: 'center' }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                Go Back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={saving}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 9,
                backgroundColor: colors.primary,
                alignItems: 'center',
              }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  Submit Suggestion
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  if (!isMobile)
    return (
      <>
        {
          <FadeDialogModal
            visible={visible}
            onRequestClose={saving ? () => { } : onClose}
            maxWidth={680}
          >
            <View
              style={{ backgroundColor: colors.card, maxHeight: height * 0.85 }}
            >
              {body}
            </View>
          </FadeDialogModal>
        }
        {confirmation}
      </>
    );
  return (
    <>
      {
        <Modal
          visible={visible}
          transparent
          animationType="slide"
          onRequestClose={saving ? () => { } : onClose}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,.55)',
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: '90%',
              }}
            >
              {body}
            </View>
          </View>
        </Modal>
      }
      {confirmation}
    </>
  );
}

export default function SupplierCategoriesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { subscribe } = useSocket();
  const { permissionFor } = usePermissions();
  const categoryPermission = permissionFor('supplierCategoriesPage');
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<CategoryTreeNode | null>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [suggestionTotal, setSuggestionTotal] = useState(0);
  const [suggestionPage, setSuggestionPage] = useState(1);
  const [suggestionPageSize, setSuggestionPageSize] = useState(30);
  const [suggestionStatus, setSuggestionStatus] = useState<
    CategorySuggestionStatus | undefined
  >();
  const [suggestionLoading, setSuggestionLoading] = useState(true);
  const loadTree = useCallback(async () => {
    setTreeLoading(true);
    setTreeError(false);
    try {
      setTree(await getCategoryTree());
    } catch {
      setTreeError(true);
    } finally {
      setTreeLoading(false);
    }
  }, []);
  const loadSuggestions = useCallback(async () => {
    setSuggestionLoading(true);
    try {
      const response = await getMyCategorySuggestions({
        page: suggestionPage,
        limit: suggestionPageSize,
        status: suggestionStatus,
      });
      setSuggestions(response.items);
      setSuggestionTotal(response.total);
    } catch {
      toast.show("We couldn't load your category suggestions.", 'error');
    } finally {
      setSuggestionLoading(false);
    }
  }, [suggestionPage, suggestionPageSize, suggestionStatus, toast]);
  useEffect(() => {
    loadTree();
  }, [loadTree]);
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search.trim().toLowerCase()),
      300,
    );
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(
    () =>
      subscribe((event) => {
        if (event.event === 'category:suggestion-reviewed') {
          loadSuggestions();
          loadTree();
        }
      }),
    [subscribe, loadSuggestions, loadTree],
  );
  useEffect(() => {
    if (!selected) return;
    setUsage(null);
    getCategoryUsage(selected.id)
      .then((result) => setUsage(result.supplierItemCount))
      .catch(() => setUsage(null));
  }, [selected]);
  const byParent = useMemo(() => {
    const map = new Map<string | null, CategoryTreeNode[]>();
    tree.forEach((node) =>
      map.set(node.parentId, [...(map.get(node.parentId) ?? []), node]),
    );
    return map;
  }, [tree]);
  const path = useCallback(
    (node?: Pick<CategoryTreeNode, 'id' | 'name' | 'slug' | 'parentId'> | null) => {
      const result: Array<Pick<CategoryTreeNode, 'id' | 'name' | 'slug' | 'parentId'>> =
        [];
      let current = node;
      while (current) {
        result.unshift(current);
        current =
          tree.find((candidate) => candidate.id === current?.parentId) ?? null;
      }
      return result;
    },
    [tree],
  );
  const visibleNodes = useMemo(
    () =>
      tree.filter(
        (node) =>
          !debouncedSearch ||
          path(node).some((part) =>
            `${part.name} ${part.slug}`.toLowerCase().includes(debouncedSearch),
          ),
      ),
    [tree, debouncedSearch, path],
  );
  const renderNode = (node: CategoryTreeNode) => {
    const children = byParent.get(node.id) ?? [];
    const isExpanded = expanded.has(node.id);
    if (!visibleNodes.some((item) => item.id === node.id)) return null;
    return (
      <View key={node.id}>
        <TouchableOpacity
          accessibilityLabel={`Select ${node.name}`}
          onPress={() => {
            setSelected(node);
            if (children.length)
              setExpanded((current) => {
                const next = new Set(current);
                next.has(node.id) ? next.delete(node.id) : next.add(node.id);
                return next;
              });
          }}
          style={{
            minHeight: 42,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingLeft: 10 + node.depth * 18,
            paddingRight: 10,
            borderRadius: 8,
            backgroundColor:
              selected?.id === node.id ? `${colors.primary}20` : 'transparent',
          }}
        >
          {children.length ? (
            isExpanded ? (
              <ChevronDown size={16} color={colors.textSecondary} />
            ) : (
              <ChevronRight size={16} color={colors.textSecondary} />
            )
          ) : (
            <View style={{ width: 16 }} />
          )}
          <Text
            style={{
              flex: 1,
              color: colors.text,
              fontWeight: node.depth === 0 ? '800' : '600',
            }}
          >
            {node.name}
          </Text>
          <ChevronRight size={15} color={colors.textSecondary} />
        </TouchableOpacity>
        {(isExpanded || !!debouncedSearch) && children.map(renderNode)}
      </View>
    );
  };
  const suggestionResult = (suggestion: CategorySuggestion) =>
    suggestion.status === 'REJECTED'
      ? (suggestion.rejectionReason ?? 'Rejected')
      : suggestion.approvedCategory
        ? `${suggestion.status === 'APPROVED' ? 'Created as' : 'Uses existing'}: ${path(
          tree.find((node) => node.id === suggestion.approvedCategory?.id),
        )
          .map((node) => node.name)
          .join(' › ')}`
        : suggestion.status === 'PENDING'
          ? 'Awaiting Admin review'
          : 'Result pending';
  const suggestionRows = suggestions.map((suggestion) => ({
    key: suggestion.id,
    cells: [
      <Text style={{ color: colors.text, fontWeight: '700' }}>
        {suggestion.proposedName}
      </Text>,
      <Text style={{ color: colors.textSecondary }}>
        {suggestion.parentCategory
          ? path(suggestion.parentCategory)
            .map((node) => node.name)
            .join(' › ')
          : 'Root category'}
      </Text>,
      <Text style={{ color: colors.textSecondary }}>
        {formatDate(suggestion.createdAt)}
      </Text>,
      <StatusBadge status={suggestion.status} />,
      <Text style={{ color: colors.textSecondary }}>
        {suggestionResult(suggestion)}
      </Text>,
    ],
  }));
  const suggestionEmptyTitle = suggestionStatus === 'PENDING' ? 'No pending category suggestions.' : suggestionStatus === 'APPROVED' ? 'No approved category suggestions yet.' : suggestionStatus === 'REJECTED' ? 'No rejected category suggestions.' : suggestionStatus === 'MERGED' ? 'No merged category suggestions.' : "You haven't suggested any categories yet.";
  const suggestionEmptyMessage = suggestionStatus ? 'Try another status or submit a new category suggestion.' : 'Use Suggest Category when a marketplace category is missing.';
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: desktop ? 28 : 16,
        gap: 18,
        maxWidth: 1500,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <View
        style={{
          flexDirection: desktop ? 'row' : 'column',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View>
          <Text style={{ color: colors.text, fontSize: 27, fontWeight: '800' }}>
            Categories
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
            Browse Kompra's marketplace categories and organize your products.
          </Text>
        </View>
        {categoryPermission.canCreate && (
          <TouchableOpacity
            accessibilityLabel="Suggest a category"
            onPress={() => setSuggestOpen(true)}
            style={{
              alignSelf: desktop ? 'center' : 'flex-start',
              flexDirection: 'row',
              gap: 7,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 11,
              backgroundColor: colors.primary,
            }}
          >
            <Plus size={17} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800' }}>
              Suggest Category
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 16 }}>
        <View
          style={{
            flex: desktop ? 0.34 : undefined,
            padding: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            minHeight: 340,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 9,
              paddingHorizontal: 10,
              marginBottom: 10,
            }}
          >
            <Search size={16} color={colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search categories..."
              placeholderTextColor={colors.textSecondary}
              style={{ flex: 1, color: colors.text, height: 40 }}
            />
          </View>
          {treeLoading ? (
            <>
              <SkeletonBox style={{ height: 42, marginBottom: 8 }} />
              <SkeletonBox style={{ height: 42, marginBottom: 8 }} />
              <SkeletonBox style={{ height: 42 }} />
            </>
          ) : treeError ? (
            <EmptyState
              title="We couldn't load categories."
              message="Try again to load marketplace categories."
            />
          ) : tree.length === 0 ? (
            <EmptyState
              title="No marketplace categories are available yet."
              message="Please check back later."
            />
          ) : (
            <ScrollView style={{ maxHeight: desktop ? 520 : 300 }}>
              {(byParent.get(null) ?? []).map(renderNode)}
            </ScrollView>
          )}
        </View>
        <View
          style={{
            flex: desktop ? 0.66 : undefined,
            padding: 20,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            minHeight: 340,
          }}
        >
          {selected ? (
            <View style={{ gap: 14 }}>
              <View
                style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
              >
                <View
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: `${colors.primary}18`,
                  }}
                >
                  <Tag color={colors.primary} />
                </View>
                <View>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 22,
                      fontWeight: '800',
                    }}
                  >
                    {selected.name}
                  </Text>
                  <Text
                    style={{
                      color: '#059669',
                      fontWeight: '700',
                      fontSize: 12,
                    }}
                  >
                    ACTIVE
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.textSecondary }}>
                {path(selected)
                  .map((node) => node.name)
                  .join(' › ')}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                Level {selected.depth + 1} ·{' '}
                {(byParent.get(selected.id) ?? []).length} child categories
              </Text>
              <View
                style={{
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: colors.background,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  YOUR PRODUCTS
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 25,
                    fontWeight: '800',
                    marginTop: 4,
                  }}
                >
                  {usage ?? '—'}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel={`View products in ${selected.name}`}
                onPress={() =>
                  router.push({
                    pathname: '/(supplier)/catalog',
                    params: { globalCategoryId: selected.id },
                  } as any)
                }
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 9,
                  backgroundColor: colors.primary,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  View My Products
                </Text>
              </TouchableOpacity>
              {selected.hasChildren && (
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Choose a more specific category when possible.
                </Text>
              )}
            </View>
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <FolderTree size={38} color={colors.textSecondary} />
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                Select a category to view details
              </Text>
              <Text
                style={{ color: colors.textSecondary, textAlign: 'center' }}
              >
                Browse the category tree to see your product usage and category
                path.
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>
          My Suggestions
        </Text>
        <FilterTabs
          value={suggestionStatus ?? 'ALL'}
          onChange={(value) => {
            setSuggestionStatus(value === 'ALL' ? undefined : (value as CategorySuggestionStatus));
            setSuggestionPage(1);
          }}
          options={[{ value: 'ALL', label: 'All' }, ...(['PENDING', 'APPROVED', 'REJECTED', 'MERGED'] as CategorySuggestionStatus[]).map((status) => ({ value: status, label: status[0] + status.slice(1).toLowerCase() }))]}
          accessibilityLabel="Filter category suggestions by status"
        />
        {suggestionLoading ? (
          <SkeletonBox style={{ height: 160 }} />
        ) : desktop ? (
        <View style={{ minHeight: 340 }}>
          <DataTable
            columns={[
              { label: 'Suggestion', width: 1.4 },
              { label: 'Parent', width: 1.6 },
              { label: 'Submitted', width: 0.9 },
              { label: 'Status', width: 1.3 },
              { label: 'Result', width: 2 },
            ]}
            rows={suggestionRows}
            emptyState={
              <EmptyState
                title={suggestionEmptyTitle}
                message={suggestionEmptyMessage}
              />
            }
          />
        </View>
        ) : (
        <View style={{ gap: 10 }}>
          {suggestions.length ? (
            suggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion.id}
                onPress={() => {
                  const mapped = tree.find(
                    (node) => node.id === suggestion.approvedCategory?.id,
                  );
                  if (mapped) setSelected(mapped);
                }}
                style={{
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  backgroundColor: colors.card,
                  gap: 7,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  {suggestion.proposedName}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Submitted {formatDate(suggestion.createdAt)}
                </Text>
                <StatusBadge status={suggestion.status} />
                <Text style={{ color: colors.textSecondary }}>
                  {suggestionResult(suggestion)}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState
              title={suggestionEmptyTitle}
              message={suggestionEmptyMessage}
            />
          )}
        </View>
        )}
        <AdminPagination
          page={suggestionPage}
          total={suggestionTotal}
          pageSize={suggestionPageSize}
          onPageChange={setSuggestionPage}
          onPageSizeChange={(size) => {
            setSuggestionPageSize(size);
            setSuggestionPage(1);
          }}
        />
      </View>
      <SuggestModal
        visible={suggestOpen && categoryPermission.canCreate}
        onClose={() => setSuggestOpen(false)}
        categories={tree}
        onSubmitted={() => {
          loadSuggestions();
          loadTree();
        }}
      />
    </ScrollView>
  );
}
