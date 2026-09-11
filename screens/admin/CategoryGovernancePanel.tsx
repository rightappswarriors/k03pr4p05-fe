import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Clock,
  FolderCheck,
  FolderTree,
  Layers,
  Search,
} from 'lucide-react-native';
import { DataTable, EmptyState } from '@/components/DataTable';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { FadeDialogModal } from '@/components/supplier/catalog/FadeDialogModal';
import { Kpis } from '@/components/Kpi';
import { FilterTabs } from '@/components/FilterTabs';
import { GlobalParentCategoryPicker } from '@/components/GlobalParentCategoryPicker';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useResponsive } from '@/hooks/useResponsive';
import {
  approveCategorySuggestion,
  archiveGlobalCategory,
  changeMergedCategorySuggestionTarget,
  convertMergedCategorySuggestionToCategory,
  getAdminCategorySuggestions,
  getCategoryTree,
  getGlobalCategories,
  mergeCategorySuggestion,
  rejectCategorySuggestion,
  restoreGlobalCategory,
  updateGlobalCategory,
  type AdminCategorySuggestion,
  type CategorySuggestionStatus,
  type CategoryTreeNode,
  type GlobalCategory,
} from '@/services/globalCategoryService';

const statusColor: Record<CategorySuggestionStatus, string> = {
  PENDING: '#D97706',
  APPROVED: '#059669',
  REJECTED: '#DC2626',
  MERGED: '#7C3AED',
};

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))
    : '—';

function Badge({ status }: { status: CategorySuggestionStatus }) {
  return (
    <Text
      style={{
        color: statusColor[status],
        backgroundColor: `${statusColor[status]}18`,
        borderRadius: 99,
        overflow: 'hidden',
        paddingHorizontal: 8,
        paddingVertical: 4,
        fontSize: 11,
        fontWeight: '800',
      }}
    >
      {status === 'PENDING' ? 'Pending review' : status}
    </Text>
  );
}

export function CategoryGovernancePanel() {
  const { colors } = useTheme();
  const toast = useToast();
  const { isMobile, isDesktop, height } = useResponsive();

  const [tab, setTab] = useState<'tree' | 'suggestions'>('tree');
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [suggestions, setSuggestions] = useState<AdminCategorySuggestion[]>([]);
  const [totalSuggestions, setTotalSuggestions] = useState(0);
  const [suggestionPage, setSuggestionPage] = useState(1);
  const [suggestionSize, setSuggestionSize] = useState(20);
  const [status, setStatus] = useState<CategorySuggestionStatus | undefined>(
    'PENDING',
  );
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GlobalCategory | null>(null);
  const [review, setReview] = useState<AdminCategorySuggestion | null>(null);
  const [mode, setMode] = useState<
    'actions' | 'approve' | 'under' | 'merge' | 'reject'
  >('actions');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState('0');
  const [featured, setFeatured] = useState(false);
  const [reason, setReason] = useState('');
  const [mergeSearch, setMergeSearch] = useState('');
  const [mergeCategoryId, setMergeCategoryId] = useState<string | null>(null);
  const [mergeConfirmationOpen, setMergeConfirmationOpen] = useState(false);
  const [creationConfirmationOpen, setCreationConfirmationOpen] =
    useState(false);
  const [resolutionCreationConfirmationOpen, setResolutionCreationConfirmationOpen] =
    useState(false);
  const [treeSearch, setTreeSearch] = useState('');
  const [expandedTreeIds, setExpandedTreeIds] = useState<Set<string>>(
    new Set(),
  );
  const [details, setDetails] = useState<AdminCategorySuggestion | null>(null);
  const [resolutionMode, setResolutionMode] = useState<
    'actions' | 'target' | 'convert'
  >('actions');
  const [resolutionTargetId, setResolutionTargetId] = useState<string | null>(
    null,
  );
  const [resolutionParentId, setResolutionParentId] = useState<string | null>(
    null,
  );
  const [resolutionSearch, setResolutionSearch] = useState('');

  const loadCategories = useCallback(async () => {
    const [nextTree, activePage, archivedPage] = await Promise.all([
      getCategoryTree(),
      getGlobalCategories({ page: 1, limit: 100 }),
      getGlobalCategories({ page: 1, limit: 100, status: 'ARCHIVED' }),
    ]);
    setTree(nextTree);
    setCategories([...activePage.items, ...archivedPage.items]);
  }, []);

  const loadSuggestions = useCallback(async () => {
    const page = await getAdminCategorySuggestions({
      page: suggestionPage,
      limit: suggestionSize,
      status,
      search: search.trim() || undefined,
    });
    setSuggestions(page.items);
    setTotalSuggestions(page.total);
  }, [suggestionPage, suggestionSize, status, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadCategories(), loadSuggestions()]);
    } catch {
      toast.show("We couldn't load category governance data.", 'error');
    } finally {
      setLoading(false);
    }
  }, [loadCategories, loadSuggestions, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const byParent = useMemo(() => {
    const map = new Map<string | null, CategoryTreeNode[]>();
    tree.forEach((category) =>
      map.set(category.parentId, [
        ...(map.get(category.parentId) ?? []),
        category,
      ]),
    );
    return map;
  }, [tree]);

  const breadcrumb = useCallback(
    (categoryId?: string | null) => {
      const names: string[] = [];
      let current = tree.find((category) => category.id === categoryId);
      while (current) {
        names.unshift(current.name);
        current = tree.find((category) => category.id === current?.parentId);
      }
      return names.join(' › ') || 'Main category';
    },
    [tree],
  );

  const openEditor = (category: GlobalCategory) => {
    setSelected(category);
    setName(category.name);
    setDescription(category.description ?? '');
    setParentId(category.parentId);
    setSortOrder(String(category.sortOrder));
    setFeatured(category.isFeatured);
    setEditOpen(true);
  };

  const saveCategory = async () => {
    if (!selected || !name.trim())
      return toast.show('Enter a category name.', 'warning');
    setBusy(true);
    try {
      await updateGlobalCategory(selected.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        parentId,
        sortOrder: Number(sortOrder) || 0,
        isFeatured: featured,
      });
      toast.show('Category updated.', 'success');
      setEditOpen(false);
      await loadCategories();
    } catch (error: any) {
      toast.show(error.message ?? "We couldn't update this category.", 'error');
    } finally {
      setBusy(false);
    }
  };

  const archive = async (restore = false) => {
    if (!selected) return;
    setBusy(true);
    try {
      restore
        ? await restoreGlobalCategory(selected.id)
        : await archiveGlobalCategory(selected.id);
      toast.show(
        restore
          ? 'Category restored.'
          : 'Category archived. Existing products keep this category.',
        'success',
      );
      setSelected({ ...selected, status: restore ? 'ACTIVE' : 'ARCHIVED' });
      await loadCategories();
    } catch (error: any) {
      toast.show(error.message ?? "We couldn't update this category.", 'error');
    } finally {
      setBusy(false);
    }
  };

  const performReview = async () => {
    if (!review) return;
    if (mode === 'reject' && reason.trim().length < 5)
      return toast.show('Provide a short reason for the supplier.', 'warning');
    if (mode === 'merge' && !mergeCategoryId)
      return toast.show('Choose an existing category.', 'warning');
    setBusy(true);
    try {
      if (mode === 'approve' || mode === 'under') {
        await approveCategorySuggestion(review.id, {
          name: name.trim() || review.proposedName,
          description: description.trim() || undefined,
          parentId,
          sortOrder: Number(sortOrder) || 0,
          isFeatured: featured,
        });
      }
      if (mode === 'merge')
        await mergeCategorySuggestion(review.id, mergeCategoryId!);
      if (mode === 'reject')
        await rejectCategorySuggestion(review.id, reason.trim());

      toast.show(
        mode === 'approve' || mode === 'under'
          ? 'New category created.'
          : mode === 'merge'
            ? 'Suggestion linked to the existing category.'
            : 'Suggestion rejected.',
        'success',
      );
      setReview(null);
      setMode('actions');
      setMergeConfirmationOpen(false);
      setCreationConfirmationOpen(false);
      await Promise.all([loadCategories(), loadSuggestions()]);
    } catch (error: any) {
      toast.show(
        error.message ?? "We couldn't review this suggestion.",
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const openReview = (suggestion: AdminCategorySuggestion) => {
    setReview(suggestion);
    setMode('actions');
    setName(suggestion.proposedName);
    setDescription(suggestion.proposedDescription ?? '');
    setParentId(suggestion.parentCategoryId ?? null);
    setSortOrder('0');
    setFeatured(false);
    setReason('');
    setMergeSearch('');
    setMergeCategoryId(null);
    setMergeConfirmationOpen(false);
    setCreationConfirmationOpen(false);
  };

  const roots = byParent.get(null) ?? [];
  const visibleMerge = [
    ...new Map(
      tree
        .filter((category) =>
          breadcrumb(category.id)
            .toLowerCase()
            .includes(mergeSearch.toLowerCase()),
        )
        .map((category) => [category.id, category]),
    ).values(),
  ].slice(0, 12);
  const selectedMergeCategory = mergeCategoryId
    ? tree.find((category) => category.id === mergeCategoryId)
    : undefined;

  const visibleTreeIds = useMemo(() => {
    const query = treeSearch.trim().toLowerCase();
    if (!query) return null;
    const ids = new Set<string>();
    tree.forEach((category) => {
      if (!breadcrumb(category.id).toLowerCase().includes(query)) return;
      let current: CategoryTreeNode | undefined = category;
      while (current) {
        ids.add(current.id);
        current = tree.find((item) => item.id === current?.parentId);
      }
    });
    return ids;
  }, [breadcrumb, tree, treeSearch]);
  const renderTree = (node: CategoryTreeNode): React.ReactNode => {
    if (visibleTreeIds && !visibleTreeIds.has(node.id)) return null;

    const children = (byParent.get(node.id) ?? []).filter(
      (child) => !visibleTreeIds || visibleTreeIds.has(child.id),
    );
    // Derive from the actual tree data instead of trusting node.hasChildren
    const hasChildren = (byParent.get(node.id) ?? []).length > 0;
    const isExpanded = visibleTreeIds ? true : expandedTreeIds.has(node.id);

    const handlePress = () => {
      setSelected(
        categories.find((category) => category.id === node.id) ?? null,
      );
      if (hasChildren && !visibleTreeIds) {
        setExpandedTreeIds((current) => {
          const next = new Set(current);
          isExpanded ? next.delete(node.id) : next.add(node.id);
          return next;
        });
      }
    };

    return (
      <View key={node.id}>
        <TouchableOpacity
          onPress={handlePress}
          accessibilityLabel={
            hasChildren
              ? `${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`
              : node.name
          }
          style={{
            minHeight: 38,
            paddingVertical: 8,
            paddingLeft: 8 + node.depth * 22,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            backgroundColor:
              selected?.id === node.id ? `${colors.primary}18` : 'transparent',
          }}
        >
          {hasChildren ? (
            <ChevronDown
              size={15}
              color={colors.textSecondary}
              style={{
                transform: [{ rotate: isExpanded ? '0deg' : '-90deg' }],
              }}
            />
          ) : (
            <View style={{ width: 15 }} />
          )}
          <Text
            style={{
              color: colors.text,
              fontWeight: node.depth === 0 ? '800' : '600',
              flex: 1,
            }}
          >
            {node.name}
          </Text>
        </TouchableOpacity>
        {isExpanded && children.map(renderTree)}
      </View>
    );
  };

  const openSuggestionDetails = (suggestion: AdminCategorySuggestion) => {
    setDetails(suggestion);
    setResolutionMode('actions');
    setResolutionTargetId(null);
    setResolutionParentId(suggestion.parentCategoryId ?? null);
    setResolutionSearch('');
    setResolutionCreationConfirmationOpen(false);
    setName(suggestion.proposedName);
    setDescription(suggestion.proposedDescription ?? '');
    setParentId(suggestion.parentCategoryId ?? null);
  };

  const saveResolution = async () => {
    if (!details) return;
    if (resolutionMode === 'target' && !resolutionTargetId)
      return toast.show('Choose an existing category.', 'warning');
    if (resolutionMode === 'convert' && !resolutionParentId)
      return toast.show('Choose a parent category.', 'warning');
    setBusy(true);
    try {
      if (resolutionMode === 'target')
        await changeMergedCategorySuggestionTarget(
          details.id,
          resolutionTargetId!,
        );
      if (resolutionMode === 'convert') {
        if (__DEV__) {
          console.info('[CAT-RESOLVE-1] selected resolution type', 'CREATE_NEW');
          console.info('[CAT-RESOLVE-2] suggestionId', details.id);
          console.info('[CAT-RESOLVE-3] parentCategoryId', resolutionParentId);
          console.info('[CAT-RESOLVE-4] mutation invoked', 'convertMergedCategorySuggestionToCategory');
        }
        await convertMergedCategorySuggestionToCategory(details.id, {
          name: name.trim() || details.proposedName,
          description: description.trim() || undefined,
          parentId: resolutionParentId!,
        });
      }
      toast.show(
        resolutionMode === 'target'
          ? 'Existing category target updated.'
          : 'New category created and suggestion updated.',
        'success',
      );
      setDetails(null);
      setResolutionCreationConfirmationOpen(false);
      await Promise.all([loadCategories(), loadSuggestions()]);
    } catch (error: any) {
      toast.show(
        error.message ?? "We couldn't update this resolution.",
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const summary = {
    pending: suggestions.filter((item) => item.status === 'PENDING').length,
    active: categories.filter((item) => item.status === 'ACTIVE').length,
    roots: tree.filter((item) => !item.parentId).length,
    archived: categories.filter((item) => item.status === 'ARCHIVED').length,
  };

  const kpiItems = [
    {
      title: 'Pending Suggestions',
      value: String(summary.pending),
      icon: Clock,
      accent: '#D97706',
    },
    {
      title: 'Active Categories',
      value: String(summary.active),
      icon: FolderCheck,
      accent: '#059669',
    },
    {
      title: 'Root Categories',
      value: String(summary.roots),
      icon: Layers,
      accent: colors.primary,
    },
    {
      title: 'Archived Categories',
      value: String(summary.archived),
      icon: Archive,
      accent: '#DC2626',
    },
  ];
  const suggestionsEmptyTitle = search.trim()
    ? `No ${status ? status.toLowerCase() : ''} category suggestions match your search.`.replace(
      '  ',
      ' ',
    )
    : status === 'PENDING'
      ? 'No pending category suggestions.'
      : status === 'APPROVED'
        ? 'No approved category suggestions yet.'
        : status === 'REJECTED'
          ? 'No rejected category suggestions.'
          : status === 'MERGED'
            ? 'No merged category suggestions.'
            : 'No category suggestions found.';
  const suggestionsEmptyMessage = search.trim()
    ? 'Try another search or status.'
    : 'Try another status to view other suggestions.';

  const reviewBody = review && (
    <View style={{ backgroundColor: colors.card, maxHeight: height * 0.85 }}>
      <View
        style={{
          padding: 20,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 19, fontWeight: '900' }}>
          Review Category Suggestion
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 5 }}>
          Submitted by {review.organization?.name ?? 'Supplier organization'} ·{' '}
          {formatDate(review.createdAt)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>
          {review.proposedName}
        </Text>
        <Text style={{ color: colors.textSecondary }}>
          {review.proposedDescription || 'No description provided.'}
        </Text>
        <Text style={{ color: colors.textSecondary }}>
          Suggested placement: {breadcrumb(review.parentCategoryId)}
        </Text>

        {(mode === 'approve' || mode === 'under') && (
          <>
            <Text style={{ color: colors.text, fontWeight: '800' }}>
              Create category details
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Category name"
              placeholderTextColor={colors.textSecondary}
              style={{
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 9,
                padding: 11,
              }}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Description"
              placeholderTextColor={colors.textSecondary}
              style={{
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 9,
                padding: 11,
                minHeight: 70,
              }}
            />
            <Text style={{ color: colors.textSecondary }}>
              {mode === 'under'
                ? `Place under: ${breadcrumb(parentId)}`
                : 'This will be created as a main category.'}
            </Text>
            {mode === 'under' && (
              <ScrollView horizontal contentContainerStyle={{ gap: 7 }}>
                <TouchableOpacity
                  onPress={() => setParentId(null)}
                  style={{
                    padding: 8,
                    borderRadius: 99,
                    backgroundColor:
                      parentId === null ? colors.primary : colors.background,
                  }}
                >
                  <Text
                    style={{ color: parentId === null ? '#fff' : colors.text }}
                  >
                    Main category
                  </Text>
                </TouchableOpacity>
                {tree
                  .filter((item) => item.depth < 2)
                  .map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setParentId(item.id)}
                      style={{
                        padding: 8,
                        borderRadius: 99,
                        backgroundColor:
                          parentId === item.id
                            ? colors.primary
                            : colors.background,
                      }}
                    >
                      <Text
                        style={{
                          color: parentId === item.id ? '#fff' : colors.text,
                        }}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}
            <Text style={{ color: colors.textSecondary }}>
              {mode === 'under'
                ? `Add '${name || review.proposedName}' under '${breadcrumb(parentId)}'?`
                : `Create '${name || review.proposedName}' as a main category?`}
            </Text>
          </>
        )}

        {mode === 'merge' && (
          <>
            <TextInput
              value={mergeSearch}
              onChangeText={setMergeSearch}
              placeholder="Search existing categories..."
              placeholderTextColor={colors.textSecondary}
              style={{
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 9,
                padding: 11,
              }}
            />
            {visibleMerge.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setMergeCategoryId(item.id)}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor:
                    mergeCategoryId === item.id
                      ? `${colors.primary}18`
                      : colors.background,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {item.name}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {item.parentId ? breadcrumb(item.id) : 'Main category'}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={{ color: colors.textSecondary }}>
              The supplier's suggestion will be marked as resolved and linked to
              this existing category.
            </Text>
          </>
        )}

        {mode === 'reject' && (
          <>
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder="Explain the reason for the supplier..."
              placeholderTextColor={colors.textSecondary}
              style={{
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 9,
                padding: 11,
                minHeight: 86,
              }}
            />
            <Text style={{ color: colors.textSecondary }}>
              Reject this category suggestion?
            </Text>
          </>
        )}
      </ScrollView>

      <View
        style={{
          padding: 16,
          borderTopWidth: 1,
          borderColor: colors.border,
          flexDirection: isMobile ? 'column-reverse' : 'row',
          justifyContent: 'flex-end',
          gap: 9,
        }}
      >
        {mode === 'actions' ? (
          <>
            <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>
              Resolution Type
            </Text>
            <TouchableOpacity
              onPress={() => setMode('reject')}
              style={{ padding: 11 }}
            >
              <Text style={{ color: '#DC2626', fontWeight: '800' }}>
                Reject
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setMergeCategoryId(null);
                setMode('merge');
              }}
              style={{ padding: 11 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '800' }}>
                Use Existing Category
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setParentId(review.parentCategoryId ?? null);
                setMode('under');
              }}
              style={{ padding: 11 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '800' }}>
                Create as New Category
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setParentId(null);
                setMode('approve');
              }}
              style={{
                padding: 11,
                borderRadius: 9,
                backgroundColor: colors.primary,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>
                Create Main Category
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setMode('actions')}
              disabled={busy}
              style={{ padding: 11 }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={
                mode === 'merge'
                  ? () => setMergeConfirmationOpen(true)
                  : mode === 'approve' || mode === 'under'
                    ? () => setCreationConfirmationOpen(true)
                    : performReview
              }
              disabled={
                busy ||
                (mode === 'merge' && !mergeCategoryId) ||
                (mode === 'under' && !parentId)
              }
              style={{
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderRadius: 9,
                backgroundColor: mode === 'reject' ? '#DC2626' : colors.primary,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  {mode === 'approve'
                    ? 'Create Main Category'
                    : mode === 'under'
                      ? 'Add Category'
                      : mode === 'merge'
                        ? 'Use Existing Category'
                        : 'Reject Suggestion'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
  const mergeConfirmation = review && selectedMergeCategory && (
    <Modal
      visible={mergeConfirmationOpen}
      transparent
      animationType="fade"
      onRequestClose={() => !busy && setMergeConfirmationOpen(false)}
    >
      <View
        style={{
          flex: 1,
          padding: 24,
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,.55)',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 480,
            alignSelf: 'center',
            padding: 22,
            borderRadius: 16,
            gap: 12,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>
            Use existing category?
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Supplier suggested: '{review.proposedName}'
          </Text>
          <Text style={{ color: colors.text, fontWeight: '800' }}>
            {selectedMergeCategory.name}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {selectedMergeCategory.parentId
              ? breadcrumb(selectedMergeCategory.id)
              : 'Main category'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            No new category will be created. This suggestion will be linked to
            this existing category.
          </Text>
          <View
            style={{
              flexDirection: isMobile ? 'column-reverse' : 'row',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <TouchableOpacity
              onPress={() => setMergeConfirmationOpen(false)}
              disabled={busy}
              style={{ padding: 11 }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                Go Back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={performReview}
              disabled={busy}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderRadius: 9,
                backgroundColor: colors.primary,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  Use Existing Category
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  const creationConfirmation = review && (
    <Modal
      visible={creationConfirmationOpen}
      transparent
      animationType="fade"
      onRequestClose={() => !busy && setCreationConfirmationOpen(false)}
    >
      <View
        style={{
          flex: 1,
          padding: 24,
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,.55)',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 480,
            alignSelf: 'center',
            padding: 22,
            borderRadius: 16,
            gap: 12,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>
            {mode === 'under' ? 'Add under category?' : 'Create main category?'}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {mode === 'under'
              ? `Add '${name || review.proposedName}' under '${breadcrumb(parentId)}'?`
              : `Create '${name || review.proposedName}' as a main category?`}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            {mode === 'under'
              ? 'A new marketplace category will be created inside the selected category.'
              : 'A new marketplace category will be created at the top level.'}
          </Text>
          <View
            style={{
              flexDirection: isMobile ? 'column-reverse' : 'row',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <TouchableOpacity
              onPress={() => setCreationConfirmationOpen(false)}
              disabled={busy}
              style={{ padding: 11 }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                Go Back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={performReview}
              disabled={busy}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderRadius: 9,
                backgroundColor: colors.primary,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  {mode === 'under' ? 'Add Category' : 'Create Category'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  const resolutionCreationConfirmation = details && (
    <Modal
      visible={resolutionCreationConfirmationOpen}
      transparent
      animationType="fade"
      onRequestClose={() => !busy && setResolutionCreationConfirmationOpen(false)}
    >
      <View
        style={{
          flex: 1,
          padding: 24,
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,.55)',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 480,
            alignSelf: 'center',
            padding: 22,
            borderRadius: 16,
            gap: 12,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>
            Create new category?
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {`Create '${name || details.proposedName}' under '${breadcrumb(resolutionParentId)}'?`}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            This creates a new category and changes the suggestion from MERGED to APPROVED.
          </Text>
          <View
            style={{
              flexDirection: isMobile ? 'column-reverse' : 'row',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <TouchableOpacity
              onPress={() => setResolutionCreationConfirmationOpen(false)}
              disabled={busy}
              style={{ padding: 11 }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                Go Back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveResolution}
              disabled={busy}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderRadius: 9,
                backgroundColor: colors.primary,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  Create Category
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={{ flex: 1, gap: 16 }}>
      <View>
        <Text style={{ color: colors.text, fontSize: 25, fontWeight: '900' }}>
          Category Management
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
          Review supplier suggestions and organize Kompra's marketplace
          categories.
        </Text>
      </View>

      <Kpis items={kpiItems} />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['tree', 'suggestions'] as const).map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setTab(item)}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 9,
              borderRadius: 9,
              backgroundColor: tab === item ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: tab === item ? colors.primary : colors.border,
            }}
          >
            <Text
              style={{
                color: tab === item ? '#fff' : colors.text,
                fontWeight: '800',
              }}
            >
              {item === 'tree' ? 'Category Tree' : 'Supplier Suggestions'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View
          style={{
            flex: 1,
            minHeight: 220,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : tab === 'tree' ? (
        <View
          style={{
            flex: 1,
            flexDirection: isDesktop ? 'row' : 'column',
            gap: 14,
          }}
        >
          <ScrollView
            style={{
              flex: 1,
              height: isDesktop ? 540 : 360,
              maxHeight: isDesktop ? 540 : 360,
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              backgroundColor: colors.surface,
            }}
            contentContainerStyle={{ flexGrow: 1 }}
            nestedScrollEnabled
          >
            <Text
              style={{ color: colors.text, fontWeight: '900', marginBottom: 8 }}
            >
              CATEGORY TREE
            </Text>
            <View
              style={{
                flexDirection: 'row',
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
                value={treeSearch}
                onChangeText={setTreeSearch}
                placeholder="Search category tree..."
                placeholderTextColor={colors.textSecondary}
                style={{ flex: 1, color: colors.text, padding: 10 }}
              />
            </View>
            {roots.length ? (
              roots.map(renderTree)
            ) : (
              <EmptyState
                title="No marketplace categories have been created yet."
                message="Create a category from an approved supplier suggestion."
              />
            )}
          </ScrollView>

          <View
            style={{
              flex: 1,
              minHeight: 250,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              backgroundColor: colors.surface,
            }}
          >
            {selected ? (
              <View style={{ gap: 10 }}>
                <FolderTree color={colors.primary} />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 21,
                    fontWeight: '900',
                  }}
                >
                  {selected.name}
                </Text>
                <Text style={{ color: colors.textSecondary }}>
                  {breadcrumb(selected.id)}
                </Text>
                <Text style={{ color: colors.textSecondary }}>
                  Status: {selected.status}
                </Text>
                <Text style={{ color: colors.textSecondary }}>
                  Children: {(byParent.get(selected.id) ?? []).length} · Sort
                  order: {selected.sortOrder}
                </Text>
                <Text style={{ color: colors.textSecondary }}>
                  {selected.description || 'No description provided.'}
                </Text>
                <View
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
                >
                  <TouchableOpacity
                    onPress={() => openEditor(selected)}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800' }}>
                      Edit / Move
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void archive(selected.status === 'ARCHIVED')}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selected.status === 'ARCHIVED'
                            ? '#059669'
                            : '#DC2626',
                        fontWeight: '800',
                      }}
                    >
                      {selected.status === 'ARCHIVED' ? 'Restore' : 'Archive'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={{ color: colors.textSecondary }}>
                Select a category to see its details and organize it.
              </Text>
            )}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, gap: 10 }}>
          <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 9,
                paddingHorizontal: 10,
              }}
            >
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={(value) => {
                  setSearch(value);
                  setSuggestionPage(1);
                }}
                placeholder="Search suggestions..."
                placeholderTextColor={colors.textSecondary}
                style={{ flex: 1, color: colors.text, padding: 10 }}
              />
            </View>

            <FilterTabs
              value={status ?? 'ALL'}
              onChange={(value) => {
                setStatus(
                  value === 'ALL'
                    ? undefined
                    : (value as CategorySuggestionStatus),
                );
                setSuggestionPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All' },
                ...(
                  [
                    'PENDING',
                    'APPROVED',
                    'REJECTED',
                    'MERGED',
                  ] as CategorySuggestionStatus[]
                ).map((item) => ({
                  value: item,
                  label: item[0] + item.slice(1).toLowerCase(),
                })),
              ]}
              accessibilityLabel="Filter supplier category suggestions by status"
            />
          </View>

          <View style={{ flex: 1, minHeight: 320 }}>
            <DataTable
              columns={[
                { label: 'Suggestion', width: 1.4 },
                { label: 'Suggested Parent', width: 1.6 },
                { label: 'Submitted By', width: 1 },
                { label: 'Submitted', width: 0.9 },
                { label: 'Status', width: 1 },
                { label: 'Actions', width: 0.8 },
              ]}
              rows={suggestions.map((item) => ({
                key: item.id,
                cells: [
                  <Text style={{ color: colors.text, fontWeight: '800' }}>
                    {item.proposedName}
                  </Text>,
                  <Text style={{ color: colors.textSecondary }}>
                    {breadcrumb(item.parentCategoryId)}
                  </Text>,
                  <Text style={{ color: colors.textSecondary }}>
                    {item.organization?.name ?? 'Supplier organization'}
                  </Text>,
                  <Text style={{ color: colors.textSecondary }}>
                    {formatDate(item.createdAt)}
                  </Text>,
                  <Badge status={item.status} />,
                  item.status === 'PENDING' ? (
                    <Text style={{ color: colors.primary, fontWeight: '800' }}>
                      Open to review
                    </Text>
                  ) : (
                    <Text style={{ color: colors.textSecondary }}>
                      {item.status === 'APPROVED'
                        ? `Created: ${breadcrumb(item.approvedCategoryId)}`
                        : item.status === 'MERGED'
                          ? `Uses existing: ${breadcrumb(item.approvedCategoryId)}`
                          : `Rejected: ${item.rejectionReason ?? 'No reason provided'}`}
                    </Text>
                  ),
                ],
              }))}
              emptyState={
                <EmptyState
                  title={suggestionsEmptyTitle}
                  message={suggestionsEmptyMessage}
                />
              }
              onRowPress={(row) => {
                const suggestion = suggestions.find(
                  (item) => item.id === row.key,
                );
                if (suggestion) openSuggestionDetails(suggestion);
              }}
            />
          </View>

          <AdminPagination
            page={suggestionPage}
            total={totalSuggestions}
            pageSize={suggestionSize}
            onPageChange={setSuggestionPage}
            onPageSizeChange={(size) => {
              setSuggestionSize(size);
              setSuggestionPage(1);
            }}
          />
        </View>
      )}

      {mergeConfirmation}
      {creationConfirmation}
      {resolutionCreationConfirmation}
      <FadeDialogModal
        visible={!!review}
        onRequestClose={() => !busy && setReview(null)}
        maxWidth={720}
      >
        {reviewBody ?? <View />}
      </FadeDialogModal>

      <FadeDialogModal
        visible={!!details}
        onRequestClose={() => !busy && setDetails(null)}
        maxWidth={680}
      >
        {details ? (
          <View
            style={{
              backgroundColor: colors.card,
              maxHeight: height * 0.85,
              padding: 20,
              gap: 12,
            }}
          >
            <Text
              style={{ color: colors.text, fontSize: 19, fontWeight: '900' }}
            >
              Suggestion Details
            </Text>
            <Text
              style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}
            >
              {details.proposedName}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {details.proposedDescription || 'No description provided.'}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              Supplier: {details.organization?.name ?? 'Supplier organization'}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              Suggested parent: {breadcrumb(details.parentCategoryId)}
            </Text>
            <Badge status={details.status} />
            {details.status === 'MERGED' && resolutionMode === 'actions' && (
              <>
                <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>
                  Resolution Type
                </Text>
                <Text style={{ color: colors.textSecondary }}>
                  Current existing category:{' '}
                  {breadcrumb(details.approvedCategoryId)}
                </Text>
                <TouchableOpacity
                  onPress={() => setResolutionMode('target')}
                  style={{
                    padding: 11,
                    borderRadius: 9,
                    backgroundColor: colors.primary,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>
                    Change Existing Category
                  </Text>
                </TouchableOpacity>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Use this when the supplier's suggestion already belongs to
                  a category that exists. No new category will be created.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setResolutionMode('convert');
                    setResolutionParentId(details.parentCategoryId ?? null);
                  }}
                  style={{
                    padding: 11,
                    borderRadius: 9,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '800' }}>
                    Convert to New Category
                  </Text>
                </TouchableOpacity>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Use this when the suggestion should become its own category.
                  A new category will be created under the parent you choose.
                </Text>
              </>
            )}
            {details.status === 'PENDING' && (
              <TouchableOpacity
                onPress={() => {
                  setDetails(null);
                  openReview(details);
                }}
                style={{
                  padding: 11,
                  borderRadius: 9,
                  backgroundColor: colors.primary,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  Review Suggestion
                </Text>
              </TouchableOpacity>
            )}
            {resolutionMode === 'target' && (
              <>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Choose the existing category this suggestion should use. No
                  new category will be created.
                </Text>
                <TextInput
                  value={resolutionSearch}
                  onChangeText={setResolutionSearch}
                  placeholder="Search existing categories..."
                  placeholderTextColor={colors.textSecondary}
                  style={{
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 9,
                    padding: 11,
                  }}
                />
                <ScrollView
                  style={{ maxHeight: 210 }}
                  contentContainerStyle={{ gap: 7 }}
                  nestedScrollEnabled
                >
                  {tree
                    .filter((item) =>
                      breadcrumb(item.id)
                        .toLowerCase()
                        .includes(resolutionSearch.toLowerCase()),
                    )
                    .slice(0, 20)
                    .map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => setResolutionTargetId(item.id)}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          backgroundColor:
                            resolutionTargetId === item.id
                              ? `${colors.primary}18`
                              : colors.background,
                        }}
                      >
                        <Text style={{ color: colors.text, fontWeight: '800' }}>
                          {item.name}
                        </Text>
                        <Text
                          style={{ color: colors.textSecondary, fontSize: 12 }}
                        >
                          {breadcrumb(item.id)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </>
            )}
            {resolutionMode === 'convert' && (
              <>
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  Category Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="New category name"
                  placeholderTextColor={colors.textSecondary}
                  style={{
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 9,
                    padding: 11,
                  }}
                />
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Description"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  style={{
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 9,
                    padding: 11,
                    minHeight: 70,
                  }}
                />
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  Parent Category
                </Text>
                <GlobalParentCategoryPicker
                  categories={tree}
                  selectedId={resolutionParentId}
                  onSelect={setResolutionParentId}
                  disabled={busy}
                  placeholder="Search or choose a parent category..."
                />
              </>
            )}
            <View
              style={{
                flexDirection: isMobile ? 'column-reverse' : 'row',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  resolutionMode === 'actions'
                    ? setDetails(null)
                    : setResolutionMode('actions')
                }
                disabled={busy}
                style={{ padding: 11 }}
              >
                <Text style={{ color: colors.text, fontWeight: '800' }}>
                  {resolutionMode === 'actions' ? 'Close' : 'Back'}
                </Text>
              </TouchableOpacity>
              {resolutionMode !== 'actions' && (
                <TouchableOpacity
                  onPress={
                    resolutionMode === 'convert'
                      ? () => setResolutionCreationConfirmationOpen(true)
                      : saveResolution
                  }
                  disabled={
                    busy ||
                    (resolutionMode === 'target' && !resolutionTargetId) ||
                    (resolutionMode === 'convert' && !resolutionParentId)
                  }
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderRadius: 9,
                    backgroundColor: colors.primary,
                  }}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '800' }}>
                      {resolutionMode === 'target'
                        ? 'Use Selected Category'
                        : 'Create Category'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View />
        )}
      </FadeDialogModal>

      <FadeDialogModal
        visible={editOpen}
        onRequestClose={() => !busy && setEditOpen(false)}
        maxWidth={680}
      >
        <View
          style={{
            backgroundColor: colors.card,
            maxHeight: height * 0.85,
            padding: 20,
            gap: 12,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: '900' }}>
            Edit Category
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Category name"
            placeholderTextColor={colors.textSecondary}
            style={{
              color: colors.text,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 9,
              padding: 11,
            }}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Description"
            placeholderTextColor={colors.textSecondary}
            style={{
              color: colors.text,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 9,
              padding: 11,
              minHeight: 70,
            }}
          />
          <Text style={{ color: colors.textSecondary }}>
            Move under: {breadcrumb(parentId)}
          </Text>
          <ScrollView horizontal contentContainerStyle={{ gap: 7 }}>
            <TouchableOpacity
              onPress={() => setParentId(null)}
              style={{
                padding: 8,
                borderRadius: 99,
                backgroundColor:
                  parentId === null ? colors.primary : colors.background,
              }}
            >
              <Text style={{ color: parentId === null ? '#fff' : colors.text }}>
                Main category
              </Text>
            </TouchableOpacity>
            {tree
              .filter((item) => item.depth < 2 && item.id !== selected?.id)
              .map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setParentId(item.id)}
                  style={{
                    padding: 8,
                    borderRadius: 99,
                    backgroundColor:
                      parentId === item.id ? colors.primary : colors.background,
                  }}
                >
                  <Text
                    style={{
                      color: parentId === item.id ? '#fff' : colors.text,
                    }}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
          <TextInput
            value={sortOrder}
            onChangeText={setSortOrder}
            keyboardType="numeric"
            placeholder="Sort order"
            placeholderTextColor={colors.textSecondary}
            style={{
              color: colors.text,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 9,
              padding: 11,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.text }}>Featured category</Text>
            <Switch value={featured} onValueChange={setFeatured} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <TouchableOpacity
              onPress={() => setEditOpen(false)}
              style={{ padding: 11 }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveCategory}
              disabled={busy}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 11,
                borderRadius: 9,
                backgroundColor: colors.primary,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </FadeDialogModal>
    </View>
  );
}
