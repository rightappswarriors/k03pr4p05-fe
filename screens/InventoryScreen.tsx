// screens/InventoryScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Camera,
  Filter,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthService } from '@/services/authService';
import { InventoryService } from '@/services';
import { DEFAULT_VAT_RATE } from '@/types';
import { MediaService } from '@/services/mediaService';
import { VatTypeService } from '@/services/vatTypeService';
import { CategoryPickerModal } from '@/components/CategoryPickerModal';
import { CostLine } from '@/types';
import { autoCode } from '@/utils/autoCode';
import { useResponsive } from '@/hooks/useResponsive';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  category: string;
  sellingPrice: number;
  lowStock: boolean;
  imageUrl?: string;
  itemCode?: string;
  imagePath?: string;
  costLines?: CostLine[];
  opExPct?: number;
  priceB?: number;
  priceC?: number;
  vatType?: { id: number; name: string; rate: number };
  isVatExempt?: boolean;
  vatExempt?: boolean;
  isBNPC?: boolean;
  hasSeniorDiscountVATExempt?: boolean;
  vatRate?: number;
  stockLabel?: string; // ← new
  stockDescription?: string; // ← new
}

// What we send to InventoryService.updateItem — matches UpdateItemInput exactly
interface UpdateItemPayload {
  name?: string;
  image?: string;
  description?: string;
  barcode?: string;
  brand?: string;
  itemCode?: string;
  sellingPrice: number; // nonNull in schema
  categoryId?: number; // global
  orgCategoryId?: number; // ✅ org
  vatTypeId?: number;
  stock?: number;
  skuNumber?: string;
  vatExempt?: boolean;
  isVatExempt?: boolean;
  isBNPC?: boolean;
  hasSeniorDiscountVATExempt?: boolean;
  vatRate?: number;
  assembly?: boolean;
  ServiceCharge?: boolean;
  opExPct?: number;
  priceB?: number;
  priceC?: number;
  stockLabel: string,
  stockDescription?: string;
  minQuantity?: number;
  costLines?: Array<{ label: string; amount: number }>;
}

type StockFilter = 'All' | 'Low Stock' | 'In Stock';
type CategoryFilter = 'All' | string;
type ViewMode = 'card' | 'table';

const CATEGORIES = [
  'All',
  'Rice',
  'Canned',
  'Beverages',
  'Snacks',
  'Dairy',
  'Personal',
];

// ─── Stock Health Helpers ─────────────────────────────────────────────────────

type StockStatus = 'healthy' | 'low' | 'critical';

function getStockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= minStock * 0.5) return 'critical';
  if (stock <= minStock) return 'low';
  return 'healthy';
}

function getStockPercent(stock: number, minStock: number): number {
  return Math.min((stock / Math.max(minStock * 4, 1)) * 100, 100);
}

const STOCK_STATUS_CONFIG = {
  healthy: { label: 'Healthy', color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  low: { label: 'Low Stock', color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  critical: { label: 'Critical', color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
};

function StockBadge({ status, size = 'md' }: { status: StockStatus; size?: 'sm' | 'md' }) {
  const cfg = STOCK_STATUS_CONFIG[status];
  const ph = size === 'sm' ? 6 : 9;
  const pv = size === 'sm' ? 2 : 4;
  const fs = size === 'sm' ? 10 : 11;
  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: 99, paddingHorizontal: ph, paddingVertical: pv, alignSelf: 'flex-start', borderWidth: 1, borderColor: cfg.border }}>
      <Text style={{ color: cfg.color, fontSize: fs, fontWeight: '700' }}>{cfg.label}</Text>
    </View>
  );
}

function StockBar({ stock, minStock, height = 3 }: { stock: number; minStock: number; height?: number }) {
  const status = getStockStatus(stock, minStock);
  const pct = getStockPercent(stock, minStock);
  const color = STOCK_STATUS_CONFIG[status].color;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${pct}%` as any, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

// ─── ImagePickerSection ───────────────────────────────────────────────────────

function ImagePickerSection({
  imageUri,
  onImageUri,
  colors,
  label = 'ITEM IMAGE (optional)',
  hint = 'Shown as a thumbnail on the inventory card.',
}: {
  imageUri: string;
  onImageUri: (uri: string) => void;
  colors: any;
  label?: string;
  hint?: string;
}) {
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow access to your photo library.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) onImageUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) onImageUri(result.assets[0].uri);
  };

  const s = StyleSheet.create({
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 14,
    },
    hint: { fontSize: 11, color: colors.textSecondary, marginTop: 6 },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
    },
    previewThumb: { width: 56, height: 56, borderRadius: 8 },
    removeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.error + '18',
      borderWidth: 1,
      borderColor: colors.error + '44',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerRow: { flexDirection: 'row', gap: 10 },
    pickerBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    pickerBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  });

  return (
    <>
      <Text style={s.label}>{label}</Text>
      {imageUri ? (
        <View style={s.previewRow}>
          <Image
            source={{ uri: imageUri }}
            style={s.previewThumb}
            resizeMode="cover"

            defaultSource={require('@/assets/images/placeholder.png')}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 13, fontWeight: '600', color: colors.text }}
            >
              Image selected
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              Tap × to remove
            </Text>
          </View>
          <TouchableOpacity style={s.removeBtn} onPress={() => onImageUri('')}>
            <X size={14} color={colors.error} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.pickerRow}>
          <TouchableOpacity style={s.pickerBtn} onPress={pickImage}>
            <ImageIcon size={18} color={colors.primary} strokeWidth={2} />
            <Text style={s.pickerBtnText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.pickerBtn} onPress={takePhoto}>
            <Camera size={18} color={colors.primary} strokeWidth={2} />
            <Text style={s.pickerBtnText}>Camera</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={s.hint}>{hint}</Text>
    </>
  );
}

function removeVatLocal(price: number, vatRate = DEFAULT_VAT_RATE) {
  return price / (1 + vatRate);
}

function PricingPreviewSection({
  price,
  vatExempt,
  isBNPC,
  hasSeniorDiscountVATExempt,
  vatRate,
  selectedVatTypeId,
  vatTypes,
  colors,
}: {
  price: string;
  vatExempt: boolean;
  isBNPC: boolean;
  hasSeniorDiscountVATExempt: boolean;
  vatRate: string;
  selectedVatTypeId: number | null;
  vatTypes: { id: number; name: string; rate: number }[];
  colors: any;
}) {
  const numPrice = parseFloat(price) || 0;
  if (numPrice <= 0) return null;

  // Resolve effective VAT rate
  const selectedVatType = vatTypes.find((v) => v.id === selectedVatTypeId);
  const effectiveVatRate = vatExempt
    ? 0
    : selectedVatType != null
      ? DEFAULT_VAT_RATE
      : (parseFloat(vatRate) || 12) / 100;

  const isVatInclusive = effectiveVatRate > 0;
  const vatExclusiveBase = isVatInclusive
    ? removeVatLocal(numPrice, effectiveVatRate)
    : numPrice;
  const vatAmount = isVatInclusive ? numPrice - vatExclusiveBase : 0;

  // SC/PWD 20%: VAT removed first, then 20% off the VAT-exclusive base
  const seniorDiscountAmount = hasSeniorDiscountVATExempt
    ? vatExclusiveBase * 0.2
    : 0;
  const seniorFinalPrice = hasSeniorDiscountVATExempt
    ? vatExclusiveBase * 0.8
    : null;

  // BNPC 5%: applied on the full selling price (no VAT removal)
  const bnpcDiscountAmount = isBNPC ? numPrice * 0.05 : 0;
  const bnpcFinalPrice = isBNPC ? numPrice * 0.95 : null;

  const fmt = (v: number) =>
    v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const s = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginTop: 14,
    },
    header: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTxt: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
    },
    vatRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    metaBox: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
    },
    metaLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 3 },
    metaValue: { fontSize: 14, fontWeight: '700', color: colors.text },
    discountBlock: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    discountTitle: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.7,
      marginBottom: 6,
    },
    discountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    discountLabel: { fontSize: 12, color: colors.textSecondary },
    discountValue: { fontSize: 12, fontWeight: '600', color: colors.text },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTxt}>PRICE BREAKDOWN</Text>
      </View>

      {/* VAT breakdown row */}
      <View style={s.vatRow}>
        <View style={s.metaBox}>
          <Text style={s.metaLabel}>Selling price</Text>
          <Text style={[s.metaValue, { color: colors.accent }]}>₱{fmt(numPrice)}</Text>
        </View>
        <View style={s.metaBox}>
          <Text style={s.metaLabel}>
            {isVatInclusive ? 'VAT-excl. base' : 'VAT exempt'}
          </Text>
          <Text style={[s.metaValue, { color: colors.primary }]}>
            ₱{fmt(vatExclusiveBase)}
          </Text>
        </View>
        <View style={s.metaBox}>
          <Text style={s.metaLabel}>
            VAT ({isVatInclusive ? `${(effectiveVatRate * 100).toFixed(0)}%` : 'exempt'})
          </Text>
          <Text
            style={[
              s.metaValue,
              { color: isVatInclusive ? colors.error : colors.textSecondary },
            ]}
          >
            {isVatInclusive ? `₱${fmt(vatAmount)}` : '—'}
          </Text>
        </View>
      </View>

      {/* Senior/PWD 20% block */}
      {hasSeniorDiscountVATExempt && seniorFinalPrice != null && (
        <View style={[s.discountBlock]}>
          <Text style={s.discountTitle}>SC / PWD — 20% DISCOUNT (VAT-EXEMPT ELIGIBLE)</Text>
          <View style={s.discountRow}>
            <Text style={s.discountLabel}>
              VAT removed first — base: ₱{fmt(vatExclusiveBase)}
            </Text>
          </View>
          <View style={s.discountRow}>
            <Text style={s.discountLabel}>
              Discount (20% of ₱{fmt(vatExclusiveBase)})
            </Text>
            <Text style={[s.discountValue, { color: colors.error }]}>
              − ₱{fmt(seniorDiscountAmount)}
            </Text>
          </View>
          <View style={[s.discountRow, { marginBottom: 0 }]}>
            <Text style={[s.discountLabel, { fontWeight: '600', color: colors.text }]}>
              Final price for SC/PWD
            </Text>
            <Text
              style={[s.discountValue, { fontSize: 15, color: colors.success }]}
            >
              ₱{fmt(seniorFinalPrice)}
            </Text>
          </View>
        </View>
      )}

      {/* BNPC 5% block */}
      {isBNPC && bnpcFinalPrice != null && (
        <View style={[s.discountBlock, { borderBottomWidth: 0 }]}>
          <Text style={s.discountTitle}>
            BNPC — 5% DISCOUNT (JAO 24-02, NO VAT REMOVAL)
          </Text>
          <View style={s.discountRow}>
            <Text style={s.discountLabel}>
              Discount (5% of ₱{fmt(numPrice)})
            </Text>
            <Text style={[s.discountValue, { color: colors.error }]}>
              − ₱{fmt(bnpcDiscountAmount)}
            </Text>
          </View>
          <View style={[s.discountRow, { marginBottom: 0 }]}>
            <Text style={[s.discountLabel, { fontWeight: '600', color: colors.text }]}>
              Final price for BNPC SC/PWD
            </Text>
            <Text
              style={[s.discountValue, { fontSize: 15, color: colors.success }]}
            >
              ₱{fmt(bnpcFinalPrice)}
            </Text>
          </View>
        </View>
      )}

      {/* VAT-exempt label when nothing else shows */}
      {!hasSeniorDiscountVATExempt && !isBNPC && vatExempt && (
        <View style={[s.discountBlock, { borderBottomWidth: 0 }]}>
          <Text style={[s.discountTitle, { color: colors.accent }]}>
            VAT EXEMPT — NO DISCOUNTS CONFIGURED
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            Enable BNPC or Senior/PWD flags above to see discount previews.
          </Text>
        </View>
      )}
    </View>
  );
}
// ─── CostBreakdownBuilder ─────────────────────────────────────────────────────

function CostBreakdownBuilder({
  lines,
  onChange,
  colors,
}: {
  lines: CostLine[];
  onChange: (lines: CostLine[]) => void;
  colors: any;
}) {
  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);

  const addLine = () =>
    onChange([...lines, { id: `cl_${Date.now()}`, label: '', amount: 0 }]);

  const updateLine = (id: string, field: 'label' | 'amount', value: string) =>
    onChange(
      lines.map((l) =>
        l.id === id
          ? {
            ...l,
            [field]: field === 'amount' ? parseFloat(value) || 0 : value,
          }
          : l,
      ),
    );

  const removeLine = (id: string) => onChange(lines.filter((l) => l.id !== id));

  const s = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    line: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    labelInput: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      paddingVertical: 4,
    },
    amtInput: {
      width: 90,
      fontSize: 13,
      color: colors.text,
      textAlign: 'right',
      paddingVertical: 4,
    },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
    addTxt: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    hint: {
      fontSize: 11,
      color: colors.textSecondary,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
  });

  return (
    <View style={s.container}>
      <Text style={s.hint}>
        Add each cost component. They sum to the Contribution Cost.
      </Text>
      {lines.map((line, idx) => (
        <View key={line.id} style={s.line}>
          <Text
            style={{ fontSize: 12, color: colors.textSecondary, width: 20 }}
          >
            {idx + 1}
          </Text>
          <TextInput
            style={[
              s.labelInput,
              { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
            placeholder={
              idx === 0
                ? 'Purchase Cost'
                : idx === 1
                  ? 'Freight / Delivery'
                  : 'Other cost…'
            }
            placeholderTextColor={colors.textSecondary}
            value={line.label}
            onChangeText={(v) => updateLine(line.id, 'label', v)}
          />
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>₱</Text>
          <TextInput
            style={[
              s.amtInput,
              { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            value={line.amount > 0 ? String(line.amount) : ''}
            onChangeText={(v) => updateLine(line.id, 'amount', v)}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            onPress={() => removeLine(line.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={14} color={colors.error} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={s.addBtn} onPress={addLine}>
        <Plus size={14} color={colors.primary} strokeWidth={2.5} />
        <Text style={s.addTxt}>Add cost component</Text>
      </TouchableOpacity>
      {lines.length > 0 && (
        <View style={s.totalRow}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: colors.textSecondary,
            }}
          >
            TOTAL CONTRIBUTION COST
          </Text>
          <Text
            style={{ fontSize: 15, fontWeight: '800', color: colors.primary }}
          >
            ₱{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── EditItemModal ────────────────────────────────────────────────────────────
// Pre-fills all fields from the existing item and calls InventoryService.updateItem
// on save. Also handles image replacement via the media server.

function EditItemModal({
  item,
  visible,
  onClose,
  onSaved,
  colors,
}: {
  item: InventoryItem | null;
  visible: boolean;
  onClose: () => void;
  onSaved: (updated: InventoryItem) => void;
  colors: any;
}) {
  // ── Pre-fill state from item ──────────────────────────────────────────────
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('10');
  const [price, setPrice] = useState('');
  const [stockLabel, setStockLabel] = useState('piece');
  const [stockDescription, setStockDescription] = useState('');
  const [opExPct, setOpExPct] = useState('10');
  const [priceB, setPriceB] = useState('');
  const [priceC, setPriceC] = useState('');
  const [vatExempt, setVatExempt] = useState(false);
  const [isBNPC, setIsBNPC] = useState(false);
  const [hasSeniorDiscountVATExempt, setHasSeniorDiscountVATExempt] = useState(false);
  const [vatRate, setVatRate] = useState('12');
  const [costLines, setCostLines] = useState<CostLine[]>([]);
  const [imageUri, setImageUri] = useState(''); // local URI or existing http URL
  const [originalImageUri, setOriginalImageUri] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedCategoryIsGlobal, setSelectedCategoryIsGlobal] =
    useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [vatTypes, setVatTypes] = useState<
    { id: number; name: string; rate: number }[]
  >([]);
  const [selectedVatTypeId, setSelectedVatTypeId] = useState<number | null>(
    null,
  );

  React.useEffect(() => {
    VatTypeService.getAll()
      .then(setVatTypes)
      .catch(() => { });
  }, []);

  // Populate fields whenever the modal opens with a new item
  React.useEffect(() => {
    if (!item || !visible) return;
    setName(item.name);
    setSku(item.sku);
    setItemCode(item.itemCode || '');
    setStock(String(item.stock));
    setMinStock(String(item.minStock));
    setPrice(String(item.sellingPrice));
    setOpExPct(
      item.opExPct != null ? String(Math.round(item.opExPct * 100)) : '10',
    );
    setPriceB(item.priceB != null ? String(item.priceB) : '');
    setPriceC(item.priceC != null ? String(item.priceC) : '');
    setStockLabel(item.stockLabel ?? 'piece');
    setStockDescription(item.stockDescription ?? '');
    setVatExempt(item.vatExempt ?? false);
    setIsBNPC(item.isBNPC ?? false);
    setHasSeniorDiscountVATExempt(item.hasSeniorDiscountVATExempt ?? false);
    setVatRate(String(((item.vatRate ?? 0.12) * 100)));
    setCostLines(
      (item.costLines ?? []).map((cl) => ({
        ...cl,
        // ensure every line has a stable local id
        id: cl.id || `cl_${Math.random().toString(36).slice(2)}`,
      })),
    );
    // Show the existing image (remote URL); local picker will override this
    const initialImage = item.imageUrl ?? '';
    setImageUri(initialImage);
    setOriginalImageUri(initialImage);
    setError('');
  }, [item, visible]);

  const totalCost = costLines.reduce((s, l) => s + (l.amount || 0), 0);

  const handleSave = async () => {
    if (!item) return;
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    if (!price.trim()) {
      setError('Selling price is required.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let finalImageUrl: string | undefined = item.imageUrl;
      let finalImagePath: string | undefined = item.imagePath;
      const currentImagePath = item.imagePath;
      const hasNewLocalImage = imageUri && !imageUri.startsWith('http') && imageUri !== originalImageUri;
      const hasRemovedImage = !imageUri && !!currentImagePath;

      // Only upload/replace when the user actually selected a new local image.
      if (hasNewLocalImage) {
        const user = await AuthService.getCurrentUser();
        if (!user?.orgId) throw new Error('Organization identifier not found.');

        if (currentImagePath) {
          // Replace existing file
          const media = await MediaService.updateMedia(
            {
              uri: imageUri,
              name: `item_${Date.now()}.jpg`,
              type: 'image/jpeg',
            },
            currentImagePath,
            String(user.orgId),
          );
          finalImageUrl = media?.publicUrl;
          finalImagePath = media?.filePath;
        } else {
          // Upload new file
          const media = await MediaService.uploadMedia(
            {
              uri: imageUri,
              name: `item_${Date.now()}.jpg`,
              type: 'image/jpeg',
            },
            String(user.orgId),
          );
          finalImageUrl = media.publicUrl;
          finalImagePath = media.filePath;
        }
      } else if (hasRemovedImage && currentImagePath) {
        // User removed the image — delete from media server
        await MediaService.deleteMedia(currentImagePath);
        finalImageUrl = undefined;
        finalImagePath = undefined;
      }
      const finalCode = itemCode?.trim() || autoCode(name)
      // Build the UpdateItemInput payload
      // sellingPrice is nonNull in the schema — always required
      const payload: UpdateItemPayload = {
        name: name.trim(),
        skuNumber: sku.trim() || undefined,
        barcode: sku.trim() || undefined,
        stock: parseInt(stock) || 0,
        minQuantity: parseInt(minStock) || 0,
        sellingPrice: parseFloat(price),
        opExPct: parseFloat(opExPct) / 100 || 0.1,
        priceB: priceB ? parseFloat(priceB) : undefined,
        priceC: priceC ? parseFloat(priceC) : undefined,
        vatExempt: !selectedVatTypeId ? vatExempt : undefined,
        isVatExempt: vatExempt,
        isBNPC,
        hasSeniorDiscountVATExempt,
        vatRate: vatExempt ? 0 : (parseFloat(vatRate) || 12) / 100,
        vatTypeId: selectedVatTypeId ?? undefined, // ✅
        image: finalImageUrl,
        costLines: costLines.map(({ label, amount }) => ({ label, amount })),
        itemCode: finalCode,
        stockLabel: stockLabel,
        stockDescription: stockDescription || undefined,
        // ✅ mutually exclusive
        ...(selectedCategoryId && !selectedCategoryIsGlobal
          ? { orgCategoryId: selectedCategoryId, categoryId: undefined }
          : selectedCategoryId && selectedCategoryIsGlobal
            ? { categoryId: selectedCategoryId, orgCategoryId: undefined }
            : {}),
      };

      const updated = await InventoryService.updateItem(
        Number(item.id),
        payload,
      );

      if (updated) {
        const updatedItem: InventoryItem = {
          ...item,
          name: updated.name ?? name.trim(),
          sku: updated.skuNumber || updated.barcode || sku.trim(),
          stock: Number(updated.stock ?? stock),
          minStock: parseInt(minStock) || item.minStock,
          sellingPrice: Number(updated.sellingPrice ?? price),
          lowStock:
            Number(updated.stock ?? stock) <
            (parseInt(minStock) || item.minStock),
          opExPct: Number(updated.opExPct ?? 0),
          priceB: updated.priceB != null ? Number(updated.priceB) : undefined,
          priceC: updated.priceC != null ? Number(updated.priceC) : undefined,
          vatExempt: updated.vatExempt ?? vatExempt,
          isVatExempt: updated.isVatExempt ?? vatExempt,
          isBNPC: updated.isBNPC ?? isBNPC,
          hasSeniorDiscountVATExempt: updated.hasSeniorDiscountVATExempt ?? hasSeniorDiscountVATExempt,
          vatRate: updated.vatRate ?? ((parseFloat(vatRate) || 12) / 100),
          imageUrl: finalImageUrl,
          imagePath: finalImagePath,
          costLines: (updated.costLines ?? costLines).map(
            (cl: any, i: number) => ({
              id: cl.id || `cl_${i}`,
              label: cl.label,
              amount: cl.amount,
            }),
          ),
          stockLabel: stockLabel,
          stockDescription: stockDescription || undefined,
        };
        onSaved(updatedItem);
        onClose();
      }
    } catch (err: any) {
      if (__DEV__) console.error('Failed to update item:', err);
      setError(err.message || 'Failed to update item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40
    },

    catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    catPill: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catAct: { borderColor: colors.primary, backgroundColor: colors.primary },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      paddingBottom: 32,
      borderRadius: 16,
      maxHeight: 780,
      width: '100%',
      maxWidth: 640,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 16, fontWeight: '800', color: colors.text },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 6,
      marginTop: 14,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      color: colors.text,
    },
    row2: { flexDirection: 'row', gap: 10 },
    vatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 20,
    },
    errTxt: { fontSize: 12, color: colors.error, marginTop: 6 },
  });

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={s.overlay}
        activeOpacity={1}
        onPress={onClose}  // tap outside closes
      >
        <TouchableOpacity activeOpacity={1} onPress={() => { }}>
          <View style={s.sheet}>
            <View style={s.header}>
              <View>
                <Text style={s.title}>Edit Item</Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {item.sku}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── Image ── */}
              <ImagePickerSection
                imageUri={imageUri}
                onImageUri={setImageUri}
                colors={colors}
                label="ITEM IMAGE"
                hint="Replace the existing image or remove it."
              />

              {/* ── Name & SKU ── */}
              <Text style={s.label}>Item Name *</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={s.label}>Category</Text>
              <TouchableOpacity
                style={[
                  s.input,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  },
                ]}
                onPress={() => setCategoryPickerVisible(true)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: selectedCategoryName
                      ? colors.text
                      : colors.textSecondary,
                  }}
                >
                  {selectedCategoryName || 'Select a category…'}
                </Text>
                {selectedCategoryName ? (
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    {selectedCategoryIsGlobal && (
                      <View
                        style={{
                          backgroundColor: colors.primary + '18',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 5,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: colors.primary,
                          }}
                        >
                          Global
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedCategoryId(null);
                        setSelectedCategoryName('');
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <X size={14} color={colors.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Search
                    size={14}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                )}
              </TouchableOpacity>

              {/* Add modal at bottom of sheet */}
              <CategoryPickerModal
                visible={categoryPickerVisible}
                onClose={() => setCategoryPickerVisible(false)}
                onSelect={(id, isGlobal, name) => {
                  setSelectedCategoryId(id);
                  setSelectedCategoryIsGlobal(isGlobal);
                  setSelectedCategoryName(name);
                }}
                selectedId={selectedCategoryId}
                selectedIsGlobal={selectedCategoryIsGlobal}
                colors={colors}
              />
              <Text style={s.label}>SKU / Barcode</Text>
              <TextInput
                style={s.input}
                value={sku}
                onChangeText={setSku}
                autoCapitalize="characters"
                placeholderTextColor={colors.textSecondary}
              />

              {/* ── Stock ── */}
              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Stock</Text>
                  <TextInput
                    style={s.input}
                    value={stock}
                    onChangeText={setStock}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Min / Reorder At</Text>
                  <TextInput
                    style={s.input}
                    value={minStock}
                    onChangeText={setMinStock}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Item Code</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Item code example: RICE-GAN-25"
                    placeholderTextColor={colors.textSecondary}
                    value={itemCode}
                    onChangeText={setItemCode}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
              {/* Stock Label */}

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>STOCK UNIT *</Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textSecondary,
                      marginBottom: 8,
                    }}
                  >
                    What unit is this item's stock measured in?
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    {[
                      'piece',
                      'kg',
                      'gram',
                      'liter',
                      'ml',
                      'sack',
                      'box',
                      'dozen',
                      'tray',
                    ].map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[s.catPill, stockLabel === unit && s.catAct]}
                        onPress={() => setStockLabel(unit)}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: stockLabel === unit ? '#fff' : colors.text,
                          }}
                        >
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* Custom unit input if not in list */}
                  <TextInput
                    style={s.input}
                    placeholder="Or type custom unit (e.g. bundle, roll)"
                    placeholderTextColor={colors.textSecondary}
                    value={
                      [
                        'piece',
                        'kg',
                        'gram',
                        'liter',
                        'ml',
                        'sack',
                        'box',
                        'dozen',
                        'tray',
                      ].includes(stockLabel)
                        ? ''
                        : stockLabel
                    }
                    onChangeText={(v) =>
                      v.trim() && setStockLabel(v.trim().toLowerCase())
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  {/* Stock Description */}
                  <Text style={s.label}>STOCK DESCRIPTION (optional)</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. 25kg sack of NFA rice"
                    placeholderTextColor={colors.textSecondary}
                    value={stockDescription}
                    onChangeText={setStockDescription}
                  />
                </View>
              </View>
              {/* ── Pricing ── */}
              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Selling Price ₱ *</Text>
                  <TextInput
                    style={s.input}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>OpEx %</Text>
                  <TextInput
                    style={s.input}
                    value={opExPct}
                    onChangeText={setOpExPct}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Price B (Wholesale) ₱</Text>
                  <TextInput
                    style={s.input}
                    value={priceB}
                    onChangeText={setPriceB}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Price C (Special) ₱</Text>
                  <TextInput
                    style={s.input}
                    value={priceC}
                    onChangeText={setPriceC}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              {/* ── VAT ── */}
              <Text style={s.label}>VAT TYPE</Text>
              {vatTypes.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {vatTypes.map((vat) => (
                    <TouchableOpacity
                      key={vat.id}
                      style={[
                        s.catPill,
                        selectedVatTypeId === vat.id && s.catAct,
                      ]}
                      onPress={() => setSelectedVatTypeId(vat.id)}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color:
                            selectedVatTypeId === vat.id ? '#fff' : colors.text,
                        }}
                      >
                        {vat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                // ✅ fallback if org hasn't set up VAT types yet
                <View style={s.vatRow}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: colors.text,
                    }}
                  >
                    {vatExempt ? 'VAT Exempt' : 'VAT Inclusive (12%)'}
                  </Text>
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: vatExempt
                        ? colors.accent + '20'
                        : colors.primary + '20',
                      borderWidth: 1,
                      borderColor: vatExempt ? colors.accent : colors.primary,
                    }}
                    onPress={() => setVatExempt((v) => !v)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: vatExempt ? colors.accent : colors.primary,
                      }}
                    >
                      {vatExempt ? 'Exempt' : 'VAT Incl.'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={s.label}>Tax & Discount Settings</Text>
              <View style={{ gap: 8 }}>
                <View style={s.vatRow}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    Is Basic Necessity / Prime Commodity (BNPC)
                  </Text>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: isBNPC ? colors.accent + '20' : colors.background, borderWidth: 1, borderColor: isBNPC ? colors.accent : colors.border }}
                    onPress={() => {
                      setIsBNPC((v) => !v);
                      if (!isBNPC) setHasSeniorDiscountVATExempt(false); // turning on BNPC clears the other
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isBNPC ? colors.accent : colors.textSecondary }}>
                      {isBNPC ? 'BNPC' : 'Off'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={s.vatRow}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    Senior/PWD VAT-exempt discount eligible
                  </Text>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: hasSeniorDiscountVATExempt ? colors.accent + '20' : colors.background, borderWidth: 1, borderColor: hasSeniorDiscountVATExempt ? colors.accent : colors.border }}
                    onPress={() => {
                      setHasSeniorDiscountVATExempt((v) => !v);
                      if (!hasSeniorDiscountVATExempt) setIsBNPC(false); // turning on senior discount clears BNPC
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: hasSeniorDiscountVATExempt ? colors.accent : colors.textSecondary }}>
                      {hasSeniorDiscountVATExempt ? 'Enabled' : 'Off'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isBNPC && (
                  <>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                      BNPC items qualify for SC/PWD special discount without VAT exemption (JAO 24-02, 2024)
                    </Text>
                  </>
                )}
                {hasSeniorDiscountVATExempt && (
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                    This item is VAT-exempt for senior/PWD discount calculations and will first remove VAT before applying the 20% discount.
                  </Text>
                )}
              </View>


              {/* ── Cost Breakdown ── */}
              <Text style={s.label}>Cost Breakdown</Text>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                Editing these will replace all existing cost lines for this item.
              </Text>
              <CostBreakdownBuilder
                lines={costLines}
                onChange={setCostLines}
                colors={colors}
              />

              {/* ── Profit preview ── */}
              {price && totalCost > 0 && (
                <View
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 10,
                    padding: 12,
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  {[
                    ['Sell Price', parseFloat(price), colors.accent],
                    ['Contrib. Cost', totalCost, colors.error],
                    [
                      'Gross Profit',
                      parseFloat(price) - totalCost,
                      parseFloat(price) - totalCost >= 0
                        ? colors.success
                        : colors.error,
                    ],
                  ].map(([label, val, color], i, arr) => (
                    <React.Fragment key={label as string}>
                      <View style={{ alignItems: 'center' }}>
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.textSecondary,
                            marginBottom: 2,
                          }}
                        >
                          {label as string}
                        </Text>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '800',
                            color: color as string,
                          }}
                        >
                          ₱{(val as number).toLocaleString()}
                        </Text>
                      </View>
                      {i < arr.length - 1 && (
                        <Text
                          style={{
                            fontSize: 18,
                            color: colors.textSecondary,
                            alignSelf: 'center',
                          }}
                        >
                          {i === 0 ? '−' : '='}
                        </Text>
                      )}
                    </React.Fragment>
                  ))}
                </View>
              )}
              <PricingPreviewSection
                price={price}
                vatExempt={vatExempt}
                isBNPC={isBNPC}
                hasSeniorDiscountVATExempt={hasSeniorDiscountVATExempt}
                vatRate={vatRate}
                selectedVatTypeId={selectedVatTypeId}
                vatTypes={vatTypes}
                colors={colors}
              />

              {error ? <Text style={s.errTxt}>{error}</Text> : null}

              <TouchableOpacity
                style={s.saveBtn}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}
                  >
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 8 }} />
            </ScrollView>
          </View>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── ItemDetailModal ──────────────────────────────────────────────────────────

function ItemDetailModal({
  item,
  visible,
  onClose,
  onAdjustStock,
  onDelete,
  onEdit,
  colors,
}: {
  item: InventoryItem | null;
  visible: boolean;
  onClose: () => void;
  onAdjustStock: (id: string, delta: number) => void;
  onDelete: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  colors: any;
}) {
  const { isDesktop } = useResponsive();
  const [qty, setQty] = useState(0);
  const [distribution, setDistribution] = useState<any>(null);
  const [distLoading, setDistLoading] = useState(false);

  React.useEffect(() => {
    if (!visible || !item) return;
    setDistLoading(true);
    InventoryService.getItemStockDistribution(Number(item.id))
      .then(setDistribution)
      .catch(() => setDistribution(null))
      .finally(() => setDistLoading(false));
  }, [visible, item]);

  if (!item) return null;
  const maxStock = Math.max(item.stock, item.minStock * 4, 200);
  const ratio = Math.min(item.stock / maxStock, 1);
  const barColor = item.lowStock ? colors.error : colors.success;
  const totalCost = item.costLines?.reduce((s, l) => s + l.amount, 0) ?? 0;
  const profit = item.sellingPrice - totalCost;
  const margin = item.sellingPrice > 0 ? (profit / item.sellingPrice) * 100 : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Dim overlay — tap outside to close */}
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 40,
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Inner sheet — absorbs taps so they don't bubble to overlay */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => { }}
          style={{             // ← move sizing here, to the TouchableOpacity itself
            width: '90%',      // ← concrete percentage of the overlay
            maxWidth: 640,
          }}
        >
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            width: '100%',     // ← now '100%' of the TouchableOpacity above, which has real width
            maxHeight: 780,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <View style={[idm.header, { backgroundColor: colors.primary }]}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    marginRight: 12,
                    borderWidth: 2,
                    borderColor: 'rgba(255,255,255,0.3)',
                  }}

                  defaultSource={require('@/assets/images/placeholder.png')}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    marginRight: 12,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: 'rgba(255,255,255,0.2)',
                  }}
                >
                  <Package
                    size={24}
                    color="rgba(255,255,255,0.7)"
                    strokeWidth={1.5}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={idm.sku}>{item.sku}</Text>
                <Text style={idm.name}>{item.name}</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                    {item.category}
                  </Text>
                  {item.vatExempt && (
                    <View
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: 4,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}
                      >
                        VAT EXEMPT
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {/* Edit button */}
              <TouchableOpacity
                style={[
                  idm.closeBtn,
                  { marginRight: 8, backgroundColor: 'rgba(255,255,255,0.18)' },
                ]}
                onPress={() => {
                  onClose();
                  onEdit(item);
                }}
              >
                <Pencil size={15} color="#fff" strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity style={idm.closeBtn} onPress={onClose}>
                <X size={16} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={{
                padding: 16,
                paddingBottom: 40,
              }}
              showsVerticalScrollIndicator={false}
            >
              {/* Stock level */}
              <View
                style={[
                  idm.section,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[idm.sectionTitle, { color: colors.textSecondary }]}>
                  STOCK LEVEL
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingBottom: 8,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 36,
                        fontWeight: '900',
                        color: item.lowStock ? colors.error : colors.text,
                      }}
                    >
                      {item.stock}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      units on hand
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      Minimum Reorder Level:{' '}
                      <Text style={{ fontWeight: '700', color: colors.text }}>
                        {item.minStock}
                      </Text>
                    </Text>
                    {item.lowStock && (
                      <View
                        style={{
                          backgroundColor: colors.error + '20',
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          marginTop: 4,
                          borderWidth: 1,
                          borderColor: colors.error,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: colors.error,
                          }}
                        >
                          ⚠ Reorder Now
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.border,
                    marginHorizontal: 14,
                    marginBottom: 14,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${ratio * 100}%`,
                      backgroundColor: barColor,
                      borderRadius: 3,
                    }}
                  />
                </View>
                {/* Quick adjust */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 14,
                    paddingBottom: 14,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      fontWeight: '600',
                    }}
                  >
                    Quick Adjust
                  </Text>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <TouchableOpacity
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: colors.error + '20',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: colors.error,
                      }}
                      onPress={() => setQty((q) => Math.max(0, q - 1))}
                    >
                      <Minus size={16} color={colors.error} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '800',
                        color: colors.text,
                        minWidth: 32,
                        textAlign: 'center',
                      }}
                    >
                      {qty}
                    </Text>
                    <TouchableOpacity
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: colors.success + '20',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: colors.success,
                      }}
                      onPress={() => setQty((q) => q + 1)}
                    >
                      <Plus size={16} color={colors.success} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: qty !== 0 ? colors.primary : colors.border,
                      }}
                      disabled={qty === 0}
                      onPress={() => {
                        if (qty !== 0) {
                          onAdjustStock(item.id, qty);
                          setQty(0);
                          onClose();
                        }
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: qty !== 0 ? '#fff' : colors.textSecondary,
                        }}
                      >
                        {qty > 0
                          ? `+${qty} Add`
                          : qty < 0
                            ? `${qty} Remove`
                            : 'Apply'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              {/* Stock Distribution */}
              <View
                style={[
                  idm.section,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    marginTop: 12,
                  },
                ]}
              >
                <Text style={[idm.sectionTitle, { color: colors.textSecondary }]}>
                  STOCK DISTRIBUTION
                </Text>

                {distLoading ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : !distribution ? (
                  <Text
                    style={{
                      padding: 12,
                      fontSize: 12,
                      color: colors.textSecondary,
                    }}
                  >
                    No distribution data
                  </Text>
                ) : (
                  <>
                    {/* Summary row */}
                    <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
                      {[
                        [
                          'Total',
                          `${distribution.totalStock} ${distribution.stockLabel}`,
                          colors.text,
                        ],
                        [
                          'Assigned',
                          `${distribution.totalAssigned} ${distribution.stockLabel}`,
                          colors.accent,
                        ],
                        [
                          'Warehouse',
                          `${distribution.warehouseStock} ${distribution.stockLabel}`,
                          distribution.warehouseStock < 0
                            ? colors.error
                            : colors.success,
                        ],
                      ].map(([label, value, color]) => (
                        <View
                          key={label as string}
                          style={{
                            flex: 1,
                            alignItems: 'center',
                            backgroundColor: colors.background,
                            borderRadius: 8,
                            padding: 8,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: '800',
                              color: color as string,
                            }}
                          >
                            {value}
                          </Text>
                          <Text
                            style={{
                              fontSize: 10,
                              color: colors.textSecondary,
                              marginTop: 2,
                            }}
                          >
                            {label}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Per-outlet rows */}
                    {distribution.outlets.length === 0 ? (
                      <Text
                        style={{
                          padding: 12,
                          fontSize: 12,
                          color: colors.textSecondary,
                        }}
                      >
                        Not assigned to any outlet yet
                      </Text>
                    ) : (
                      distribution.outlets.map((outlet: any) => (
                        <View
                          key={outlet.outletId}
                          style={[
                            idm.detailRow,
                            {
                              borderBottomColor: colors.border,
                            },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: '600',
                                color: colors.text,
                              }}
                            >
                              {outlet.outletName}
                            </Text>
                            {outlet.reorderPoint > 0 && (
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: colors.textSecondary,
                                  marginTop: 2,
                                }}
                              >
                                Reorder at {outlet.reorderPoint} {outlet.baseUnit}
                              </Text>
                            )}
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: '700',
                                color: colors.text,
                              }}
                            >
                              {outlet.quantity} {outlet.baseUnit}
                            </Text>
                            <View
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor:
                                  outlet.status === 'CRITICAL'
                                    ? colors.error
                                    : outlet.status === 'LOW'
                                      ? '#F59E0B'
                                      : colors.success,
                                backgroundColor:
                                  outlet.status === 'CRITICAL'
                                    ? colors.error + '18'
                                    : outlet.status === 'LOW'
                                      ? '#F59E0B18'
                                      : colors.success + '18',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '700',
                                  color:
                                    outlet.status === 'CRITICAL'
                                      ? colors.error
                                      : outlet.status === 'LOW'
                                        ? '#F59E0B'
                                        : colors.success,
                                }}
                              >
                                {outlet.status === 'CRITICAL'
                                  ? '● CRITICAL'
                                  : outlet.status === 'LOW'
                                    ? '⚠ LOW'
                                    : '✓ OK'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))
                    )}

                    {/* stockDescription if set */}
                    {distribution.stockDescription && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          padding: 12,
                          paddingTop: 4,
                          fontStyle: 'italic',
                        }}
                      >
                        {distribution.stockDescription}
                      </Text>
                    )}
                  </>
                )}
              </View>
              {/* Pricing */}
              <View
                style={[
                  idm.section,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    marginTop: 12,
                  },
                ]}
              >
                <Text style={[idm.sectionTitle, { color: colors.textSecondary }]}>
                  PRICING
                </Text>
                {(
                  [
                    ['Price A (Retail)', item.sellingPrice, colors.accent],
                    [
                      'Price B (Wholesale)',
                      item.priceB ?? item.sellingPrice * 0.9,
                      colors.primary,
                    ],
                    [
                      'Price C (Special)',
                      item.priceC ?? item.sellingPrice * 0.85,
                      colors.success,
                    ],
                  ] as [string, number, string][]
                ).map(([label, val, color]) => (
                  <View
                    key={label}
                    style={[idm.detailRow, { borderBottomColor: colors.border }]}
                  >
                    <Text
                      style={[idm.detailLabel, { color: colors.textSecondary }]}
                    >
                      {label}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color }}>
                      ₱{val.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                ))}
                <View style={[idm.detailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[idm.detailLabel, { color: colors.textSecondary }]}>
                    VAT
                  </Text>
                  <Text style={[idm.detailValue, { color: colors.text }]}>
                    {item.vatExempt ? 'VAT Exempt' : `VAT ${item?.vatType?.rate === 0 ? 'Exempt' : item?.vatType ? `Incl. (${item.vatType.rate}%)` : 'Incl. (12%)'}`}
                  </Text>
                </View>
              </View>

              {/* Cost breakdown */}
              {item.costLines && item.costLines.length > 0 && (
                <View
                  style={[
                    idm.section,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      marginTop: 12,
                    },
                  ]}
                >
                  <Text style={[idm.sectionTitle, { color: colors.textSecondary }]}>
                    COST BREAKDOWN
                  </Text>
                  {item.costLines.map((line) => (
                    <View
                      key={line.id}
                      style={[idm.detailRow, { borderBottomColor: colors.border }]}
                    >
                      <Text
                        style={[idm.detailLabel, { color: colors.textSecondary }]}
                      >
                        {line.label || 'Cost'}
                      </Text>
                      <Text style={[idm.detailValue, { color: colors.text }]}>
                        ₱
                        {line.amount.toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  ))}
                  <View
                    style={[
                      idm.detailRow,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: colors.text,
                      }}
                    >
                      Total Contribution Cost
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '800',
                        color: colors.primary,
                      }}
                    >
                      ₱
                      {totalCost.toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                  <View
                    style={[idm.detailRow, { borderBottomColor: 'transparent' }]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: colors.text,
                      }}
                    >
                      Gross Profit
                    </Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '800',
                          color: profit >= 0 ? colors.success : colors.error,
                        }}
                      >
                        ₱
                        {profit.toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                        })}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: profit >= 0 ? colors.success : colors.error,
                          fontWeight: '600',
                        }}
                      >
                        {margin.toFixed(1)}% margin
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* OpEx */}
              {item.opExPct !== undefined && (
                <View
                  style={[
                    idm.section,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      marginTop: 12,
                    },
                  ]}
                >
                  <Text style={[idm.sectionTitle, { color: colors.textSecondary }]}>
                    OPEX CONTRIBUTION
                  </Text>
                  <View
                    style={[idm.detailRow, { borderBottomColor: 'transparent' }]}
                  >
                    <Text
                      style={[idm.detailLabel, { color: colors.textSecondary }]}
                    >
                      Contribution %
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '800',
                        color: colors.accent,
                      }}
                    >
                      {(item.opExPct * 100).toFixed(0)}%
                    </Text>
                  </View>
                </View>
              )}
              {/* ── Discount Eligibility ── */}
              {(item.vatExempt || item.isBNPC || item.hasSeniorDiscountVATExempt) && (() => {
                const effectiveVatRate = item.vatExempt
                  ? 0
                  : item.vatType?.rate != null
                    ? item.vatType.rate / 100
                    : item.vatRate ?? DEFAULT_VAT_RATE;
                const vatExclusiveBase =
                  effectiveVatRate > 0
                    ? item.sellingPrice / (1 + effectiveVatRate)
                    : item.sellingPrice;
                const seniorFinal = item.hasSeniorDiscountVATExempt
                  ? vatExclusiveBase * 0.8
                  : null;
                const bnpcFinal = item.isBNPC ? item.sellingPrice * 0.95 : null;
                const fmt = (v: number) =>
                  v.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });

                return (
                  <View
                    style={[
                      idm.section,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        marginTop: 12,
                      },
                    ]}
                  >
                    <Text style={[idm.sectionTitle, { color: colors.textSecondary }]}>
                      DISCOUNT ELIGIBILITY
                    </Text>

                    {/* Badges */}
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingTop: 8,
                        paddingBottom: 4,
                      }}
                    >
                      {item.vatExempt && (
                        <View
                          style={{
                            backgroundColor: colors.accent + '18',
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderWidth: 1,
                            borderColor: colors.accent + '60',
                          }}
                        >
                          <Text
                            style={{ fontSize: 11, fontWeight: '700', color: colors.accent }}
                          >
                            VAT EXEMPT
                          </Text>
                        </View>
                      )}
                      {item.isBNPC && (
                        <View
                          style={{
                            backgroundColor: '#FAEEDA',
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderWidth: 1,
                            borderColor: '#EF9F27',
                          }}
                        >
                          <Text
                            style={{ fontSize: 11, fontWeight: '700', color: '#854F0B' }}
                          >
                            BNPC · 5% SC/PWD
                          </Text>
                        </View>
                      )}
                      {item.hasSeniorDiscountVATExempt && (
                        <View
                          style={{
                            backgroundColor: '#E6F1FB',
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderWidth: 1,
                            borderColor: '#85B7EB',
                          }}
                        >
                          <Text
                            style={{ fontSize: 11, fontWeight: '700', color: '#185FA5' }}
                          >
                            SENIOR/PWD · 20% VAT-EXEMPT
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* SC/PWD computed price */}
                    {seniorFinal != null && (
                      <View
                        style={[idm.detailRow, { borderBottomColor: colors.border }]}
                      >
                        <Text style={[idm.detailLabel, { color: colors.textSecondary }]}>
                          SC/PWD price (VAT-excl. × 0.8)
                        </Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text
                            style={{ fontSize: 14, fontWeight: '700', color: colors.success }}
                          >
                            ₱{fmt(seniorFinal)}
                          </Text>
                          <Text
                            style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}
                          >
                            base ₱{fmt(vatExclusiveBase)} − 20%
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* BNPC computed price */}
                    {bnpcFinal != null && (
                      <View
                        style={[
                          idm.detailRow,
                          { borderBottomColor: 'transparent' },
                        ]}
                      >
                        <Text style={[idm.detailLabel, { color: colors.textSecondary }]}>
                          BNPC SC/PWD price (× 0.95)
                        </Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '700',
                              color: '#854F0B',
                            }}
                          >
                            ₱{fmt(bnpcFinal)}
                          </Text>
                          <Text
                            style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}
                          >
                            ₱{fmt(item.sellingPrice)} − 5%
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Delete */}
              <View
                style={{
                  marginTop: 20,
                  padding: 16,
                  backgroundColor: colors.error + '10',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.error + '30',
                }}
              >
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                  }}
                  onPress={() => onDelete(item)}
                >
                  <Trash2 size={18} color={colors.error} strokeWidth={2} />
                  <Text
                    style={{ fontSize: 14, fontWeight: '700', color: colors.error }}
                  >
                    Delete Item
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const idm = StyleSheet.create({
  header: {
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sku: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'monospace',
    marginBottom: 3,
  },
  name: { fontSize: 18, fontWeight: '700', color: '#fff' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    padding: 12,
    paddingBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 13, fontWeight: '600', textAlign: 'right' },
});

// ─── AddItemModal ─────────────────────────────────────────────────────────────

function AddItemModal({
  visible,
  onClose,
  onAdd,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: InventoryItem) => void;
  colors: any;
}) {
  const [name, setName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('10');
  const [price, setPrice] = useState('');
  const [vatExempt, setVatExempt] = useState(false);
  const [isBNPC, setIsBNPC] = useState(false);
  const [hasSeniorDiscountVATExempt, setHasSeniorDiscountVATExempt] = useState(false);
  const [vatRate, setVatRate] = useState('12');
  const [opExPct, setOpExPct] = useState('10');
  const [stockLabel, setStockLabel] = useState('piece');
  const [stockDescription, setStockDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [itemImageUri, setItemImageUri] = useState('');
  const [costLines, setCostLines] = useState<CostLine[]>([
    { id: 'cl_purchase', label: 'Purchase Cost', amount: 0 },
  ]);
  const [vatTypes, setVatTypes] = useState<
    { id: number; name: string; rate: number }[]
  >([]);
  const [selectedVatTypeId, setSelectedVatTypeId] = useState<number | null>(
    null,
  );
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedCategoryIsGlobal, setSelectedCategoryIsGlobal] =
    useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  React.useEffect(() => {
    VatTypeService.getAll()
      .then(setVatTypes)
      .catch(() => { });
  }, []);

  const [error, setError] = useState('');

  const totalCost = costLines.reduce((s, l) => s + l.amount, 0);

  const resetForm = () => {
    setName('');
    setSku('');
    setStock('0');
    setMinStock('10');
    setPrice('');
    setOpExPct('10');
    setVatExempt(false);
    setIsBNPC(false);
    setHasSeniorDiscountVATExempt(false);
    setVatRate('12');
    setItemImageUri('');
    setCostLines([{ id: 'cl_purchase', label: 'Purchase Cost', amount: 0 }]);
    setStockLabel('piece');
    setStockDescription('');
    setError('');
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    if (!price.trim()) {
      setError('Selling price is required.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let finalImageUrl: string | undefined;
      let finalImagePath: string | undefined;

      if (itemImageUri && !itemImageUri.startsWith('http')) {
        const user = await AuthService.getCurrentUser();
        if (!user?.orgId) throw new Error('Organization identifier not found.');
        const media = await MediaService.uploadMedia(
          {
            uri: itemImageUri,
            name: `item_${Date.now()}.jpg`,
            type: 'image/jpeg',
          },
          String(user.orgId),
        );
        finalImageUrl = media.publicUrl;
        finalImagePath = media.filePath;
      } else if (itemImageUri) {
        finalImageUrl = itemImageUri;
      }

      const finalCode = itemCode.trim() || autoCode(name);
      const createdItem = await InventoryService.createItem({
        name: name.trim(),
        stock: parseInt(stock) || 0,
        itemCode: finalCode,
        barcode: sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        sellingPrice: parseFloat(price) || 0,
        vatExempt: !selectedVatTypeId ? vatExempt : undefined,
        isVatExempt: vatExempt,
        isBNPC,
        hasSeniorDiscountVATExempt,
        vatRate: vatExempt ? 0 : (parseFloat(vatRate) || 12) / 100,
        vatTypeId: selectedVatTypeId ?? undefined, // ✅ from VAT picker
        skuNumber: sku.trim() || undefined,
        image: finalImageUrl,
        minQuantity: parseInt(minStock) || 10,
        costLines:
          costLines.length > 0
            ? costLines.map(({ label, amount }) => ({ label, amount }))
            : undefined,
        opExPct: parseFloat(opExPct) / 100 || 0.1,
        stockLabel: stockLabel,
        stockDescription: stockDescription || undefined,
        // ✅ mutually exclusive category
        ...(selectedCategoryId && !selectedCategoryIsGlobal
          ? { orgCategoryId: selectedCategoryId }
          : selectedCategoryId && selectedCategoryIsGlobal
            ? { categoryId: selectedCategoryId }
            : {}),
      });

      if (createdItem?.id) {
        const returnedStock = Number(createdItem.stock ?? 0);
        const newItem: InventoryItem = {
          id: String(createdItem.id),
          name: createdItem.name,
          sku:
            createdItem.barcode ||
            createdItem.skuNumber ||
            `SKU-${createdItem.id}`,
          stock: returnedStock,
          minStock: parseInt(minStock) || 10,
          category: category || 'General',
          sellingPrice: parseFloat(price) || 0,
          lowStock: returnedStock < (parseInt(minStock) || 10),
          costLines,
          opExPct: parseFloat(opExPct) / 100 || 0.1,
          vatExempt,
          isVatExempt: vatExempt,
          isBNPC,
          hasSeniorDiscountVATExempt,
          vatRate: vatExempt ? 0 : (parseFloat(vatRate) || 12) / 100,
          imageUrl:
            finalImageUrl ||
            createdItem.image ||
            createdItem?.media?.[0]?.url ||
            '',
          imagePath: finalImagePath || '',
          stockLabel: stockLabel,
          stockDescription: stockDescription || undefined,
        };
        onAdd(newItem);
      }

      resetForm();
      onClose();
    } catch (err: any) {
      if (__DEV__) console.error('Failed to create item:', err);
      setError(err.message || 'Failed to create item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const s = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40
    },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: 16,              // ← all-corner radius
      paddingBottom: 32,
      maxHeight: 780,
      width: '100%',
      maxWidth: 640,                 // ← capped width for web/tablet
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 16, fontWeight: '800', color: colors.text },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 6,
      marginTop: 14,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      color: colors.text,
    },
    row2: { flexDirection: 'row', gap: 10 },
    catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    catPill: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catAct: { borderColor: colors.primary, backgroundColor: colors.primary },
    vatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 20,
    },
    errTxt: { fontSize: 12, color: colors.error, marginTop: 6 },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={s.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => { }}>
          <View style={s.sheet}>
            <View style={s.header}>
              <Text style={s.title}>Add New Item</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <ImagePickerSection
                imageUri={itemImageUri}
                onImageUri={setItemImageUri}
                colors={colors}
              />

              <Text style={s.label}>Item Name *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Ganador Rice 25kg"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />

              <Text style={s.label}>SKU / Item Code</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. RICE-GAN-25"
                placeholderTextColor={colors.textSecondary}
                value={sku}
                onChangeText={setSku}
                autoCapitalize="characters"
              />

              <Text style={s.label}>Category</Text>
              <TouchableOpacity
                style={[
                  s.input,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  },
                ]}
                onPress={() => setCategoryPickerVisible(true)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: selectedCategoryName
                      ? colors.text
                      : colors.textSecondary,
                  }}
                >
                  {selectedCategoryName || 'Select a category…'}
                </Text>
                {selectedCategoryName ? (
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    {selectedCategoryIsGlobal && (
                      <View
                        style={{
                          backgroundColor: colors.primary + '18',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 5,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: colors.primary,
                          }}
                        >
                          Global
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedCategoryId(null);
                        setSelectedCategoryName('');
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <X size={14} color={colors.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Search
                    size={14}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                )}
              </TouchableOpacity>

              {/* Add modal at bottom of sheet */}
              <CategoryPickerModal
                visible={categoryPickerVisible}
                onClose={() => setCategoryPickerVisible(false)}
                onSelect={(id, isGlobal, name) => {
                  setSelectedCategoryId(id);
                  setSelectedCategoryIsGlobal(isGlobal);
                  setSelectedCategoryName(name);
                }}
                selectedId={selectedCategoryId}
                selectedIsGlobal={selectedCategoryIsGlobal}
                colors={colors}
              />

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Opening Stock</Text>
                  <TextInput
                    style={s.input}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    value={stock}
                    onChangeText={setStock}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Min / Reorder At</Text>
                  <TextInput
                    style={s.input}
                    placeholder="10"
                    placeholderTextColor={colors.textSecondary}
                    value={minStock}
                    onChangeText={setMinStock}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Item Code</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Item code example: RICE-GAN-25"
                    placeholderTextColor={colors.textSecondary}
                    value={itemCode}
                    onChangeText={setItemCode}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Stock Label */}

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>STOCK UNIT *</Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textSecondary,
                      marginBottom: 8,
                    }}
                  >
                    What unit is this item's stock measured in?
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    {[
                      'piece',
                      'kg',
                      'gram',
                      'liter',
                      'ml',
                      'sack',
                      'box',
                      'dozen',
                      'tray',
                    ].map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[s.catPill, stockLabel === unit && s.catAct]}
                        onPress={() => setStockLabel(unit)}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: stockLabel === unit ? '#fff' : colors.text,
                          }}
                        >
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* Custom unit input if not in list */}
                  <TextInput
                    style={s.input}
                    placeholder="Or type custom unit (e.g. bundle, roll)"
                    placeholderTextColor={colors.textSecondary}
                    value={
                      [
                        'piece',
                        'kg',
                        'gram',
                        'liter',
                        'ml',
                        'sack',
                        'box',
                        'dozen',
                        'tray',
                      ].includes(stockLabel)
                        ? ''
                        : stockLabel
                    }
                    onChangeText={(v) =>
                      v.trim() && setStockLabel(v.trim().toLowerCase())
                    }
                  />
                </View>
              </View>
              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Selling Price ₱ *</Text>
                  <TextInput
                    style={s.input}
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>OpEx Contribution %</Text>
                  <TextInput
                    style={s.input}
                    placeholder="10"
                    placeholderTextColor={colors.textSecondary}
                    value={opExPct}
                    onChangeText={setOpExPct}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={s.label}>VAT TYPE</Text>
              {vatTypes.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {vatTypes.map((vat) => (
                    <TouchableOpacity
                      key={vat.id}
                      style={[
                        s.catPill,
                        selectedVatTypeId === vat.id && s.catAct,
                      ]}
                      onPress={() => setSelectedVatTypeId(vat.id)}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color:
                            selectedVatTypeId === vat.id ? '#fff' : colors.text,
                        }}
                      >
                        {vat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                // ✅ fallback if org hasn't set up VAT types yet
                <View style={s.vatRow}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: colors.text,
                    }}
                  >
                    {vatExempt ? 'VAT Exempt' : 'VAT Inclusive (12%)'}
                  </Text>
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: vatExempt
                        ? colors.accent + '20'
                        : colors.primary + '20',
                      borderWidth: 1,
                      borderColor: vatExempt ? colors.accent : colors.primary,
                    }}
                    onPress={() => setVatExempt((v) => !v)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: vatExempt ? colors.accent : colors.primary,
                      }}
                    >
                      {vatExempt ? 'Exempt' : 'VAT Incl.'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={s.label}>Tax & Discount Settings</Text>
              <View style={{ gap: 8 }}>
                <View style={s.vatRow}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    Is Basic Necessity / Prime Commodity (BNPC)
                  </Text>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: isBNPC ? colors.accent + '20' : colors.background, borderWidth: 1, borderColor: isBNPC ? colors.accent : colors.border }}
                    onPress={() => {
                      if (!isBNPC) setHasSeniorDiscountVATExempt(false);
                      setIsBNPC((v) => !v);
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isBNPC ? colors.accent : colors.textSecondary }}>
                      {isBNPC ? 'BNPC' : 'Off'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={s.vatRow}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    Senior/PWD VAT-exempt discount eligible
                  </Text>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: hasSeniorDiscountVATExempt ? colors.accent + '20' : colors.background, borderWidth: 1, borderColor: hasSeniorDiscountVATExempt ? colors.accent : colors.border }}
                    onPress={() => {
                      if (!hasSeniorDiscountVATExempt) setIsBNPC(false);
                      setHasSeniorDiscountVATExempt((v) => !v);
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: hasSeniorDiscountVATExempt ? colors.accent : colors.textSecondary }}>
                      {hasSeniorDiscountVATExempt ? 'Enabled' : 'Off'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isBNPC && (
                  <>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                      BNPC items qualify for SC/PWD special discount without VAT exemption (JAO 24-02, 2024)
                    </Text>
                  </>
                )}
                {hasSeniorDiscountVATExempt && (
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                    This item is VAT-exempt for senior/PWD discount calculations and will first remove VAT before applying the 20% discount.
                  </Text>
                )}
              </View>


              <Text style={s.label}>Cost Breakdown</Text>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                Break down the contribution cost — purchase price, freight,
                handling, etc.
              </Text>
              <CostBreakdownBuilder
                lines={costLines}
                onChange={setCostLines}
                colors={colors}
              />

              {price && totalCost > 0 && (
                <View
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 10,
                    padding: 12,
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  {(
                    [
                      ['Sell Price', parseFloat(price), colors.accent],
                      ['Contrib. Cost', totalCost, colors.error],
                      [
                        'Gross Profit',
                        parseFloat(price) - totalCost,
                        parseFloat(price) - totalCost >= 0
                          ? colors.success
                          : colors.error,
                      ],
                    ] as [string, number, string][]
                  ).map(([label, val, color], i, arr) => (
                    <React.Fragment key={label}>
                      <View style={{ alignItems: 'center' }}>
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.textSecondary,
                            marginBottom: 2,
                          }}
                        >
                          {label}
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: '800', color }}>
                          ₱{val.toLocaleString()}
                        </Text>
                      </View>
                      {i < arr.length - 1 && (
                        <Text
                          style={{
                            fontSize: 18,
                            color: colors.textSecondary,
                            alignSelf: 'center',
                          }}
                        >
                          {i === 0 ? '−' : '='}
                        </Text>
                      )}
                    </React.Fragment>
                  ))}
                </View>
              )}
              <PricingPreviewSection
                price={price}
                vatExempt={vatExempt}
                isBNPC={isBNPC}
                hasSeniorDiscountVATExempt={hasSeniorDiscountVATExempt}
                vatRate={vatRate}
                selectedVatTypeId={selectedVatTypeId}
                vatTypes={vatTypes}
                colors={colors}
              />


              {error ? <Text style={s.errTxt}>{error}</Text> : null}
              <TouchableOpacity
                style={s.addBtn}
                onPress={handleAdd}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}
                  >
                    Add to Inventory
                  </Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 8 }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loadingItems, setLoadingItems] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  React.useEffect(() => {
    AsyncStorage.getItem('inventory_view_mode').then((saved) => {
      if (saved === 'card' || saved === 'table') setViewMode(saved);
    });
  }, []);

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    AsyncStorage.setItem('inventory_view_mode', mode);
  };
  Promise.all;
  React.useEffect(() => {
    (async () => {
      setLoadingItems(true);
      try {
        const inventory = await InventoryService.getOrgItems();
        setItems(
          (inventory || []).map(
            (it: any): InventoryItem => ({
              id: String(it.id),
              name: it.name || 'Unnamed item',
              sku: it.barcode || it.skuNumber || `SKU-${it.id}`,
              stock: Number(it.stock || 0),
              minStock: Number(it.minQuantity || 10),
              itemCode: it.itemCode || undefined,
              stockLabel: it.stockLabel ?? 'piece',
              stockDescription: it.stockDescription ?? undefined,
              category:
                it.category?.name ||
                (it.categoryId ? String(it.categoryId) : 'General'),
              sellingPrice: Number(it.sellingPrice || 0),
              lowStock: Number(it.stock || 0) < Number(it.minQuantity || 10),
              imageUrl: it.image || it.media?.[0]?.url || undefined,
              imagePath: it.media?.[0]?.path || undefined,
              costLines: (it.costLines || []).map((cl: any, i: number) => ({
                id: cl.id ? String(cl.id) : `cl_${i}`,
                label: cl.label,
                amount: cl.amount,
              })),
              vatType: it.vatType ? { id: it.vatType.id, name: it.vatType.name, rate: it.vatType.rate } : undefined,
              opExPct: Number(it.opExPct || 0),
              priceB: it.priceB != null ? Number(it.priceB) : undefined,
              priceC: it.priceC != null ? Number(it.priceC) : undefined,
              vatExempt: Boolean(it.vatExempt),
              isVatExempt: Boolean(it.isVatExempt ?? it.vatExempt),
              isBNPC: Boolean(it.isBNPC),
              vatRate: Number(it.vatRate ?? 0.12),
            }),
          ),
        );
      } catch (error) {
        if (__DEV__)console.warn('Unable to load inventory items', error);
      } finally {
        setLoadingItems(false);
      }
    })();
  }, []);

  const [stockFilter, setStockFilter] = useState<StockFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      const matchStock =
        stockFilter === 'All' ||
        (stockFilter === 'Low Stock' ? item.lowStock : !item.lowStock);
      const matchCategory =
        categoryFilter === 'All' || item.category === categoryFilter;
      return matchSearch && matchStock && matchCategory;
    });
  }, [items, search, stockFilter, categoryFilter]);

  const lowStockCount = filtered.filter((i) => i.lowStock).length;

  const handleAdjustStock = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newStock = Math.max(0, item.stock + delta);
        return { ...item, stock: newStock, lowStock: newStock < item.minStock };
      }),
    );
  };

  const handleAddItem = (item: InventoryItem) =>
    setItems((prev) => [item, ...prev]);

  const handleItemSaved = (updated: InventoryItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await InventoryService.deleteItem(
                Number(item.id),
                item.imagePath,
              );
              setItems((prev) => prev.filter((i) => i.id !== item.id));
              setDetailVisible(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item. Please try again.');
            }
          },
        },
      ],
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, paddingBottom: 0 },
    alertBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.error + '18',
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.error + '44',
    },
    alertText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.error,
      flex: 1,
    },
    toolbar: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 10,
      alignItems: 'center',
    },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    searchInput: { flex: 1, fontSize: 13, color: colors.text },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    addBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewToggleRow: {
      flexDirection: 'row',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    viewToggleBtn: {
      width: 36,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderColor: 'transparent',
    },
    filterPanel: {
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    filterLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    pillText: { fontSize: 12, fontWeight: '600', color: colors.text },
    pillTextAct: { color: '#fff' },
    listContent: { padding: 16, paddingTop: 0, gap: 10, paddingBottom: 40 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    cardLow: { borderColor: colors.error, borderWidth: 1.5 },
    cardInner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 12,
    },
    thumb: {
      width: 54,
      height: 54,
      borderRadius: 8,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    thumbImg: { width: 54, height: 54, borderRadius: 8 },
    cardBody: { flex: 1, gap: 3 },
    productName: { fontSize: 14, fontWeight: '700', color: colors.text },
    skuText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontFamily: 'monospace',
    },
    stockBarWrap: {
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginHorizontal: 12,
      marginBottom: 10,
      overflow: 'hidden',
    },
    metaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    metaCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaValue: { fontSize: 18, fontWeight: '800', color: colors.text },
    metaLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    resultCount: {
      fontSize: 11,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingBottom: 6,
    },
  });

  // ── Table view styles ──
  const tableStyles = StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderTopWidth: 1,
      borderBottomWidth: 1,
    },
    headerTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    colImg: { width: 44, marginRight: 10 },
    colName: { flex: 2, paddingRight: 8 },
    colSku: { flex: 1.5, paddingRight: 8 },
    colCat: { flex: 1.2, paddingRight: 8 },
    colCost: { flex: 1, paddingRight: 8 },
    colPrice: { flex: 1.1, paddingRight: 8 },
    colStock: { flex: 1.4, paddingRight: 8 },
    colStatus: { flex: 1, paddingRight: 8 },
    colActions: { flex: 1.6, minWidth: 150 },
    thumbImg: { width: 36, height: 36, borderRadius: 6 },
    thumbPlaceholder: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  });

  // ── Desktop card styles ──
  const desktopCardStyles = StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
      minWidth: 0,
    },
    imageWrap: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden' },
    image: { width: '100%', height: '100%' },
    imagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    badgeOverlay: { position: 'absolute', top: 8, right: 8 },
    body: { padding: 12, flex: 1 },
    footer: {
      flexDirection: 'row',
      borderTopWidth: 1,
    },
    footerBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 9,
    },
  });

  if (loadingItems) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>
          Loading inventory...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.metaRow}>
          {(
            [
              [filtered.length, 'Items', colors.text],
              [lowStockCount, 'Low Stock', colors.error],
              [filtered.length - lowStockCount, 'In Stock', colors.success],
              [
                CATEGORIES.filter((c) => c !== 'All').filter((cat) =>
                  items.some((i) => i.category === cat),
                ).length,
                'Categories',
                colors.accent,
              ],
            ] as [number, string, string][]
          ).map(([val, label, color]) => (
            <View key={label} style={styles.metaCard}>
              <Text style={[styles.metaValue, { color }]}>{val}</Text>
              <Text style={styles.metaLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {lowStockCount > 0 && (
          <View style={styles.alertBanner}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>⚠️</Text>
            <Text style={styles.alertText}>
              {lowStockCount} item{lowStockCount > 1 ? 's' : ''} below reorder
              threshold
            </Text>
          </View>
        )}
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={13} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, SKU, category…"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={13} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
        {/* View mode toggle — only shown on tablet/desktop */}
        {(isTablet || isDesktop) && (
          <View style={styles.viewToggleRow}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'card' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => handleSetViewMode('card')}
            >
              <LayoutGrid size={15} color={viewMode === 'card' ? '#fff' : colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'table' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => handleSetViewMode('table')}
            >
              <List size={15} color={viewMode === 'table' ? '#fff' : colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.iconBtn,
            filterOpen && {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            },
          ]}
          onPress={() => setFilterOpen((v) => !v)}
        >
          <Filter
            size={16}
            color={filterOpen ? '#fff' : colors.textSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddVisible(true)}
        >
          <Plus size={18} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {filterOpen && (
        <View style={styles.filterPanel}>
          <View>
            <Text style={styles.filterLabel}>STOCK STATUS</Text>
            <View style={styles.pillRow}>
              {(['All', 'In Stock', 'Low Stock'] as StockFilter[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.pill, stockFilter === s && styles.pillActive]}
                  onPress={() => setStockFilter(s)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      stockFilter === s && styles.pillTextAct,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View>
            <Text style={styles.filterLabel}>CATEGORY</Text>
            <View style={styles.pillRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.pill,
                    categoryFilter === c && styles.pillActive,
                  ]}
                  onPress={() => setCategoryFilter(c)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      categoryFilter === c && styles.pillTextAct,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      <Text style={styles.resultCount}>
        {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        {stockFilter !== 'All' ? ` · ${stockFilter}` : ''}
        {categoryFilter !== 'All' ? ` · ${categoryFilter}` : ''}
      </Text>

      {/* ── TABLE VIEW (desktop only when toggled) ── */}
      {isDesktop && viewMode === 'table' ? (
        <View style={{ flex: 1 }}>
          {/* Table header */}
          <View style={[tableStyles.headerRow, { backgroundColor: colors.background, borderBottomColor: colors.border, borderTopColor: colors.border }]}>
            <View style={tableStyles.colImg} />
            <View style={tableStyles.colName}><Text style={[tableStyles.headerTxt, { color: colors.textSecondary }]}>ITEM NAME</Text></View>
            <View style={tableStyles.colSku}><Text style={[tableStyles.headerTxt, { color: colors.textSecondary }]}>SKU</Text></View>
            <View style={tableStyles.colCat}><Text style={[tableStyles.headerTxt, { color: colors.textSecondary }]}>CATEGORY</Text></View>
            <View style={tableStyles.colCost}><Text style={[tableStyles.headerTxt, { color: colors.textSecondary }]}>COST</Text></View>
            <View style={tableStyles.colPrice}><Text style={[tableStyles.headerTxt, { color: colors.textSecondary }]}>PRICE</Text></View>
            <View style={tableStyles.colStock}><Text style={[tableStyles.headerTxt, { color: colors.textSecondary }]}>STOCK</Text></View>
            <View style={tableStyles.colStatus}><Text style={[tableStyles.headerTxt, { color: colors.textSecondary }]}>STATUS</Text></View>
            <View style={tableStyles.colActions}><Text style={[tableStyles.headerTxt, { color: colors.textSecondary, textAlign: 'right' }]}>ACTIONS</Text></View>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Package size={48} color={colors.border} strokeWidth={1} />
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 12 }}>No items found</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const status = getStockStatus(item.stock, item.minStock);
              const hasCosts = (item.costLines?.length ?? 0) > 0;
              const totalCost = hasCosts ? item.costLines!.reduce((s, l) => s + l.amount, 0) : 0;
              const rowBg = index % 2 === 0 ? colors.card : (colors.background);
              return (
                <Pressable
                  // @ts-ignore
                  style={({ hovered }: any) => [
                    tableStyles.row,
                    { backgroundColor: hovered ? ('#F1F5F9') : rowBg, borderBottomColor: colors.border },
                  ]}
                  onPress={() => { setSelectedItem(item); setDetailVisible(true); }}
                >
                  {/* Image */}
                  <View style={tableStyles.colImg}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={tableStyles.thumbImg} resizeMode="cover"
                        defaultSource={require('@/assets/images/placeholder.png')} />
                    ) : (
                      <View style={[tableStyles.thumbPlaceholder, { backgroundColor: colors.border }]}>
                        <Package size={16} color={colors.textSecondary} strokeWidth={1.5} />
                      </View>
                    )}
                  </View>
                  {/* Name */}
                  <View style={tableStyles.colName}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>{item.name}</Text>
                  </View>
                  {/* SKU */}
                  <View style={tableStyles.colSku}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: Platform.select({ web: 'monospace', default: undefined }) }} numberOfLines={1}>{item.sku}</Text>
                  </View>
                  {/* Category */}
                  <View style={tableStyles.colCat}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{item.category}</Text>
                  </View>
                  {/* Cost */}
                  <View style={tableStyles.colCost}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {hasCosts ? `₱${totalCost.toLocaleString()}` : '—'}
                    </Text>
                  </View>
                  {/* Selling Price */}
                  <View style={tableStyles.colPrice}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>₱{item.sellingPrice.toLocaleString()}</Text>
                  </View>
                  {/* Stock with progress bar */}
                  <View style={[tableStyles.colStock, { gap: 3 }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: status === 'critical' ? '#DC2626' : status === 'low' ? '#D97706' : colors.text }}>
                      {item.stock} {item.stockLabel ?? 'pcs'}
                    </Text>
                    <StockBar stock={item.stock} minStock={item.minStock} height={4} />
                  </View>
                  {/* Status */}
                  <View style={tableStyles.colStatus}>
                    <StockBadge status={status} size="sm" />
                  </View>
                  {/* Actions */}
                  <View style={[tableStyles.colActions, { flexDirection: 'row', gap: 4, justifyContent: 'flex-end' }]}>
                    <TouchableOpacity
                      onPress={() => { setSelectedItem(item); setDetailVisible(true); }}
                      style={[tableStyles.actionBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setEditItem(item); setEditVisible(true); }}
                      style={[tableStyles.actionBtn, { borderColor: colors.border }]}
                    >
                      <Pencil size={11} color={colors.textSecondary} strokeWidth={2} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(item)}
                      style={[tableStyles.actionBtn, { borderColor: colors.error + '60' }]}
                    >
                      <Trash2 size={11} color={colors.error} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      ) : (
        /* ── CARD VIEW ── */
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            isDesktop && { paddingHorizontal: 16, gap: 0 },
            filtered.length === 0 && { flex: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          numColumns={isDesktop ? 3 : isTablet ? 2 : 1}
          key={isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile'}
          columnWrapperStyle={isDesktop ? { gap: 12, marginBottom: 12 } : isTablet ? { gap: 10 } : undefined}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
              <Package size={48} color={colors.border} strokeWidth={1} />
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 12 }}>No items found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const status = getStockStatus(item.stock, item.minStock);
            const hasCosts = (item.costLines?.length ?? 0) > 0;
            const totalCost = hasCosts ? item.costLines!.reduce((s, l) => s + l.amount, 0) : 0;

            if (isDesktop) {
              // ── Desktop card: vertical layout, equal-height, denser ──
              return (
                <Pressable
                  // @ts-ignore
                  style={({ hovered }: any) => [
                    desktopCardStyles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: status === 'critical' ? '#FCA5A5' : status === 'low' ? '#FCD34D' : colors.border,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: hovered ? 4 : 2 },
                      shadowOpacity: hovered ? 0.12 : 0.06,
                      shadowRadius: hovered ? 10 : 4,
                      elevation: hovered ? 6 : 2,
                      transform: [{ translateY: hovered ? -2 : 0 }],
                    },
                  ]}
                  onPress={() => { setSelectedItem(item); setDetailVisible(true); }}
                >
                  {/* Image */}
                  <View style={desktopCardStyles.imageWrap}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={desktopCardStyles.image} resizeMode="cover"
                        defaultSource={require('@/assets/images/placeholder.png')} />
                    ) : (
                      <View style={[desktopCardStyles.imagePlaceholder, { backgroundColor: colors.border + '80' }]}>
                        <Package size={28} color={colors.textSecondary} strokeWidth={1.5} />
                      </View>
                    )}
                    {/* Status badge overlay */}
                    <View style={desktopCardStyles.badgeOverlay}>
                      <StockBadge status={status} size="sm" />
                    </View>
                  </View>
                  {/* Body */}
                  <View style={desktopCardStyles.body}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, lineHeight: 18 }} numberOfLines={2}>{item.name}</Text>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: Platform.select({ web: 'monospace', default: undefined }), marginTop: 2 }}>{item.sku}</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{item.category}</Text>
                    {/* Price row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: colors.accent }}>₱{item.sellingPrice.toLocaleString()}</Text>
                      {hasCosts && <Text style={{ fontSize: 10, color: colors.textSecondary }}>Cost ₱{totalCost.toLocaleString()}</Text>}
                    </View>
                    {/* Stock row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: status === 'critical' ? '#DC2626' : status === 'low' ? '#D97706' : colors.text }}>
                        {item.stock} {item.stockLabel ?? 'pcs'}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>min {item.minStock}</Text>
                    </View>
                    {/* Stock bar */}
                    <View style={{ marginTop: 6 }}>
                      <StockBar stock={item.stock} minStock={item.minStock} height={4} />
                    </View>
                  </View>
                  {/* Actions footer */}
                  <View style={[desktopCardStyles.footer, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation?.(); setEditItem(item); setEditVisible(true); }}
                      style={[desktopCardStyles.footerBtn, { borderRightWidth: 1, borderRightColor: colors.border }]}
                    >
                      <Pencil size={13} color={colors.textSecondary} strokeWidth={2} />
                      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation?.(); handleDeleteItem(item); }}
                      style={desktopCardStyles.footerBtn}
                    >
                      <Trash2 size={13} color={colors.error} strokeWidth={2} />
                      <Text style={{ fontSize: 11, color: colors.error, fontWeight: '600' }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              );
            }

            // ── Mobile / Tablet card: original horizontal layout ──
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  item.lowStock && styles.cardLow,
                  isTablet && { flex: 1 },
                ]}
                onPress={() => {
                  setSelectedItem(item);
                  setDetailVisible(true);
                }}
                activeOpacity={0.82}
              >
                <View style={styles.cardInner}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.thumbImg} resizeMode="cover"
                      defaultSource={require('@/assets/images/placeholder.png')} />
                  ) : (
                    <View style={styles.thumb}>
                      <Package size={24} color={colors.textSecondary} strokeWidth={1.5} />
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.skuText}>{item.sku}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>
                        ₱{item.sellingPrice.toLocaleString()}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: status === 'critical' ? '#DC2626' : status === 'low' ? '#D97706' : colors.text }}>
                        {item.stock} {item.stockLabel ?? 'pcs'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                      <Text style={[styles.skuText, { fontSize: 11 }]}>{item.category}</Text>
                      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                        {hasCosts && <Text style={{ fontSize: 10, color: colors.textSecondary }}>Cost ₱{totalCost.toLocaleString()}</Text>}
                        <StockBadge status={status} size="sm" />
                      </View>
                    </View>
                  </View>
                </View>
                <View style={[styles.stockBarWrap, { marginBottom: 8 }]}>
                  <StockBar stock={item.stock} minStock={item.minStock} height={3} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <ItemDetailModal
        item={selectedItem}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onAdjustStock={handleAdjustStock}
        onDelete={handleDeleteItem}
        onEdit={(item) => {
          setEditItem(item);
          setEditVisible(true);
        }}
        colors={colors}
      />
      <AddItemModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAddItem}
        colors={colors}
      />
      <EditItemModal
        item={editItem}
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSaved={handleItemSaved}
        colors={colors}
      />
    </View>
  );
}