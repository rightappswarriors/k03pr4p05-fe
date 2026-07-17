import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WholesaleService } from '@/services/wholesaleService';
import type { SupplierItem, PriceTier } from '@/types/index';
import { Package, Star, MapPin, Truck, FileText, Ruler, Shield, ChevronLeft } from 'lucide-react-native';

// ─── Helper Functions ─────────────────────────────────────────────────────

const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

const formatQty = (qty: number | null | undefined) => {
  if (qty == null) return '—';
  return new Intl.NumberFormat('en-PH').format(qty);
};

// ─── Price Tier Display ────────────────────────────────────────────────────

function PriceTierSection({ priceTiers }: { priceTiers: PriceTier[] }) {
  const { colors } = useTheme();
  const sortedTiers = [...priceTiers].sort((a, b) => a.minQty - b.minQty);

  if (sortedTiers.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
        Price Tiers
      </Text>
      <View style={{ gap: 8 }}>
        {sortedTiers.map((tier, index) => (
          <View
            key={tier.id}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                {tier.minQty} — {tier.maxQty ? tier.maxQty : '∞'} units
              </Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>
              {formatPHP(tier.price)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Specifications Section ──────────────────────────────────────────────

function SpecificationsSection({
  specifications,
}: {
  specifications: SupplierItem['productSpecifications'];
}) {
  const { colors } = useTheme();

  if (!specifications || specifications.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
        Specifications
      </Text>
      <View style={{ gap: 8 }}>
        {specifications.map((spec) => (
          <View
            key={spec.id}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.textSecondary, flex: 1 }}>
              {spec.name}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
              {spec.value}
              {spec.unit && ` ${spec.unit}`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Packaging Section ─────────────────────────────────────────────────────

function PackagingSection({ packaging }: { packaging: SupplierItem['wholesalePackaging'] }) {
  const { colors } = useTheme();

  if (!packaging) return null;

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
        Packaging
      </Text>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 8,
        }}
      >
        {packaging.sellingUnit && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Selling Unit</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
              {packaging.sellingUnit}
            </Text>
          </View>
        )}
        {(packaging.packageLength || packaging.packageWidth || packaging.packageHeight) && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Dimensions</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
              {packaging.packageLength || 0} × {packaging.packageWidth || 0} × {packaging.packageHeight || 0} cm
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Gross Weight</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
            {packaging.grossWeight ? `${packaging.grossWeight} kg` : '—'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Net Weight</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
            {packaging.netWeight ? `${packaging.netWeight} kg` : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Shipping Section ───────────────────────────────────────────────────────

function ShippingSection({ shipping }: { shipping: SupplierItem['wholesaleShipping'] }) {
  const { colors } = useTheme();

  if (!shipping) return null;

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
        Shipping
      </Text>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 8,
        }}
      >
        {(shipping.originCountry || shipping.originProvince || shipping.originCity) && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Origin</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
              {[shipping.originCity, shipping.originProvince, shipping.originCountry]
                .filter(Boolean)
                .join(', ') || '—'}
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Method</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
            {shipping.shippingMethod || '—'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>Est. Days</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
            {shipping.estimatedDays ? `${shipping.estimatedDays} days` : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Documents Section ─────────────────────────────────────────────────────

function DocumentsSection({ documents }: { documents: SupplierItem['wholesaleDocuments'] }) {
  const { colors } = useTheme();

  if (!documents || documents.length === 0) return null;

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CE: 'Certificate of Conformity',
      FDA: 'FDA Certificate',
      ISO: 'ISO Certification',
      ROHS: 'RoHS Compliance',
      MSDS: 'Material Safety Data Sheet',
      OTHER: 'Other Document',
    };
    return labels[type] || type;
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
        Documents
      </Text>
      <View style={{ gap: 8 }}>
        {documents.map((doc) => (
          <TouchableOpacity
            key={doc.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 12,
            }}
            activeOpacity={0.7}
          >
            <FileText size={20} color={colors.primary} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {doc.title || getDocTypeLabel(doc.type)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {getDocTypeLabel(doc.type)}
              </Text>
            </View>
            {doc.verified && (
              <Shield size={16} color="#10B981" strokeWidth={2} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Main Product Detail Screen ─────────────────────────────────────────────

export default function WholesaleProductDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const productId = params.id;
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [product, setProduct] = useState<SupplierItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    if (!productId) {
      setError('Product ID is required');
      setLoading(false);
      return;
    }

    try {
      const data = await WholesaleService.getWholesaleProduct(productId);
      if (data) {
        setProduct(data);
        setError(null);
      } else {
        setError('Product not found');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProduct();
    setRefreshing(false);
  };

  // Calculate price for quantity (show appropriate tier or base price)
  const getPriceForQty = useMemo(() => {
    if (!product) return 0;
    const price = product.unitPrice || 0;
    const tiers = product.priceTiers;
    if (tiers.length === 0) return price;
    // For display, show base price (minQty tier)
    const baseTier = tiers.find((t) => t.minQty === 1) || tiers[0];
    return baseTier?.price ?? price;
  }, [product]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Package size={64} color={colors.textSecondary} strokeWidth={1.5} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 }}>
          {error || 'Product not found'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: isDesktop ? 24 : 56,
          paddingHorizontal: isDesktop ? 32 : 20,
          paddingBottom: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
          Product Details
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: isDesktop ? 32 : isTablet ? 24 : 16,
          maxWidth: isDesktop ? 1200 : undefined,
          alignSelf: 'center',
          width: '100%',
          gap: 24,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Product Image & Basic Info */}
        <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: 16 }}>
          {product.image && (
            <View
              style={{
                width: isTablet ? 200 : '100%',
                height: isTablet ? 200 : 200,
                borderRadius: 16,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={64} color={colors.textSecondary} strokeWidth={1.5} />
              </View>
            </View>
          )}

          <View style={{ flex: 1, gap: 12 }}>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>
                {product.name}
              </Text>
              {product.sku && (
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                  SKU: {product.sku}
                </Text>
              )}
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Star size={18} color="#F59E0B" strokeWidth={2} fill="#F59E0B" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                {product.averageRating.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                ({product.reviewCount} reviews)
              </Text>
            </View>

            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>
              {formatPHP(getPriceForQty)}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View
                style={{
                  backgroundColor: colors.background,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  MOQ: {formatQty(product.moq)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: colors.background,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Available: {formatQty(product.availableQty)}
                </Text>
              </View>
              {product.isVatExempt && (
                <View
                  style={{
                    backgroundColor: '#D1FAE5',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#065F46' }}>
                    VAT Exempt
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Description */}
        {product.description && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
              Description
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
              {product.description}
            </Text>
          </View>
        )}

        {/* Wholesale Settings */}
        {product.productWholesaleSettings && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
              Wholesale Settings
            </Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Sample Available</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  {product.productWholesaleSettings.sampleAvailable ? 'Yes' : 'No'}
                </Text>
              </View>
              {product.productWholesaleSettings.samplePrice && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Sample Price</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    {formatPHP(product.productWholesaleSettings.samplePrice)}
                  </Text>
                </View>
              )}
              {product.productWholesaleSettings.leadTime && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Lead Time</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                    {product.productWholesaleSettings.leadTime}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Price Tiers */}
        <PriceTierSection priceTiers={product.priceTiers} />

        {/* Specifications */}
        <SpecificationsSection specifications={product.productSpecifications} />

        {/* Packaging */}
        <PackagingSection packaging={product.wholesalePackaging} />

        {/* Shipping */}
        <ShippingSection shipping={product.wholesaleShipping} />

        {/* Documents */}
        <DocumentsSection documents={product.wholesaleDocuments} />
      </ScrollView>
    </View>
  );
}