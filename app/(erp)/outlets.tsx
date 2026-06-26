// screens/(admin)/outlets.tsx — OutletListScreen
// Responsive: 4/3/2/1 grid columns based on screen width

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ListRenderItemInfo,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  ScrollView,
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  PhilippinePeso,
  Users,
  Circle,
  Plus,
  X,
  Navigation,
  Map,
  Camera,
  Image as ImageIcon,
  Edit2,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminService } from '@/services/ManagerService';
import { AuthService } from '@/services/authService';
import { AdminOutlet, OutletPromoInput, OutletRevenue } from '@/types';
import { DateRangeFilter, getDateRange } from '@/utils/dateHelpers';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { useWebSocket } from '@/contexts/WSContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DropdownField } from './branch';
import { useLimitGuard } from '@/components/LockedFeature';
import { SkeletonPulse } from './branch';
import {
  validatePercentage,
  validatePHPhone,
  validateOutletCode,
} from '@/utils/validators';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator } from 'react-native';
import { MediaService } from '@/services/mediaService';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { formatPeso } from '@/utils/moneyHelpers';
import { VatTypeItem, VatTypeService } from '@/services/vatTypeService';
import { PromoTypeItem, PromoTypeService } from '@/services/promoTypeService';
import { autoCode } from '@/utils/autoCode';

export const FILTERS: DateRangeFilter[] = [
  'today',
  'this_week',
  'this_month',
  'custom',
];
const OUTLET_TYPES = [{ id: 'retail', label: 'Retail' }, { id: 'wholesale', label: 'Wholesale' }, { id: 'service', label: 'Service' }];
const OUTLET_STATUSES = [{ id: 'open', label: 'Open' }, { id: 'closed', label: 'Closed' }, { id: 'maintenance', label: 'Maintenance' }];

const isWeb = Platform.OS === 'web';

// ─── Overlay styles ────────────────────────────────────────────────────────────

// Bottom sheet overlay — used only on native (modals on web use centeredOverlay)
const bottomSheetOverlay: any = Platform.select({
  web: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    zIndex: 9999,
  },
  default: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
});

// Centered modal overlay — web only
const centeredOverlay: any = Platform.select({
  web: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 9999,
  },
  default: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
});

// ─── Skeleton outlet card ──────────────────────────────────────────────────────

function SkeletonOutletCard({ colors }: { colors: any }) {
  return (
    <View style={[ols.outletCard, { backgroundColor: colors.card }]}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonPulse colors={colors} style={{ width: '55%', height: 16 }} />
          <SkeletonPulse colors={colors} style={{ width: '40%', height: 12 }} />
        </View>
        <SkeletonPulse
          colors={colors}
          style={{ width: 60, height: 22, borderRadius: 11 }}
        />
      </View>
      <SkeletonPulse
        colors={colors}
        style={{ width: '100%', height: 52, borderRadius: 8, marginBottom: 12 }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SkeletonPulse colors={colors} style={{ width: 100, height: 12 }} />
        <SkeletonPulse colors={colors} style={{ width: 80, height: 12 }} />
      </View>
    </View>
  );
}

// ─── Map Pin Picker ────────────────────────────────────────────────────────────

const PH_REGION = {
  latitude: 10.7202,
  longitude: 122.5621,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

let MapViewComponent: any = null;
let MapMarkerComponent: any = null;

const loadMapComponents = () => {
  if (!MapViewComponent) {
    try {
      const mapModule = require('react-native-maps');
      MapViewComponent = mapModule.default || mapModule.MapView;
      MapMarkerComponent = mapModule.Marker;
    } catch (e) {
      if (__DEV__) console.warn('react-native-maps not available:', e);
    }
  }
  return { MapViewComponent, MapMarkerComponent };
};

function MapPinPicker({
  visible,
  onClose,
  onConfirm,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  colors: any;
}) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [componentReady, setComponentReady] = useState(false);

  React.useEffect(() => {
    if (visible) {
      loadMapComponents();
      setComponentReady(true);
    } else {
      setMarker(null);
    }
  }, [visible]);

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ lat: latitude, lng: longitude });
  };

  const handleConfirm = () => {
    if (!marker) return;
    onConfirm(marker.lat, marker.lng);
    onClose();
  };

  const { MapViewComponent: MapView, MapMarkerComponent: Marker } =
    loadMapComponents();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {componentReady && MapView ? (
          <MapView
            style={{ flex: 1 }}
            provider="google"
            initialRegion={PH_REGION}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton
          >
            {marker && Marker && (
              <Marker
                coordinate={{ latitude: marker.lat, longitude: marker.lng }}
                pinColor={colors.primary ?? '#1B3A6B'}
              />
            )}
          </MapView>
        ) : componentReady && !MapView ? (
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 16,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              Map is not available. Please enter coordinates manually below.
            </Text>
            <Text
              style={[
                aom.label,
                { color: colors.textSecondary, marginBottom: 5 },
              ]}
            >
              Latitude
            </Text>
            <TextInput
              style={[
                aom.input,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  marginBottom: 10,
                },
              ]}
              placeholder="e.g. 10.7202"
              placeholderTextColor={colors.textSecondary}
              value={marker?.lat.toString() || ''}
              onChangeText={(text) => {
                const lat = parseFloat(text);
                setMarker((prev) => ({
                  lat: isNaN(lat) ? prev?.lat || 0 : lat,
                  lng: prev?.lng || 0,
                }));
              }}
              keyboardType="decimal-pad"
            />
            <Text
              style={[
                aom.label,
                { color: colors.textSecondary, marginBottom: 5 },
              ]}
            >
              Longitude
            </Text>
            <TextInput
              style={[
                aom.input,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  marginBottom: 20,
                },
              ]}
              placeholder="e.g. 122.5621"
              placeholderTextColor={colors.textSecondary}
              value={marker?.lng.toString() || ''}
              onChangeText={(text) => {
                const lng = parseFloat(text);
                setMarker((prev) => ({
                  lat: prev?.lat || 0,
                  lng: isNaN(lng) ? prev?.lng || 0 : lng,
                }));
              }}
              keyboardType="decimal-pad"
            />
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.text, marginTop: 12 }}>
              Loading map...
            </Text>
          </View>
        )}
        <View style={[mpp.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              mpp.closeBtn,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={onClose}
          >
            <X size={18} color={colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[mpp.title, { color: colors.text }]}>
              Pin Outlet Location
            </Text>
            <Text style={[mpp.hint, { color: colors.textSecondary }]}>
              {marker
                ? `${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}`
                : MapView
                  ? 'Tap anywhere on the map to drop a pin'
                  : 'Enter coordinates manually'}
            </Text>
          </View>
        </View>
        {marker && (
          <View
            style={[
              mpp.footer,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[mpp.clearBtn, { borderColor: colors.border }]}
              onPress={() => setMarker(null)}
              activeOpacity={0.8}
            >
              <Text style={[mpp.clearTxt, { color: colors.textSecondary }]}>
                Clear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[mpp.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Navigation size={15} color="#fff" strokeWidth={2} />
              <Text style={mpp.confirmTxt}>Use This Location</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const mpp = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12, marginTop: 1 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    borderTopWidth: 1,
  },
  clearBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearTxt: { fontSize: 14, fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 10,
    paddingVertical: 13,
  },
  confirmTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── Add Outlet Modal ──────────────────────────────────────────────────────────

interface OutletFormData {
  name: string;
  address: string;
  phone: string;
  code: string;
  outletType: string;
  status: string;
  isActive: boolean;
  governmentTax: string;
  serviceCharge: string;
  wifiSSID: string;
  latitude: number | undefined;
  longitude: number | undefined;
  bannerImage: string;
  bannerImageFile?: any;

  bannerImagePath?: string;
  tin?: string;
  ptu?: string;
  bir?: string;
  isVatRegistered?: boolean;
  vatZeroSale?: string;
  vatTypeId?: number;
  outletPromos?: OutletPromoInput[];
}

function AddOutletModal({
  visible,
  onClose,
  onAdd,
  colors,
  branchName,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: OutletFormData) => Promise<void>;
  colors: any;
  branchName: string;
}) {
  const [form, setForm] = useState<OutletFormData>({
    name: '',
    address: '',
    phone: '',
    code: '',
    outletType: 'retail',
    status: 'open',
    isActive: true,
    governmentTax: '12',
    serviceCharge: '',
    wifiSSID: '',
    latitude: undefined,
    longitude: undefined,
    bannerImage: '',
    bannerImageFile: null,
    bannerImagePath: '',
    tin: '',
    ptu: '',
    bir: '',
    isVatRegistered: false,
    vatZeroSale: '',
    vatTypeId: undefined,
    outletPromos: [],
  });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [vatTypes, setVatTypes] = useState<VatTypeItem[]>([]);
  const [promoTypes, setPromoTypes] = useState<PromoTypeItem[]>([]);

  useEffect(() => {
    if (visible) {
      VatTypeService.getAll().then(setVatTypes);
      PromoTypeService.getAll().then(setPromoTypes);
    }
  }, [visible]);

  const set = (field: keyof OutletFormData) => (value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));

  const validateField = (field: string, value: string) => {
    if (field === 'phone') {
      const r = validatePHPhone(value);
      setFieldErrors((prev) => ({ ...prev, phone: r.message }));
    }
    if (field === 'code') {
      const r = validateOutletCode(value);
      setFieldErrors((prev) => ({ ...prev, code: r.message }));
    }
    if (field === 'governmentTax') {
      const r = validatePercentage(value, 'Government Tax');
      setFieldErrors((prev) => ({ ...prev, governmentTax: r.message }));
    }
    if (field === 'serviceCharge') {
      const r = validatePercentage(value, 'Service Charge');
      setFieldErrors((prev) => ({ ...prev, serviceCharge: r.message }));
    }
  };

  const InlineError = ({ field }: { field: string }) =>
    fieldErrors[field] ? (
      <Text
        style={{
          fontSize: 11,
          color: colors.error,
          marginTop: -8,
          marginBottom: 10,
        }}
      >
        {fieldErrors[field]}
      </Text>
    ) : null;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setForm((prev) => ({
        ...prev,
        bannerImage: asset.uri,
        bannerImageFile: (asset as any).file ?? null,
      }));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions!');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setForm((prev) => ({
        ...prev,
        bannerImage: asset.uri,
        bannerImageFile: (asset as any).file ?? null,
      }));
    }
  };



  const handleAdd = async () => {
    if (!form.name.trim()) {
      setError('Outlet name is required.');
      return;
    }
    if (!form.address.trim()) {
      setError('Address is required.');
      return;
    }
    const phoneCheck = validatePHPhone(form.phone);
    if (!phoneCheck.valid) {
      setError(phoneCheck.message);
      return;
    }
    const codeCheck = validateOutletCode(form.code);
    if (!codeCheck.valid) {
      setError(codeCheck.message);
      return;
    }
    const taxCheck = validatePercentage(form.governmentTax, 'Government Tax');
    if (!taxCheck.valid) {
      setError(taxCheck.message);
      return;
    }
    const svcCheck = validatePercentage(form.serviceCharge, 'Service Charge');
    if (!svcCheck.valid) {
      setError(svcCheck.message);
      return;
    }

    const finalCode = form.code.trim() || autoCode(form.name);
    setLoading(true);
    try {
      let bannerImageUrl = form.bannerImage;
      let bannerImagePath = form.bannerImagePath;
      const isLocalImage = bannerImageUrl && !bannerImageUrl.startsWith('http');
      if (isLocalImage) {
        const user = await AuthService.getCurrentUser();
        if (!user?.orgId) throw new Error('Organization identifier not found.');
        const mediaResult = await MediaService.uploadMedia(
          {
            uri: bannerImageUrl,
            name: `outlet_${Date.now()}.jpg`,
            type: 'image/jpeg',
            file: form.bannerImageFile,
          },
          String(user.orgId),
        );
        bannerImageUrl = mediaResult.publicUrl;
        bannerImagePath = mediaResult.filePath;
      }
      await onAdd({
        ...form,
        code: finalCode,
        bannerImage: bannerImageUrl,
        bannerImagePath,
      });
      setForm({
        name: '',
        address: '',
        phone: '',
        code: '',
        outletType: 'retail',
        status: 'open',
        isActive: true,
        governmentTax: '12',
        serviceCharge: '',
        wifiSSID: '',
        latitude: undefined,
        longitude: undefined,
        bannerImage: '',
        bannerImageFile: null,
        bannerImagePath: '',
        tin: '',
        ptu: '',
        bir: '',
        isVatRegistered: false,
        vatZeroSale: '',
        vatTypeId: undefined,
        outletPromos: [],
      });
      setError('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create outlet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    color: colors.text,
    backgroundColor: colors.background,
    borderColor: colors.border,
  };
  const labelStyle = { color: colors.textSecondary };

  // On web: centered dialog. On native: bottom sheet.
  const overlayStyle = isWeb ? centeredOverlay : bottomSheetOverlay;
  const sheetStyle = isWeb
    ? [aom.sheet, aom.webDialog, { backgroundColor: colors.surface }]
    : [
      aom.sheet,
      {
        backgroundColor: colors.surface,
        maxWidth: 600,
        width: '100%' as any,
      },
    ];

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType={isWeb ? 'fade' : 'slide'}
        onRequestClose={onClose}
      >
        <View style={overlayStyle}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={sheetStyle}>
              {/* Handle — only on native bottom sheet */}
              {!isWeb && (
                <View
                  style={[aom.handle, { backgroundColor: colors.border }]}
                />
              )}

              {/* Header */}
              <View style={[aom.header, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[aom.title, { color: colors.text }]}>
                    New Outlet
                  </Text>
                  <Text style={[aom.sub, { color: colors.textSecondary }]}>
                    {branchName}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose}>
                  <X size={20} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={aom.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={[aom.section, { color: colors.textSecondary }]}>
                  BASIC INFO
                </Text>
                <Text style={[aom.label, labelStyle]}>OUTLET NAME *</Text>
                <TextInput
                  style={[aom.input, inputStyle]}
                  placeholder="e.g. Main Street Outlet"
                  placeholderTextColor={colors.textSecondary}
                  value={form.name}
                  onChangeText={set('name')}
                />
                <Text style={[aom.label, labelStyle]}>ADDRESS *</Text>
                <TextInput
                  style={[aom.input, aom.textarea, inputStyle]}
                  placeholder="Full address"
                  placeholderTextColor={colors.textSecondary}
                  value={form.address}
                  onChangeText={set('address')}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <Text style={[aom.label, labelStyle]}>
                  BANNER IMAGE (optional)
                </Text>
                {form.bannerImage ? (
                  <View
                    style={[
                      aom.imagePreview,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <ImageIcon size={40} color={colors.primary} />
                    <Text
                      style={[aom.imageText, { color: colors.textSecondary }]}
                    >
                      Banner selected
                    </Text>
                    <TouchableOpacity
                      style={aom.removeImageBtn}
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          bannerImage: '',
                          bannerImageFile: null,
                        }))
                      }
                    >
                      <X size={16} color={colors.error} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={aom.imagePicker}>
                    <TouchableOpacity
                      style={[
                        aom.imageBtn,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      onPress={pickImage}
                    >
                      <ImageIcon
                        size={20}
                        color={colors.primary}
                        strokeWidth={2}
                      />
                      <Text
                        style={[aom.imageBtnText, { color: colors.primary }]}
                      >
                        Gallery
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        aom.imageBtn,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      onPress={takePhoto}
                    >
                      <Camera
                        size={20}
                        color={colors.primary}
                        strokeWidth={2}
                      />
                      <Text
                        style={[aom.imageBtnText, { color: colors.primary }]}
                      >
                        Camera
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={[aom.hint, { color: colors.textSecondary }]}>
                  Banner image will be displayed at the top of the outlet in the
                  POS app.
                </Text>
                <Text style={[aom.label, labelStyle]}>PHONE (optional)</Text>
                <TextInput
                  style={[
                    aom.input,
                    inputStyle,
                    fieldErrors.phone ? { borderColor: colors.error } : {},
                  ]}
                  placeholder="+63 9XX XXX XXXX"
                  placeholderTextColor={colors.textSecondary}
                  value={form.phone}
                  onChangeText={(v) => {
                    set('phone')(v);
                    clearFieldError('phone');
                  }}
                  onBlur={() => validateField('phone', form.phone)}
                  keyboardType="phone-pad"
                />
                <InlineError field="phone" />
                <Text style={[aom.label, labelStyle]}>OUTLET CODE</Text>
                <TextInput
                  style={[
                    aom.input,
                    inputStyle,
                    fieldErrors.code ? { borderColor: colors.error } : {},
                  ]}
                  placeholder="Auto-generated if left blank"
                  placeholderTextColor={colors.textSecondary}
                  value={form.code}
                  onChangeText={(v) => {
                    set('code')(v.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                    clearFieldError('code');
                  }}
                  onBlur={() => validateField('code', form.code)}
                  maxLength={12}
                  autoCapitalize="characters"
                />
                <InlineError field="code" />
                <Text style={[aom.hint, { color: colors.textSecondary }]}>
                  Unique code used by POS terminals.
                </Text>

                <Text style={[aom.section, { color: colors.textSecondary }]}>
                  TYPE & STATUS
                </Text>
                <DropdownField
                  label="Outlet Type"
                  value={form.outletType}
                  options={OUTLET_TYPES}
                  onSelect={(item) => set('outletType')(item.id)}
                  colors={colors}
                />
                <DropdownField
                  label="Status"
                  value={form.status}
                  options={OUTLET_STATUSES}
                  onSelect={(item) => set('status')(item.id)}
                  colors={colors}
                />
                <View style={[aom.toggleRow, { borderColor: colors.border }]}>
                  <View>
                    <Text style={[aom.toggleLabel, { color: colors.text }]}>
                      Active
                    </Text>
                    <Text
                      style={[aom.toggleSub, { color: colors.textSecondary }]}
                    >
                      Outlet is visible and operational
                    </Text>
                  </View>
                  <Switch
                    value={form.isActive}
                    onValueChange={set('isActive')}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>

                <Text style={[aom.section, { color: colors.textSecondary }]}>
                  FEES & CHARGES
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[aom.label, labelStyle]}>GOV. TAX %</Text>
                    <TextInput
                      style={[
                        aom.input,
                        inputStyle,
                        fieldErrors.governmentTax
                          ? { borderColor: colors.error }
                          : {},
                      ]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={form.governmentTax}
                      onChangeText={(v) => {
                        set('governmentTax')(v.replace(/[^0-9.]/g, ''));
                        clearFieldError('governmentTax');
                      }}
                      onBlur={() =>
                        validateField('governmentTax', form.governmentTax)
                      }
                      keyboardType="decimal-pad"
                    />
                    <InlineError field="governmentTax" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[aom.label, labelStyle]}>
                      SERVICE CHARGE %
                    </Text>
                    <TextInput
                      style={[
                        aom.input,
                        inputStyle,
                        fieldErrors.serviceCharge
                          ? { borderColor: colors.error }
                          : {},
                      ]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={form.serviceCharge}
                      onChangeText={(v) => {
                        set('serviceCharge')(v.replace(/[^0-9.]/g, ''));
                        clearFieldError('serviceCharge');
                      }}
                      onBlur={() =>
                        validateField('serviceCharge', form.serviceCharge)
                      }
                      keyboardType="decimal-pad"
                    />
                    <InlineError field="serviceCharge" />
                  </View>
                </View>

                <Text style={[aom.section, { color: colors.textSecondary }]}>
                  SETTINGS
                </Text>
                <Text style={[aom.label, labelStyle]}>
                  WIFI SSID (optional)
                </Text>
                <TextInput
                  style={[aom.input, inputStyle]}
                  placeholder="Network name for POS terminal"
                  placeholderTextColor={colors.textSecondary}
                  value={form.wifiSSID}
                  onChangeText={set('wifiSSID')}
                  maxLength={64}
                />

                <Text style={[aom.section, { color: colors.textSecondary }]}>
                  LOCATION
                </Text>
                <TouchableOpacity
                  style={[
                    aom.locationBtn,
                    {
                      borderColor: form.latitude
                        ? colors.primary
                        : colors.border,
                      backgroundColor: form.latitude
                        ? colors.primary + '10'
                        : colors.background,
                    },
                  ]}
                  onPress={() => setShowMapPicker(true)}
                  activeOpacity={0.82}
                >
                  <Map
                    size={16}
                    color={
                      form.latitude ? colors.primary : colors.textSecondary
                    }
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      aom.locationBtnTxt,
                      {
                        color: form.latitude
                          ? colors.primary
                          : colors.textSecondary,
                        flex: 1,
                      },
                    ]}
                  >
                    {form.latitude
                      ? `📍 ${form.latitude.toFixed(5)}, ${form.longitude?.toFixed(5)}`
                      : 'Set coordinates'}
                  </Text>
                  {form.latitude && (
                    <TouchableOpacity
                      onPress={() =>
                        setForm((p) => ({
                          ...p,
                          latitude: undefined,
                          longitude: undefined,
                        }))
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={14} color={colors.error} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {error ? (
                  <Text style={[aom.error, { color: colors.error }]}>
                    {error}
                  </Text>
                ) : null}

                <Text style={[aom.section, { color: colors.textSecondary }]}>
                  VAT & COMPLIANCE
                </Text>
                <View style={[aom.toggleRow, { borderColor: colors.border }]}>
                  <View>
                    <Text style={[aom.toggleLabel, { color: colors.text }]}>
                      VAT Registered
                    </Text>
                    <Text
                      style={[aom.toggleSub, { color: colors.textSecondary }]}
                    >
                      Outlet charges VAT on transactions
                    </Text>
                  </View>
                  <Switch
                    value={form.isVatRegistered ?? false}
                    onValueChange={set('isVatRegistered')}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
                {form.isVatRegistered && (
                  <>
                    <DropdownField
                      label="VAT Type"
                      value={form.vatTypeId !== undefined ? String(form.vatTypeId) : ''}
                      options={vatTypes.map((v) => ({ id: String(v.id), label: v.name }))}
                      onSelect={(item) => {
                        set('vatTypeId')(parseInt(item.id, 10));
                      }}
                      colors={colors}
                    />
                    <Text style={[aom.label, labelStyle]}>VAT ZERO SALE %</Text>
                    <TextInput
                      style={[aom.input, inputStyle]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                      value={form.vatZeroSale ?? ''}
                      onChangeText={set('vatZeroSale')}
                      keyboardType="decimal-pad"
                    />
                  </>
                )}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {[
                    ['TIN', 'tin', '000-000-000-000'],
                    ['PTU NO.', 'ptu', 'Permit to Operate no.'],
                    ['BIR ACCREDITATION', 'bir', 'BIR accreditation no.'],
                  ].map(([label, field, ph]) => (
                    <View style={{ flex: 1 }} key={field}>
                      <Text style={[aom.label, labelStyle]}>{label}</Text>
                      <TextInput
                        style={[aom.input, inputStyle]}
                        placeholder={ph}
                        placeholderTextColor={colors.textSecondary}
                        value={(form as any)[field] ?? ''}
                        onChangeText={set(field as keyof OutletFormData)}
                        autoCapitalize="characters"
                      />
                    </View>
                  ))}
                </View>

                <Text style={[aom.section, { color: colors.textSecondary }]}>
                  PROMO DISCOUNTS
                </Text>
                <Text style={[aom.hint, { color: colors.textSecondary }]}>
                  Configure which discount types this outlet accepts and their
                  rates.
                </Text>
                {promoTypes.map((pt) => {
                  const existing = (form.outletPromos ?? []).find(
                    (p) => p.promoTypeId === pt.id,
                  );
                  const isEnabled = !!existing;
                  return (
                    <View
                      key={pt.id}
                      style={{
                        borderWidth: 1,
                        borderColor: isEnabled ? colors.primary : colors.border,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 8,
                        backgroundColor: isEnabled
                          ? colors.primary + '08'
                          : colors.background,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: colors.text,
                              fontWeight: '600',
                              fontSize: 14,
                            }}
                          >
                            {pt.name}
                          </Text>
                          {pt.description ? (
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontSize: 11,
                                marginTop: 2,
                              }}
                            >
                              {pt.description}
                            </Text>
                          ) : null}
                        </View>
                        <Switch
                          value={isEnabled}
                          onValueChange={(val) => {
                            setForm((prev) => {
                              const promos = prev.outletPromos ?? [];
                              if (val)
                                return {
                                  ...prev,
                                  outletPromos: [
                                    ...promos,
                                    {
                                      promoTypeId: pt.id,
                                      discount: 0,
                                      isActive: true,
                                    },
                                  ],
                                };
                              return {
                                ...prev,
                                outletPromos: promos.filter(
                                  (p) => p.promoTypeId !== pt.id,
                                ),
                              };
                            });
                          }}
                          trackColor={{
                            false: colors.border,
                            true: colors.primary,
                          }}
                          thumbColor="#fff"
                        />
                      </View>
                      {isEnabled && (
                        <View style={{ marginTop: 10 }}>
                          <Text
                            style={[aom.label, { color: colors.textSecondary }]}
                          >
                            DISCOUNT %
                          </Text>
                          <TextInput
                            style={[aom.input, inputStyle, { marginBottom: 0 }]}
                            placeholder="e.g. 20"
                            placeholderTextColor={colors.textSecondary}
                            value={
                              existing!.discount === 0
                                ? ''
                                : String(existing!.discount)
                            }
                            onChangeText={(v) => {
                              setForm((prev) => ({
                                ...prev,
                                outletPromos: (prev.outletPromos ?? []).map(
                                  (p) =>
                                    p.promoTypeId === pt.id
                                      ? { ...p, discount: parseFloat(v) || 0 }
                                      : p,
                                ),
                              }));
                            }}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      )}
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[
                    aom.submitBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: loading ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleAdd}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Text style={aom.submitTxt}>
                    {loading ? 'Creating…' : 'Create Outlet'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      <MapPinPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={(la, ln) =>
          setForm((p) => ({ ...p, latitude: la, longitude: ln }))
        }
        colors={colors}
      />
    </>
  );
}

export const aom = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%' as any,
  },
  // Web-only: centered dialog instead of bottom sheet
  webDialog: {
    borderRadius: 16,
    width: 600,
    maxWidth: '90vw' as any,
    maxHeight: '85vh' as any,
    // override the bottom-sheet border radius on all corners
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 1 },
  body: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  section: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  hint: { fontSize: 11, lineHeight: 16, marginTop: -8, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 14,
  },
  textarea: { minHeight: 70, paddingTop: 10 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleSub: { fontSize: 11, marginTop: 1 },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 14,
  },
  locationBtnTxt: { fontSize: 14 },
  imagePicker: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  imageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
  },
  imageBtnText: { fontSize: 14, fontWeight: '600' },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  imageText: { flex: 1, fontSize: 14 },
  removeImageBtn: { padding: 4 },
  error: { fontSize: 12, marginBottom: 8 },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// ─── Edit Branch Modal ─────────────────────────────────────────────────────────

function EditBranchModal({
  visible,
  onClose,
  branchId,
  branchName,
  branchAddress,
  branchPhone,
  onUpdated,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  onUpdated: (branch: {
    name: string;
    address: string;
    phone?: string;
  }) => void;
  colors: any;
}) {
  const [name, setName] = useState(branchName);
  const [address, setAddress] = useState(branchAddress);
  const [phone, setPhone] = useState(branchPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(branchName);
      setAddress(branchAddress);
      setPhone(branchPhone);
      setError('');
    }
  }, [visible, branchName, branchAddress, branchPhone]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Branch name is required.');
      return;
    }
    if (!address.trim()) {
      setError('Branch address is required.');
      return;
    }
    setLoading(true);
    try {
      const updated = await AdminService.updateBranch(branchId, {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
      });
      onUpdated({
        name: updated.name,
        address: updated.address,
        phone: updated.phone,
      });
      onClose();
    } catch (err) {
      setError('Unable to update branch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // On web: centered dialog. On native: bottom sheet.
  const overlayStyle = isWeb ? centeredOverlay : bottomSheetOverlay;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={overlayStyle}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            style={[
              ebm.sheet,
              isWeb && ebm.webDialog,
              { backgroundColor: colors.surface },
            ]}
          >
            {/* Handle — native only */}
            {!isWeb && (
              <View style={[ebm.handle, { backgroundColor: colors.border }]} />
            )}

            <View style={[ebm.header, { borderBottomColor: colors.border }]}>
              <Text style={[ebm.title, { color: colors.text }]}>
                Edit Branch
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={ebm.body}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[ebm.label, { color: colors.textSecondary }]}>
                Branch Name *
              </Text>
              <TextInput
                style={[
                  ebm.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Branch name"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[ebm.label, { color: colors.textSecondary }]}>
                Address *
              </Text>
              <TextInput
                style={[
                  ebm.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                value={address}
                onChangeText={setAddress}
                placeholder="Branch address"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={[ebm.label, { color: colors.textSecondary }]}>
                Phone
              </Text>
              <TextInput
                style={[
                  ebm.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Contact phone"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
              {error ? (
                <Text style={{ color: colors.error, marginTop: 8 }}>
                  {error}
                </Text>
              ) : null}
              <TouchableOpacity
                style={[
                  ebm.saveBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={ebm.saveTxt}>
                  {loading ? 'Updating…' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Outlet Card ───────────────────────────────────────────────────────────────

function OutletCard({
  outlet,
  revenue,
  colors,
  onPress,
  getStatusColor,
}: {
  outlet: AdminOutlet;
  revenue: OutletRevenue | undefined;
  colors: any;
  onPress: () => void;
  getStatusColor: (s: string) => string;
}) {
  const statusColor = getStatusColor(outlet.status);
  if (__DEV__) console.log('outlet.bannerImage:', outlet.name, outlet.bannerImage);
  return (
    <TouchableOpacity
      style={[ols.outletCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {outlet.bannerImage ? (
        <Image
          source={{ uri: outlet.bannerImage }}
          style={{
            width: '100%',
            height: 120,
            borderRadius: 10,
            marginBottom: 10,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 120,
            borderRadius: 10,
            backgroundColor: colors.border,
            marginBottom: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.textSecondary }}>No image</Text>
        </View>
      )}
      <View style={ols.outletHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[ols.outletName, { color: colors.text }]}>
            {outlet.name}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: 4,
            }}
          >
            <View
              style={[
                ols.typeBadge,
                { backgroundColor: colors.primary + '18' },
              ]}
            >
              <Text style={[ols.typeText, { color: colors.primary }]}>
                {outlet.outletType}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Circle size={10} color={statusColor} fill={statusColor} />
          <Text style={[ols.statusText, { color: statusColor }]}>
            {outlet.status.charAt(0).toUpperCase() + outlet.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={[ols.statsRow, { backgroundColor: colors.background }]}>
        <View style={ols.statItem}>
          <PhilippinePeso size={14} color={colors.success} strokeWidth={2} />
          <Text style={[ols.statVal, { color: colors.text }]}>
            ₱{(revenue?.totalRevenue ?? 0).toLocaleString()}
          </Text>
          <Text style={[ols.statLbl, { color: colors.textSecondary }]}>
            Revenue
          </Text>
        </View>
        <View style={ols.statItem}>
          <MapPin size={14} color={colors.accent} strokeWidth={2} />
          <Text style={[ols.statVal, { color: colors.text }]}>
            {revenue?.transactionCount ?? 0}
          </Text>
          <Text style={[ols.statLbl, { color: colors.textSecondary }]}>
            Transactions
          </Text>
        </View>
        <View style={ols.statItem}>
          <Users size={14} color={colors.primary} strokeWidth={2} />
          <Text style={[ols.statVal, { color: colors.text }]}>
            {outlet.currentCashiers.length}
          </Text>
          <Text style={[ols.statLbl, { color: colors.textSecondary }]}>
            Active Staff
          </Text>
        </View>
      </View>
      <View style={[ols.footer, { borderTopColor: colors.border }]}>
        <Text style={[ols.viewDetails, { color: colors.primary }]}>
          View Details →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function OutletListScreen() {
  const { branchId, branchName } = useLocalSearchParams<{
    branchId: string;
    branchName: string;
  }>();
  const { colors } = useTheme();
  const socket = useWebSocket();
  const { checkOutlet, renderGuardModal } = useLimitGuard();
  const grid = useResponsiveGrid();

  const [outlets, setOutlets] = useState<AdminOutlet[]>([]);
  const [outletRevenues, setOutletRevenues] = useState<
    Record<string, OutletRevenue>
  >({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DateRangeFilter>('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editBranchModalOpen, setEditBranchModalOpen] = useState(false);
  const [currentBranchName, setCurrentBranchName] = useState(branchName ?? '');
  const [currentBranchAddress, setCurrentBranchAddress] = useState('');
  const [currentBranchPhone, setCurrentBranchPhone] = useState('');

  useEffect(() => {
    if (!socket) return;
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'NEW_TRANSACTION') {
        const { outletId, total } = data.payload;
        setOutletRevenues((prev) => ({
          ...prev,
          [outletId]: {
            ...prev[outletId],
            totalRevenue: (prev[outletId]?.totalRevenue || 0) + total,
          },
        }));
      }
    };
  }, [socket]);

  const loadOutlets = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(
        activeFilter,
        customStart,
        customEnd,
      );
      const branchData = await AdminService.getBranchById(branchId);
      if (branchData) {
        setCurrentBranchName(branchData.name || branchName || '');
        setCurrentBranchAddress(branchData.address || '');
        setCurrentBranchPhone(branchData.phone || '');
      }
      const outletData = await AdminService.getOutletsByBranch(branchId);
      setOutlets(outletData);
      const revenueResults = await Promise.all(
        outletData.map(async (o) => ({
          outletId: o.id,
          revenue: await AdminService.getOutletRevenue(
            o.id,
            startDate,
            endDate,
          ),
        })),
      );
      setOutletRevenues(
        revenueResults.reduce(
          (acc, { outletId, revenue }) => {
            acc[outletId] = revenue;
            return acc;
          },
          {} as Record<string, OutletRevenue>,
        ),
      );
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [branchId, activeFilter, customStart, customEnd]);

  useEffect(() => {
    if (branchId) loadOutlets();
  }, [loadOutlets]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOutlets();
    setRefreshing(false);
  };

  const handleAddOutlet = async (data: OutletFormData) => {
    try {
      const newOutlet = await AdminService.createOutlet(branchId!, {
        name: data.name,
        address: data.address,
        phone: data.phone,
        outletType: data.outletType,
        status: data.status,
        code: data.code,
        governmentTax: parseFloat(data.governmentTax) || 0,
        serviceCharge: parseFloat(data.serviceCharge) || 0,
        latitude: data.latitude,
        longitude: data.longitude,
        bannerImage: data.bannerImage,
        wifiSSID: data.wifiSSID,
        isActive: data.isActive,
        tin: data.tin,
        ptu: data.ptu,
        bir: data.bir,
        isVatRegistered: data.isVatRegistered,
        vatZeroSale: data.vatZeroSale ? parseFloat(data.vatZeroSale) : undefined,
        vatTypeId: data.vatTypeId,
        outletPromos: data.outletPromos,
      });
      setOutlets((prev) => [
        ...prev,
        { ...newOutlet, bannerImagePath: data.bannerImagePath },
      ]);
    } catch (error) {
      if (__DEV__) console.error('Failed to create outlet:', error);
      throw error;
    }
  };

  const openAddModal = () => {
    if (!checkOutlet(outlets.length)) return;
    setAddModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    if (status === 'open') return colors.success;
    if (status === 'closed') return colors.error;
    if (status === 'maintenance') return colors.warning;
    return colors.textSecondary;
  };

  const skeletonData = [1, 2, 3, 4, 5, 6];

  const renderOutletItem = ({ item }: ListRenderItemInfo<AdminOutlet>) => (
    <View style={{ flex: 1, padding: grid.screenPadding / 2 }}>
      <OutletCard
        outlet={item}
        revenue={outletRevenues[item.id]}
        colors={colors}
        getStatusColor={getStatusColor}
        onPress={() =>
          router.push({
            pathname: '/(erp)/outlet-detail',
            params: {
              outletId: item.id,
              outletName: item.name,
              branchName,
              branchId,
            },
          })
        }
      />
    </View>
  );

  const renderSkeletonItem = ({ item }: ListRenderItemInfo<number>) => (
    <View style={{ flex: 1, padding: grid.screenPadding / 2 }}>
      <SkeletonOutletCard colors={colors} />
    </View>
  );

  return (
    <SafeAreaView
      style={[ols.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          ols.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[ols.backBtn, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[ols.title, { color: colors.text }]}>
            {currentBranchName}
          </Text>
          <Text style={[ols.subtitle, { color: colors.textSecondary }]}>
            Outlets Overview
          </Text>
        </View>
        <TouchableOpacity
          style={[
            ols.editBtn,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          onPress={() => setEditBranchModalOpen(true)}
          activeOpacity={0.8}
        >
          <Edit2 size={15} color={colors.primary} strokeWidth={2} />
          <Text style={[ols.editBtnTxt, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Centred content wrapper */}
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: grid.maxContentWidth,
        }}
      >
        {/* Date filters */}
        <View
          style={[
            ols.filterContainer,
            {
              backgroundColor: colors.card,
              marginHorizontal: grid.screenPadding,
            },
          ]}
        >
          {FILTERS.map((filter) => {
            const { label } = getDateRange(filter, customStart, customEnd);
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  ols.filterTab,
                  isActive && { backgroundColor: colors.primary },
                ]}
                onPress={() =>
                  filter === 'custom'
                    ? setShowDatePicker(true)
                    : setActiveFilter(filter)
                }
              >
                <Text
                  style={[
                    ols.filterTabText,
                    { color: isActive ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <DateRangePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onApply={(s, e) => {
            setCustomStart(s);
            setCustomEnd(e);
            setActiveFilter('custom');
          }}
          initialStart={customStart}
          initialEnd={customEnd}
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: grid.screenPadding,
            marginBottom: 4,
            marginTop: 8,
          }}
        >
          <Text style={[ols.sectionTitle, { color: colors.text }]}>
            {outlets.length} Outlet{outlets.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {loading && outlets.length === 0 ? (
          <FlatList
            key={`skeleton-${grid.cols}`}
            data={skeletonData}
            keyExtractor={(item) => `skel-${item}`}
            renderItem={renderSkeletonItem}
            numColumns={grid.cols}
            contentContainerStyle={{
              paddingHorizontal: grid.screenPadding / 2,
              paddingBottom: 100,
            }}
            scrollEnabled={false}
          />
        ) : (
          <FlatList
            key={`outlets-${grid.cols}`}
            data={outlets}
            keyExtractor={(item) => item.id}
            renderItem={renderOutletItem}
            numColumns={grid.cols}
            contentContainerStyle={{
              paddingHorizontal: grid.screenPadding / 2,
              paddingBottom: 100,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={[ols.fab, { backgroundColor: colors.primary }]}
        onPress={openAddModal}
        activeOpacity={0.88}
      >
        <Plus size={22} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      <AddOutletModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddOutlet}
        colors={colors}
        branchName={currentBranchName}
      />
      <EditBranchModal
        visible={editBranchModalOpen}
        onClose={() => setEditBranchModalOpen(false)}
        branchId={branchId}
        branchName={currentBranchName}
        branchAddress={currentBranchAddress}
        branchPhone={currentBranchPhone}
        onUpdated={(branch) => {
          setCurrentBranchName(branch.name);
          setCurrentBranchAddress(branch.address);
          setCurrentBranchPhone(branch.phone || '');
        }}
        colors={colors}
      />
      {renderGuardModal()}
    </SafeAreaView>
  );
}

const ols = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtnTxt: { fontSize: 13, fontWeight: '600' },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabText: { fontSize: 12, fontWeight: '500' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  outletCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 0,
    elevation: 2,
    flex: 1,
  },
  outletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  outletName: { fontSize: 16, fontWeight: '700' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 12,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statVal: { fontSize: 16, fontWeight: '800' },
  statLbl: { fontSize: 11 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  viewDetails: { fontSize: 13, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

const ebm = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%' as any,
  },
  // Web-only: centered dialog
  webDialog: {
    borderRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: 480,
    maxWidth: '90vw' as any,
    maxHeight: '85vh' as any,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 32 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 5,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 4,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
