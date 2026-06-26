// screens/(erp)/outlet-detail.tsx
// Responsive: staff/inventory use 4/3/2/1 grid; transactions always 1 column.

import TransactionDetailModal from '@/components/TransactionDetailModal';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Animated,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  ArrowLeft,
  User,
  ShoppingCart,
  Users,
  Package,
  Plus,
  X,
  Search,
  Edit2,
  LayoutGrid,
  Table,
  TrendingUp,
  PhilippinePeso,
  ChevronLeft,
  ChevronRight,
  Check,
  UserPlus,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { AdminService } from '@/services/ManagerService';
import { AuthService } from '@/services/authService';
import { HrService } from '@/services/hrService';
import { AdminTransaction, Cashier, OutletRevenue } from '@/types';
import { DateRangeFilter, getDateRange } from '@/utils/dateHelpers';
import { useTheme } from '@/contexts/ThemeContext';
import { DropdownField } from './branch';
import { formatPeso } from '@/utils/moneyHelpers';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { aom, FILTERS } from './outlets';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddInventoryItemModal from '@/components/AddInventoryItemModal';
import { useAuth } from '@/contexts/AuthContext';
import { MediaService } from '@/services/mediaService';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { gql } from 'graphql-request';
import { getGraphQLClient } from '@/utils/constants';
import { VatTypeItem, VatTypeService } from '@/services/vatTypeService';
import { PromoTypeItem, PromoTypeService } from '@/services/promoTypeService';
import {
  OutletPromoItem,
  OutletPromoService,
} from '@/services/outletPromoService';

type Tab = 'overview' | 'inventory' | 'staff';
type TxnView = 'card' | 'table';
type InventoryView = 'grid' | 'table';

const TXN_PAGE_SIZE = 10;
const isWeb = Platform.OS === 'web';

// ─── Overlay styles ────────────────────────────────────────────────────────────

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

const showAlert = (title: string, message: string) => {
  if (isWeb) {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// ─── Skeleton pulse ────────────────────────────────────────────────────────────

function SkeletonPulse({ style, colors }: { style: any; colors: any }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[{ backgroundColor: colors.border, borderRadius: 6, opacity: anim }, style]}
    />
  );
}

// ─── Edit Outlet Modal ─────────────────────────────────────────────────────────

function EditOutletModal({
  visible, onClose, outletName, outletId, outletBannerImage,
  outletBannerImagePath, outletData, onUpdated, onSuccess, colors,
}: {
  visible: boolean; onClose: () => void; outletName: string; outletId: string;
  outletBannerImage?: string; outletBannerImagePath?: string; outletData?: any;
  onUpdated?: (bannerImage?: string, bannerImagePath?: string) => void;
  onSuccess?: () => void; colors: any;
}) {
  const [outletPromos, setOutletPromos] = useState<OutletPromoItem[]>([]);
  const [name, setName] = useState(outletName);
  const [bannerImage, setBannerImage] = useState(outletBannerImage || '');
  const [bannerImagePath, setBannerImagePath] = useState(outletBannerImagePath || '');
  const [bannerImageFile, setBannerImageFile] = useState<any>(null);
  const [address, setAddress] = useState(outletData?.address || '');
  const [phone, setPhone] = useState(outletData?.phone || '');
  const [latitude, setLatitude] = useState(outletData?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(outletData?.longitude?.toString() || '');
  const [type, setType] = useState(outletData?.outletType || 'retail');
  const [status, setStatus] = useState(outletData?.status || 'open');
  const [isActive, setIsActive] = useState(outletData?.isActive ?? true);
  const [govTax, setGovTax] = useState(outletData?.governmentTax?.toString() || '');
  const [svcChg, setSvcChg] = useState(outletData?.serviceCharge?.toString() || '');
  const [code, setCode] = useState(outletData?.code || '');
  const [wifiSSID, setWifiSSID] = useState(outletData?.wifiSSID || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vatTypes, setVatTypes] = useState<VatTypeItem[]>([]);
  const [promoTypes, setPromoTypes] = useState<PromoTypeItem[]>([]);
  const [tin, setTin] = useState('');
  const [ptu, setPtu] = useState('');
  const [bir, setBir] = useState('');
  const [isVatRegistered, setIsVatRegistered] = useState(false);
  const [vatZeroSale, setVatZeroSale] = useState('');
  const [vatTypeId, setVatTypeId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (visible && outletData) {
      setName(outletData.name || outletName);
      setBannerImage(outletBannerImage || '');
      setBannerImagePath(outletBannerImagePath || '');
      setBannerImageFile(null);
      setAddress(outletData.address || '');
      setPhone(outletData.phone || '');
      setLatitude(outletData.latitude?.toString() || '');
      setLongitude(outletData.longitude?.toString() || '');
      setType(outletData.outletType || 'retail');
      setStatus(outletData.status || 'open');
      setIsActive(outletData.isActive ?? true);
      setGovTax(outletData.governmentTax?.toString() || '');
      setSvcChg(outletData.serviceCharge?.toString() || '');
      setCode(outletData.code || '');
      setWifiSSID(outletData.wifiSSID || '');
      VatTypeService.getAll().then(setVatTypes);
      PromoTypeService.getAll().then(setPromoTypes);
      setTin(outletData.tin || '');
      setPtu(outletData.ptu || '');
      setBir(outletData.bir || '');
      setIsVatRegistered(outletData.isVatRegistered ?? false);
      setVatZeroSale(outletData.vatZeroSale?.toString() || '');
      setVatTypeId(outletData.vatTypeId ?? undefined);
      OutletPromoService.getByOutlet(Number(outletId)).then(setOutletPromos);
    }
  }, [visible, outletData, outletName, outletBannerImage, outletBannerImagePath]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { alert('Media library permission needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setBannerImage(asset.uri);
      setBannerImageFile((asset as any).file ?? null);
      setBannerImagePath('');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { alert('Camera permission needed.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setBannerImage(asset.uri);
      setBannerImageFile((asset as any).file ?? null);
      setBannerImagePath('');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Outlet name is required.'); return; }
    setLoading(true);
    try {
      let finalBannerImage = bannerImage;
      let finalBannerImagePath = bannerImagePath;
      const isLocalImage = finalBannerImage && !finalBannerImage.startsWith('http');
      if (isLocalImage) {
        const user = await AuthService.getCurrentUser();
        if (!user?.orgId) throw new Error('Organization identifier not found.');
        if (bannerImagePath) {
          const updated = await MediaService.updateMedia(
            { uri: finalBannerImage, name: `outlet_${Date.now()}.jpg`, type: 'image/jpeg', file: bannerImageFile },
            bannerImagePath, String(user.orgId),
          );
          finalBannerImage = updated?.publicUrl;
          finalBannerImagePath = updated?.filePath;
        } else {
          const uploaded = await MediaService.uploadMedia(
            { uri: finalBannerImage, name: `outlet_${Date.now()}.jpg`, type: 'image/jpeg', file: bannerImageFile },
            String(user.orgId),
          );
          finalBannerImage = uploaded.publicUrl;
          finalBannerImagePath = uploaded.filePath;
        }
      }
      await AdminService.updateOutlet(outletId, {
        name: name.trim(), address: address.trim() || undefined,
        phone: phone.trim() || undefined, code: code.trim() || undefined,
        outletType: type as any, status: status as any,
        governmentTax: govTax ? parseFloat(govTax) : undefined,
        serviceCharge: svcChg ? parseFloat(svcChg) : undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        bannerImage: finalBannerImage || undefined,
        wifiSSID: wifiSSID.trim() || undefined, isActive,
        tin: tin.trim() || undefined, ptu: ptu.trim() || undefined,
        bir: bir.trim() || undefined, isVatRegistered,
        vatZeroSale: vatZeroSale ? parseFloat(vatZeroSale) : undefined,
        vatTypeId: vatTypeId ?? undefined,
        outletPromos: outletPromos.map((p) => ({
          promoTypeId: p.promoTypeId, discount: p.discount, isActive: p.isActive ?? true,
        })),
      });
      if (onUpdated) onUpdated(finalBannerImage, finalBannerImagePath);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update outlet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const overlayStyle = isWeb ? centeredOverlay : bottomSheetOverlay;
  const sheetStyle = isWeb
    ? [eom.sheet, eom.webDialog, { backgroundColor: colors.surface }]
    : [eom.sheet, { backgroundColor: colors.surface, maxWidth: 600, width: '100%' as any }];

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={overlayStyle}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={sheetStyle}>
            {!isWeb && <View style={[eom.handle, { backgroundColor: colors.border }]} />}
            <View style={[eom.header, { borderBottomColor: colors.border }]}>
              <Text style={[eom.title, { color: colors.text }]}>Edit Outlet</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={eom.body} keyboardShouldPersistTaps="handled">
              {[
                ['OUTLET NAME *', name, setName, 'e.g. Main Street Outlet', false],
                ['ADDRESS', address, setAddress, 'Full address', true],
                ['PHONE', phone, setPhone, '+63 9XX XXX XXXX', false],
                ['CODE', code, setCode, 'Outlet code', false],
                ['WIFI SSID', wifiSSID, setWifiSSID, 'Network name', false],
              ].map(([label, val, setter, ph, multi]: any) => (
                <View key={label as string}>
                  <Text style={[eom.label, { color: colors.textSecondary }]}>{label as string}</Text>
                  <TextInput
                    style={[eom.input, multi && eom.textarea, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                    placeholder={ph as string} placeholderTextColor={colors.textSecondary}
                    value={val as string} onChangeText={setter}
                    multiline={multi as boolean} numberOfLines={multi ? 3 : 1}
                    textAlignVertical={multi ? 'top' : 'center'}
                  />
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[eom.label, { color: colors.textSecondary }]}>GOV. TAX %</Text>
                  <TextInput style={[eom.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                    placeholder="0.00" placeholderTextColor={colors.textSecondary}
                    value={govTax} onChangeText={setGovTax} keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[eom.label, { color: colors.textSecondary }]}>SERVICE CHARGE %</Text>
                  <TextInput style={[eom.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                    placeholder="0.00" placeholderTextColor={colors.textSecondary}
                    value={svcChg} onChangeText={setSvcChg} keyboardType="decimal-pad" />
                </View>
              </View>
              <DropdownField label="Outlet Type" value={type}
                options={[{ id: 'retail', label: 'retail' }, { id: 'wholesale', label: 'wholesale' }, { id: 'service', label: 'service' }]}
                onSelect={setType} colors={colors} />
              <DropdownField label="Status" value={status}
                options={[{ id: 'open', label: 'open' }, { id: 'closed', label: 'closed' }, { id: 'maintenance', label: 'maintenance' }]}
                onSelect={setStatus} colors={colors} />
              <View style={[aom.toggleRow, { borderColor: colors.border }]}>
                <View>
                  <Text style={[aom.toggleLabel, { color: colors.text }]}>Active</Text>
                  <Text style={[aom.toggleSub, { color: colors.textSecondary }]}>Outlet is visible and operational</Text>
                </View>
                <Switch value={isActive} onValueChange={setIsActive}
                  trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>
              <Text style={[eom.label, { color: colors.textSecondary }]}>LOCATION (optional)</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[eom.label, { color: colors.textSecondary, fontSize: 11 }]}>LATITUDE</Text>
                  <TextInput style={[eom.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                    placeholder="e.g. 14.5995" placeholderTextColor={colors.textSecondary}
                    value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[eom.label, { color: colors.textSecondary, fontSize: 11 }]}>LONGITUDE</Text>
                  <TextInput style={[eom.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                    placeholder="e.g. 120.9842" placeholderTextColor={colors.textSecondary}
                    value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" />
                </View>
              </View>
              <Text style={[eom.label, { color: colors.textSecondary, marginTop: 14 }]}>BANNER IMAGE (optional)</Text>
              {bannerImage ? (
                <View style={{ marginBottom: 12 }}>
                  <Image source={{ uri: bannerImage }} style={{ width: '100%', height: 140, borderRadius: 10, marginBottom: 8 }} resizeMode="cover"
                    defaultSource={require('@/assets/images/placeholder.png')} />
                  <TouchableOpacity onPress={() => { setBannerImage(''); setBannerImagePath(''); setBannerImageFile(null); }}>
                    <Text style={{ color: colors.error, fontSize: 12 }}>Remove image</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity onPress={pickImage} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ color: colors.primary }}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={takePhoto} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ color: colors.primary }}>Camera</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={[aom.section, { color: colors.textSecondary }]}>VAT & COMPLIANCE</Text>
              <View style={[aom.toggleRow, { borderColor: colors.border }]}>
                <View>
                  <Text style={[aom.toggleLabel, { color: colors.text }]}>VAT Registered</Text>
                  <Text style={[aom.toggleSub, { color: colors.textSecondary }]}>Outlet charges VAT on transactions</Text>
                </View>
                <Switch value={isVatRegistered ?? false} onValueChange={setIsVatRegistered}
                  trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
              </View>
              {isVatRegistered && (
                <>
                  <DropdownField label="VAT Type" value={vatTypes.find((v) => v.id === vatTypeId)?.name ?? ''}
                    options={vatTypes.map((v) => ({ id: String(v.id), label: v.name }))}
                    onSelect={(item) => setVatTypeId(Number(item.id))} colors={colors} />
                  <Text style={[eom.label, { color: colors.textSecondary }]}>VAT ZERO SALE %</Text>
                  <TextInput style={[aom.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                    placeholder="0.00" placeholderTextColor={colors.textSecondary}
                    value={vatZeroSale} onChangeText={setVatZeroSale} keyboardType="decimal-pad" />
                </>
              )}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {([['TIN', tin, setTin, '000-000-000-000'], ['PTU NO.', ptu, setPtu, 'Permit to Operate no.'], ['BIR ACCREDITATION', bir, setBir, 'BIR accreditation no.']] as [string, string, (v: string) => void, string][]).map(([label, val, setter, ph]) => (
                  <View style={{ flex: 1 }} key={label}>
                    <Text style={[eom.label, { color: colors.textSecondary }]}>{label}</Text>
                    <TextInput style={[eom.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                      placeholder={ph} placeholderTextColor={colors.textSecondary}
                      value={val} onChangeText={setter} autoCapitalize="characters" />
                  </View>
                ))}
              </View>
              <Text style={[aom.section, { color: colors.textSecondary }]}>PROMO DISCOUNTS</Text>
              <Text style={[aom.hint, { color: colors.textSecondary }]}>Configure which discount types this outlet accepts and their rates.</Text>
              {promoTypes.map((pt) => {
                const existing = outletPromos.find((p: any) => p.promoTypeId === pt.id);
                const isEnabled = !!existing;
                return (
                  <View key={pt.id} style={{ borderWidth: 1, borderColor: isEnabled ? colors.primary : colors.border, borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: isEnabled ? colors.primary + '08' : colors.background }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{pt.name}</Text>
                        {pt.description ? <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{pt.description}</Text> : null}
                      </View>
                      <Switch value={isEnabled} onValueChange={(val) => {
                        setOutletPromos((prev: any[]) => {
                          if (val) return [...prev, { promoTypeId: pt.id, discount: 0, isActive: true }];
                          return prev.filter((p) => p.promoTypeId !== pt.id);
                        });
                      }} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
                    </View>
                    {isEnabled && existing && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={[eom.label, { color: colors.textSecondary }]}>DISCOUNT %</Text>
                        <TextInput style={[eom.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, marginBottom: 0 }]}
                          placeholder="e.g. 20" placeholderTextColor={colors.textSecondary}
                          value={existing.discount === 0 ? '' : String(existing.discount)}
                          onChangeText={(v) => {
                            setOutletPromos((prev) => prev.map((p) => p.promoTypeId === pt.id ? { ...p, discount: parseFloat(v) || 0 } : p));
                          }} keyboardType="decimal-pad" />
                      </View>
                    )}
                  </View>
                );
              })}
              {error ? <Text style={{ fontSize: 12, color: colors.error, marginBottom: 8 }}>{error}</Text> : null}
              <TouchableOpacity style={[eom.saveBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={handleSave} disabled={loading} activeOpacity={0.85}>
                <Text style={eom.saveTxt}>{loading ? 'Saving…' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const eom = StyleSheet.create({
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' as any },
  webDialog: { borderRadius: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, width: 600, maxWidth: '90vw' as any, maxHeight: '85vh' as any, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '800' },
  body: { padding: 20, paddingBottom: 32 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 5, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginBottom: 4 },
  textarea: { minHeight: 70, paddingTop: 10 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Create Staff Modal ────────────────────────────────────────────────────────

function CreateStaffModal({ visible, onClose, onCreated, colors }: { visible: boolean; onClose: () => void; onCreated: (staff: Cashier) => void; colors: any; }) {
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<{ id: string; label: string }>({ id: 'CASHIER', label: 'CASHIER' });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!fullname.trim()) { setError('Full name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!username.trim()) { setError('Username is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const mock: Cashier = { id: `u_${Date.now()}`, fullname: fullname.trim(), email: email.trim(), isActive: false, outletId: '' };
      onCreated(mock);
      setFullname(''); setEmail(''); setUsername(''); setPassword(''); setError('');
      onClose();
    } catch { setError('Failed to create user.'); } finally { setLoading(false); }
  };

  const overlayStyle = isWeb ? centeredOverlay : bottomSheetOverlay;
  const sheetStyle = isWeb
    ? [csm2.sheet, csm2.webDialog, { backgroundColor: colors.surface }]
    : [csm2.sheet, { backgroundColor: colors.surface, maxWidth: 560, width: '100%' as any }];

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={overlayStyle}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={sheetStyle}>
            {!isWeb && <View style={[csm2.handle, { backgroundColor: colors.border }]} />}
            <View style={[csm2.header, { borderBottomColor: colors.border }]}>
              <Text style={[csm2.title, { color: colors.text }]}>Create New Staff</Text>
              <TouchableOpacity onPress={onClose}><X size={20} color={colors.textSecondary} strokeWidth={2} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {[
                ['FULL NAME *', fullname, setFullname, 'e.g. Maria Santos', 'default', false],
                ['EMAIL *', email, setEmail, 'm.santos@store.com', 'email-address', false],
                ['USERNAME *', username, setUsername, 'msantos', 'default', false],
                ['PASSWORD *', password, setPassword, 'Min. 6 characters', 'default', true],
              ].map(([label, val, setter, ph, kb, secure]: any) => (
                <View key={label as string}>
                  <Text style={[csm2.label, { color: colors.textSecondary }]}>{label as string}</Text>
                  <TextInput style={[csm2.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                    placeholder={ph as string} placeholderTextColor={colors.textSecondary}
                    value={val as string} onChangeText={setter} keyboardType={kb as any}
                    autoCapitalize="none" secureTextEntry={!!secure} />
                </View>
              ))}
              <DropdownField label="Role" value={role.label}
                options={[{ id: 'CASHIER', label: 'CASHIER' }, { id: 'STAFF', label: 'STAFF' }, { id: 'MANAGER', label: 'MANAGER' }]}
                onSelect={setRole} colors={colors} />
              {error ? <Text style={{ fontSize: 12, color: colors.error, marginTop: 6 }}>{error}</Text> : null}
              <TouchableOpacity style={[csm2.btn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={handleCreate} disabled={loading} activeOpacity={0.85}>
                <Text style={csm2.btnTxt}>{loading ? 'Creating…' : 'Create Staff Account'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const csm2 = StyleSheet.create({
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' as any, paddingBottom: 32 },
  webDialog: { borderRadius: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, width: 480, maxWidth: '90vw' as any, maxHeight: '85vh' as any, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  btnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Assign Staff Modal ────────────────────────────────────────────────────────

function AssignStaffModal({ visible, onClose, onAssigned, colors, outletId, alreadyAssigned }: { visible: boolean; onClose: () => void; onAssigned: () => void; colors: any; outletId: string; alreadyAssigned: Cashier[]; }) {
  const [query, setQuery] = useState('');
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setSelected([]); setError(''); setLoading(true);
    HrService.getAllStaffs().then(setAllStaff).catch(() => setError('Failed to load staff.')).finally(() => setLoading(false));
  }, [visible]);

  const filtered = allStaff.filter((s) => !query.trim() || s.fullname.toLowerCase().includes(query.toLowerCase()) || s.email?.toLowerCase().includes(query.toLowerCase()));
  const isAssigned = (id: string) => alreadyAssigned.some((a) => a.id === id);
  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleConfirm = async () => {
    if (selected.length === 0) return;
    setSaving(true); setError('');
    try {
      await AdminService.assignStaffToOutlet(outletId, selected.map((userId) => ({ userId: Number(userId), role: 'CASHIER' })));
      onAssigned(); onClose();
    } catch (e: any) { setError(e?.message || 'Failed to assign staff.'); } finally { setSaving(false); }
  };

  const overlayStyle = isWeb ? centeredOverlay : bottomSheetOverlay;
  const sheetStyle = isWeb
    ? [asm2.sheet, asm2.webDialog, { backgroundColor: colors.surface }]
    : [asm2.sheet, { backgroundColor: colors.surface, maxWidth: 560, width: '100%' as any }];

  return (
    <Modal visible={visible} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={overlayStyle}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={sheetStyle}>
          {!isWeb && <View style={[asm2.handle, { backgroundColor: colors.border }]} />}
          <View style={[asm2.header, { borderBottomColor: colors.border }]}>
            <Text style={[asm2.title, { color: colors.text }]}>Assign Staff to Outlet</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.textSecondary} strokeWidth={2} /></TouchableOpacity>
          </View>
          <View style={[asm2.searchRow, { borderBottomColor: colors.border }]}>
            <View style={[asm2.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Search size={13} color={colors.textSecondary} strokeWidth={2} />
              <TextInput style={[asm2.searchInput, { color: colors.text }]} placeholder="Search by name or email…"
                placeholderTextColor={colors.textSecondary} value={query} onChangeText={setQuery} autoCorrect={false} />
              {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><X size={13} color={colors.textSecondary} strokeWidth={2} /></TouchableOpacity>}
            </View>
          </View>
          <FlatList data={filtered} keyExtractor={(i) => i.id.toString()} style={{ maxHeight: 320 }}
            ListEmptyComponent={<View style={{ padding: 24, alignItems: 'center' }}><Text style={{ fontSize: 13, color: colors.textSecondary }}>{loading ? 'Loading staff…' : 'No staff found'}</Text></View>}
            renderItem={({ item }) => {
              const assigned = isAssigned(item.id.toString());
              const checked = selected.includes(item.id.toString());
              return (
                <TouchableOpacity style={[asm2.resultRow, { borderBottomColor: colors.border, opacity: assigned ? 0.5 : 1 }]}
                  onPress={() => !assigned && toggle(item.id.toString())} disabled={assigned} activeOpacity={0.75}>
                  <View style={[asm2.avatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{item.fullname.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[asm2.resultName, { color: colors.text }]}>{item.fullname}</Text>
                    <Text style={[asm2.resultEmail, { color: colors.textSecondary }]}>{item.email}</Text>
                  </View>
                  {assigned ? (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>Assigned</Text>
                  ) : (
                    <View style={[asm2.checkbox, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : 'transparent' }]}>
                      {checked && <Check size={14} color="#fff" strokeWidth={3} />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            }} />
          {error ? <Text style={{ color: colors.error, fontSize: 12, paddingHorizontal: 20, paddingTop: 8 }}>{error}</Text> : null}
          <View style={[asm2.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[asm2.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[asm2.confirmBtn, { backgroundColor: selected.length > 0 ? colors.primary : colors.border }]}
              onPress={handleConfirm} disabled={selected.length === 0 || saving}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Assigning…' : `Assign ${selected.length} Staff`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const asm2 = StyleSheet.create({
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  webDialog: { borderRadius: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, width: 520, maxWidth: '90vw' as any, maxHeight: '85vh' as any, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 24 },
  footer: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '800' },
  searchRow: { flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: 1 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 13 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  resultName: { fontSize: 14, fontWeight: '600' },
  resultEmail: { fontSize: 12, marginTop: 1 },
  assignTxt: { fontSize: 13, fontWeight: '700' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function OutletDetailScreen() {
  const { outletId, outletName, branchName, branchId } = useLocalSearchParams<{
    outletId: string; outletName: string; branchName: string; branchId: string;
  }>();
  const { colors } = useTheme();
  const grid = useResponsiveGrid();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [currentCashiers, setCurrentCashiers] = useState<Cashier[]>([]);
  const [assignedStaff, setAssignedStaff] = useState<Cashier[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [outletItems, setOutletItems] = useState<any[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingInventoryItemId, setEditingInventoryItemId] = useState<string | undefined>();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignItemsModal, setShowAssignItemsModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
  const [txnView, setTxnView] = useState<TxnView>('card');
  // ── NEW: inventoryView state ──────────────────────────────────────────────
  const [inventoryView, setInventoryView] = useState<InventoryView>('grid');
  const [txnPage, setTxnPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<DateRangeFilter>('this_week');
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [outletBannerImage, setOutletBannerImage] = useState<string>('');
  const [outletBannerImagePath, setOutletBannerImagePath] = useState<string>('');
  const [outletData, setOutletData] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [outletRevenue, setOutletRevenue] = useState<OutletRevenue | null>(null);
  const [returnTarget, setReturnTarget] = useState<AdminTransaction | null>(null);
  const [returnItems, setReturnItems] = useState<Record<string, { qty: string; isResellable: boolean; reason: string }>>({});
  const [returning, setReturning] = useState(false);
  const [restockTarget, setRestockTarget] = useState<any>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockReason, setRestockReason] = useState('');
  const [restocking, setRestocking] = useState(false);
  const [restockNotice, setRestockNotice] = useState<string | null>(null);

  const handleReturn = async () => {
    if (!returnTarget) return;
    const items = Object.entries(returnItems)
      .filter(([_, v]) => parseFloat(v.qty) > 0)
      .map(([itemId, v]) => ({ itemId: parseInt(itemId), quantity: parseFloat(v.qty), isResellable: v.isResellable, reason: v.reason || undefined }));
    if (items.length === 0) return;
    setReturning(true);
    try {
      const MUTATION = gql`mutation ProcessCustomerReturn($transactionId: Int!, $outletId: Int!, $items: [ReturnItemInput!]!) { processCustomerReturn(transactionId: $transactionId, outletId: $outletId, items: $items) { success } }`;
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      await client.request(MUTATION, { transactionId: parseInt(returnTarget.id), outletId: parseInt(outletId), items }, { Authorization: `Bearer ${accessToken}` });
      showAlert('Success', 'Return processed successfully');
      setReturnTarget(null); setReturnItems({});
      await loadData();
    } catch (e: any) { showAlert('Error', e?.message || 'Failed to process return'); } finally { setReturning(false); }
  };

  useEffect(() => { if (outletId) loadData(); }, [outletId, activeFilter]);

  useEffect(() => {
    if (!restockNotice) return;
    const timer = setTimeout(() => setRestockNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [restockNotice]);

  // ── Load saved inventory view preference (web/tablet only) ─────────────────
  useEffect(() => {
    if (isWeb && grid.cols > 1) {
      AsyncStorage.getItem('inventory_view_pref').then((saved) => {
        if (saved === 'grid' || saved === 'table') setInventoryView(saved);
      });
    }
  }, [isWeb, grid.cols]);

  // ── Save inventory view preference on change (web/tablet only) ─────────────
  useEffect(() => {
    if (isWeb && grid.cols > 1) {
      AsyncStorage.setItem('inventory_view_pref', inventoryView);
    }
  }, [inventoryView, isWeb, grid.cols]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setOutletItems([]);
      setAssignedStaff([]);
      const { startDate, endDate } = getDateRange(activeFilter);
      if (!user?.orgId) return null;
      const [cashiers, txns, allStaff, revenue, outletItemsData, availableStaffData] = await Promise.all([
        AdminService.getCurrentCashiers(outletId),
        AdminService.getRecentTransactions(outletId, 50, 0, startDate, endDate),
        AdminService.getCashiersByOutlet(outletId),
        AdminService.getOutletRevenue(outletId, startDate, endDate),
        AdminService.getItemsByOutlet(outletId),
        HrService.getAllStaffs(),
      ]);
      const outletDetails = await AdminService.getOutletById(outletId);
      setCurrentCashiers(cashiers);
      setTransactions(txns);
      setAssignedStaff(allStaff);
      setOutletRevenue(revenue);
      setOutletItems(outletItemsData);
      setAvailableStaff(availableStaffData);
      setTxnPage(1);

      if (outletDetails) {
        setOutletBannerImage(outletDetails.bannerImage || '');
        setOutletBannerImagePath((outletDetails as any).bannerImagePath || '');
        setOutletData(outletDetails);
      }
    } finally { setLoading(false); }
  }, [outletId, activeFilter]);

  const handleRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  useEffect(() => { if (isFocused && outletId) loadData(); }, [isFocused, outletId, loadData]);

  const handleAssignItems = async () => {
    try {
      await AdminService.assignItemsToOutlet(outletId, selectedItems, itemQuantities, itemPrices);
      setSelectedItems([]); setItemQuantities({}); setItemPrices({});
      setShowAssignItemsModal(false);
      await loadData();
    } catch (error) { console.error('Failed to assign items:', error); }
  };
  if (__DEV__) {
    console.log('Outlet Items Data', outletItems)
  }
  const handleRestock = async () => {
    if (!restockTarget || !restockQty) return;
    setRestocking(true);
    try {
      const MUTATION = gql`mutation RestockOutlet($inventoryItemId: Int!, $quantity: Float!, $reason: String) { restockOutlet(inventoryItemId: $inventoryItemId, quantity: $quantity, reason: $reason) { inventoryItem { id quantity } wasOverWarehouse warehouseStockBefore } }`;
      const { accessToken } = await AuthService.getTokens();
      const client = await getGraphQLClient();
      const res = (await client.request(MUTATION, { inventoryItemId: restockTarget.id, quantity: parseFloat(restockQty), reason: restockReason || undefined }, { Authorization: `Bearer ${accessToken}` })) as any;
      const { wasOverWarehouse, warehouseStockBefore } = res.restockOutlet;
      setRestockTarget(null); setRestockQty(''); setRestockReason('');
      await loadData();
      if (wasOverWarehouse) {
        setRestockNotice(`Restocked successfully, but this exceeded unallocated warehouse stock (${warehouseStockBefore}). Item stock may need review.`);
      } else { setRestockNotice(null); }
    } catch (e: any) { showAlert('Error', e?.message || 'Failed to restock'); } finally { setRestocking(false); }
  };

  const totalPages = Math.max(1, Math.ceil(transactions.length / TXN_PAGE_SIZE));
  const pagedTxns = transactions.slice((txnPage - 1) * TXN_PAGE_SIZE, txnPage * TXN_PAGE_SIZE);
  const maxRestock = restockTarget?.item?.remainingStock ?? Infinity;
  const restockQtyNum = parseFloat(restockQty) || 0;
  const restockExceedsMax = restockQtyNum > maxRestock;

  const handleBack = () => {
    if (branchId) router.push({ pathname: '/(erp)/outlets', params: { branchId, branchName } });
    else router.back();
  };

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: ShoppingCart },
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'staff', label: 'Staff', icon: Users },
  ];

  // ── RENDER INVENTORY GRID CARD ────────────────────────────────────────────
  const renderInventoryItem = ({ item }: { item: any }) => {
    const defaultUnit = item.units?.find((u: any) => u.isDefault) ?? item.units?.[0];
    const reorderPoint = defaultUnit?.reorderPoint ?? 0;
    const isLow = reorderPoint > 0 && item.quantity <= reorderPoint;
    const isHealthy = !isLow && reorderPoint > 0;
    const unitsList = item.units && item.units.length > 0
      ? (item.units as any[]).map((u: any) => u.unitName).join(', ')
      : '';

    return (
      <View
        style={{
          width: 320,
          padding: 6,
        }}
      >
        <TouchableOpacity
          style={[
            invSt.card,
            {
              backgroundColor: colors.card,
              borderColor: isLow ? colors.error + '80' : isHealthy ? colors.success + '50' : colors.border,
            },
          ]}
          onPress={() => { setEditingInventoryItemId(item.id.toString()); setShowAddItemModal(true); }}
          activeOpacity={0.75}
        >
          {/* Thumbnail */}
          <View style={invSt.imageBox}>
            {item.item?.image ? (
              <Image source={{ uri: item.item.image }} style={invSt.image} resizeMode="cover"
                defaultSource={require('@/assets/images/placeholder.png')} />
            ) : (
              <View style={[invSt.imagePlaceholder, { backgroundColor: colors.border + '30' }]}>
                <Package size={22} color={colors.textSecondary} strokeWidth={1.5} />
              </View>
            )}
            {/* Status ribbon */}
            {isLow && (
              <View style={[invSt.ribbon, { backgroundColor: colors.error }]}>
                <Text style={invSt.ribbonTxt}>LOW</Text>
              </View>
            )}
            {!isLow && isHealthy && (
              <View style={[invSt.ribbon, { backgroundColor: colors.success }]}>
                <Text style={invSt.ribbonTxt}>OK</Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={invSt.content}>
            <Text style={[invSt.name, { color: colors.text }]} numberOfLines={2}>
              {item.item?.name ?? item.name ?? 'Unnamed Item'}
            </Text>
            <View style={invSt.metaRow}>
              <Text style={[invSt.qty, { color: colors.text }]}>{item.quantity}</Text>
              <Text style={[invSt.unit, { color: colors.textSecondary }]}>{' '}{item.item?.stockLabel ?? 'pcs'}</Text>
              <View style={invSt.dot} />
              <Text style={[invSt.price, { color: colors.success }]}>₱{formatPeso(item.price)}</Text>
            </View>
            {unitsList.length > 0 && (
              <Text style={[invSt.units, { color: colors.textSecondary }]} numberOfLines={1}>{unitsList}</Text>
            )}
            {isLow && reorderPoint > 0 && (
              <View style={[invSt.warnBadge, { backgroundColor: colors.error + '15' }]}>
                <Text style={[invSt.warnTxt, { color: colors.error }]}>⚠ Reorder at {reorderPoint}</Text>
              </View>
            )}
          </View>

          {/* Restock footer button */}
          <TouchableOpacity
            style={[invSt.restockBtn, { borderTopColor: colors.border, backgroundColor: colors.primary + '0A' }]}
            onPress={() => setRestockTarget(item)}
            activeOpacity={0.8}
          >
            <Text style={[invSt.restockTxt, { color: colors.primary }]}>+ Restock</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  // ── RENDER INVENTORY TABLE (web/tablet/desktop only) ──────────────────────
  const renderInventoryTable = () => {
    const getDefaultUnit = (item: any) => item.units?.find((u: any) => u.isDefault) ?? item.units?.[0];
    const getReorderPoint = (item: any) => getDefaultUnit(item)?.reorderPoint ?? 0;
    const isLowStock = (item: any) => getReorderPoint(item) > 0 && item.quantity <= getReorderPoint(item);

    const COL = { img: 56, name: 200, barcode: 130, qty: 90, label: 90, price: 110, units: 150, status: 110, action: 90 };
    const HEADERS: [keyof typeof COL, string][] = [
      ['img', ''], ['name', 'Item Name'], ['barcode', 'Barcode'],
      ['qty', 'Qty'], ['label', 'Unit'], ['price', 'Price'],
      ['units', 'Variants'], ['status', 'Status'], ['action', 'Action'],
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: Object.values(COL).reduce((a, b) => a + b, 0) }}>
          {/* Header */}
          <View style={[invSt.tableHead, { backgroundColor: colors.primary }]}>
            {HEADERS.map(([key, label]) => (
              <View key={key} style={[invSt.th, { width: COL[key] }, (key === 'qty' || key === 'price') ? { alignItems: 'flex-end' as const } : {}]}>
                <Text style={invSt.thTxt}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Rows */}
          {outletItems.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No items assigned to this outlet</Text>
            </View>
          ) : outletItems.map((item, idx) => {
            const low = isLowStock(item);
            const unitsList = item.units && item.units.length > 0
              ? (item.units as any[]).map((u: any) => u.unitName).join(', ')
              : '—';
            return (
              <TouchableOpacity
                key={item.id} activeOpacity={0.75}
                onPress={() => { setEditingInventoryItemId(item.id.toString()); setShowAddItemModal(true); }}
                style={[invSt.tableRow, { backgroundColor: idx % 2 === 0 ? colors.card : colors.background, borderBottomColor: colors.border }]}
              >
                {/* Image */}
                <View style={[invSt.td, { width: COL.img }]}>
                  {item.item?.image ? (
                    <Image source={{ uri: item.item.image }} style={invSt.tableThumb} resizeMode="cover"
                      defaultSource={require('@/assets/images/placeholder.png')} />
                  ) : (
                    <View style={[invSt.tableThumbPlaceholder, { backgroundColor: colors.border + '40' }]}>
                      <Package size={16} color={colors.textSecondary} strokeWidth={1.5} />
                    </View>
                  )}
                </View>
                {/* Name */}
                <View style={[invSt.td, { width: COL.name }]}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={2}>
                    {item.item?.name ?? item.name ?? '—'}
                  </Text>
                </View>
                {/* Barcode */}
                <View style={[invSt.td, { width: COL.barcode }]}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'monospace' }}>
                    {item.item?.barcode ?? '—'}
                  </Text>
                </View>
                {/* Qty */}
                <View style={[invSt.td, { width: COL.qty, alignItems: 'flex-end' as const }]}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: low ? colors.error : colors.text }}>{item.quantity}</Text>
                </View>
                {/* Stock label */}
                <View style={[invSt.td, { width: COL.label }]}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.item?.stockLabel ?? 'pcs'}</Text>
                </View>
                {/* Price */}
                <View style={[invSt.td, { width: COL.price, alignItems: 'flex-end' as const }]}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.success }}>₱{formatPeso(item.price)}</Text>
                </View>
                {/* Units */}
                <View style={[invSt.td, { width: COL.units }]}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={2}>{unitsList}</Text>
                </View>
                {/* Status */}
                <View style={[invSt.td, { width: COL.status }]}>
                  <View style={[invSt.statusBadge, low
                    ? { backgroundColor: colors.error + '18', borderColor: colors.error + '60' }
                    : { backgroundColor: colors.success + '18', borderColor: colors.success + '60' }]}>
                    <View style={[invSt.statusDot, { backgroundColor: low ? colors.error : colors.success }]} />
                    <Text style={[invSt.statusTxt, { color: low ? colors.error : colors.success }]}>
                      {low ? 'Low Stock' : 'In Stock'}
                    </Text>
                  </View>
                </View>
                {/* Action */}
                <View style={[invSt.td, { width: COL.action }]}>
                  <TouchableOpacity
                    style={[invSt.tableRestockBtn, { borderColor: colors.primary + '60', backgroundColor: colors.primary + '12' }]}
                    onPress={() => setRestockTarget(item)} activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Restock</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // ── RENDER STAFF ITEM ────────────────────────────────────────────────────
  const renderStaffItem = ({ item: staff }: { item: any }) => {
    const isPresent = currentCashiers.some((c) => c.id === staff.id);
    return (
      <View style={{ flex: 1, padding: grid.screenPadding / 2 }}>
        <View style={[st.staffRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[st.staffAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
              {staff.fullname.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.staffName, { color: colors.text }]}>{staff.fullname}</Text>
            <Text style={[st.staffEmail, { color: colors.textSecondary }]}>{staff.email}</Text>
          </View>
          {isPresent && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 10 }}>
              <View style={[st.activeDot, { backgroundColor: colors.success }]} />
              <Text style={{ fontSize: 11, color: colors.success, fontWeight: '600' }}>Active</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => setAssignedStaff((prev) => prev.filter((s) => s.id !== staff.id))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={colors.error} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const inlineOverlay = isWeb ? centeredOverlay : bottomSheetOverlay;
  const inlineSheetBase: any = isWeb
    ? { borderRadius: 16, width: 520, maxWidth: '90vw', maxHeight: '85vh', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 24 }
    : { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', maxWidth: 560, width: '100%', alignSelf: 'center' };

  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[st.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[st.backBtn, { backgroundColor: colors.card }]} onPress={handleBack}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.title, { color: colors.text }]}>{outletName}</Text>
          <Text style={[st.subtitle, { color: colors.textSecondary }]}>{branchName}</Text>
        </View>
        <TouchableOpacity style={[st.editBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setShowEditModal(true)} activeOpacity={0.8}>
          <Edit2 size={15} color={colors.primary} strokeWidth={2} />
          <Text style={[st.editBtnTxt, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={[st.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <TouchableOpacity key={key} style={[st.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
              onPress={() => setActiveTab(key)} activeOpacity={0.8}>
              <Icon size={15} color={isActive ? colors.primary : colors.textSecondary} strokeWidth={isActive ? 2.5 : 2} />
              <Text style={[st.tabLabel, { color: isActive ? colors.primary : colors.textSecondary, fontWeight: isActive ? '700' : '500' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          {outletBannerImage ? (
            <Image source={{ uri: outletBannerImage }} style={{ width: '100%', height: 180 }} resizeMode="cover"
              defaultSource={require('@/assets/images/placeholder.png')} />
          ) : (
            <View style={{ width: '100%', height: 150, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>No outlet image</Text>
            </View>
          )}
          <View style={{ alignSelf: 'center', width: '100%', maxWidth: grid.maxContentWidth, padding: grid.screenPadding }}>
            <View style={[st.filterRow, { backgroundColor: colors.card }]}>
              {FILTERS.map((filter) => {
                const { label } = getDateRange(filter, customStart, customEnd);
                const isActive = activeFilter === filter;
                return (
                  <TouchableOpacity key={filter} style={[st.filterTab, isActive && { backgroundColor: colors.primary }]}
                    onPress={() => filter === 'custom' ? setShowDatePicker(true) : setActiveFilter(filter)}>
                    <Text style={[st.filterTabText, { color: isActive ? '#fff' : colors.textSecondary }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <DateRangePickerModal visible={showDatePicker} onClose={() => setShowDatePicker(false)}
              onApply={(s, e) => { setCustomStart(s); setCustomEnd(e); setActiveFilter('custom'); }}
              initialStart={customStart} initialEnd={customEnd} />
            {loading ? (
              <View style={st.metricsRow}>
                {[1, 2, 3].map((i) => <SkeletonPulse key={i} colors={colors} style={{ flex: 1, height: 72, borderRadius: 12 }} />)}
              </View>
            ) : (
              <View style={st.metricsRow}>
                <View style={[st.metricCard, { backgroundColor: colors.card }]}>
                  <PhilippinePeso size={16} color={colors.success} strokeWidth={2} />
                  <Text style={[st.metricVal, { color: colors.text }]}>{outletRevenue ? formatPeso(outletRevenue.totalRevenue) : '₱0'}</Text>
                  <Text style={[st.metricLbl, { color: colors.textSecondary }]}>Revenue</Text>
                </View>
                <View style={[st.metricCard, { backgroundColor: colors.card }]}>
                  <TrendingUp size={16} color={colors.accent} strokeWidth={2} />
                  <Text style={[st.metricVal, { color: colors.text }]}>{outletRevenue?.transactionCount ?? 0}</Text>
                  <Text style={[st.metricLbl, { color: colors.textSecondary }]}>Transactions</Text>
                </View>
                <View style={[st.metricCard, { backgroundColor: colors.card }]}>
                  <Users size={16} color={colors.primary} strokeWidth={2} />
                  <Text style={[st.metricVal, { color: colors.text }]}>{currentCashiers.length}</Text>
                  <Text style={[st.metricLbl, { color: colors.textSecondary }]}>Staff Active</Text>
                </View>
              </View>
            )}
            <Text style={[st.sectionTitle, { color: colors.text, marginTop: 8 }]}>Active Cashiers</Text>
            {currentCashiers.length === 0 ? (
              <View style={[st.emptyCard, { backgroundColor: colors.card }]}>
                <User size={32} color={colors.textSecondary} strokeWidth={1.5} />
                <Text style={[st.emptyTxt, { color: colors.textSecondary }]}>No active cashiers</Text>
              </View>
            ) : currentCashiers.map((c) => (
              <View key={c.id} style={[st.cashierCard, { backgroundColor: colors.card }]}>
                <User size={18} color={colors.primary} strokeWidth={2} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[st.cashierName, { color: colors.text }]}>{c.fullname}</Text>
                  <Text style={[st.cashierEmail, { color: colors.textSecondary }]}>{c.email}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={st.activeDot} />
                  <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>Active</Text>
                </View>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
              <Text style={[st.sectionTitle, { color: colors.text }]}>Transactions ({transactions.length})</Text>
              <View style={[st.viewToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity style={[st.toggleBtn, txnView === 'card' && { backgroundColor: colors.primary }]} onPress={() => setTxnView('card')}>
                  <LayoutGrid size={14} color={txnView === 'card' ? '#fff' : colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity style={[st.toggleBtn, txnView === 'table' && { backgroundColor: colors.primary }]} onPress={() => setTxnView('table')}>
                  <Table size={14} color={txnView === 'table' ? '#fff' : colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
            {transactions.length === 0 ? (
              <View style={[st.emptyCard, { backgroundColor: colors.card }]}>
                <ShoppingCart size={32} color={colors.textSecondary} strokeWidth={1.5} />
                <Text style={[st.emptyTxt, { color: colors.textSecondary }]}>No transactions yet</Text>
              </View>
            ) : (
              <>
                {txnView === 'card' && pagedTxns.map((txn) => (
                  <TouchableOpacity activeOpacity={0.8} key={txn.id} onPress={() => setSelectedTxnId(txn.id)} style={[st.txnCard, { backgroundColor: colors.card }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={[st.txnId, { color: colors.text }]}>#{txn.id.toString().slice(-8).toUpperCase()}</Text>
                      <Text style={[st.txnTime, { color: colors.textSecondary }]}>{new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <Text style={[{ fontSize: 13 }, { color: colors.textSecondary }]}>{txn.items.length} item{txn.items.length !== 1 ? 's' : ''}</Text>
                        <View style={[st.payBadge, { backgroundColor: colors.primary + '18' }]}>
                          <Text style={[st.payBadgeTxt, { color: colors.primary }]}>{txn.paymentMethod.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={[st.txnTotal, { color: colors.success }]}>₱{txn.total.toFixed(2)}</Text>
                    </View>
                    {txn.items.slice(0, 2).map((item, i) => (
                      <Text key={i} style={{ fontSize: 12, color: colors.textSecondary }}>{item.quantity}× {item.name}</Text>
                    ))}
                    {txn.items.length > 2 && <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' }}>+{txn.items.length - 2} more</Text>}
                    <TouchableOpacity style={{ alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}
                      onPress={() => setReturnTarget(txn)}>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>Return Items</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
                {txnView === 'table' && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      <View style={{ flexDirection: 'row', backgroundColor: colors.primary }}>
                        {['ID', 'Time', 'Items', 'Method', 'Total'].map((h, i) => (
                          <View key={h} style={[st.thCell, i === 4 && { alignItems: 'flex-end' as const }]}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</Text>
                          </View>
                        ))}
                      </View>
                      {pagedTxns.map((txn, idx) => (
                        <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedTxnId(txn.id)} key={txn.id}
                          style={{ flexDirection: 'row', backgroundColor: idx % 2 === 0 ? colors.card : colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                          <View style={st.tdCell}><Text style={{ fontSize: 11, color: colors.primary, fontFamily: 'monospace' }}>#{txn.id.toString().slice(-6)}</Text></View>
                          <View style={st.tdCell}><Text style={{ fontSize: 12, color: colors.textSecondary }}>{new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>
                          <View style={st.tdCell}><Text style={{ fontSize: 12, color: colors.text }}>{txn.items.length}</Text></View>
                          <View style={st.tdCell}><Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>{txn.paymentMethod.toUpperCase()}</Text></View>
                          <View style={[st.tdCell, { alignItems: 'flex-end' as const }]}><Text style={{ fontSize: 13, fontWeight: '700', color: colors.success }}>₱{txn.total.toFixed(2)}</Text></View>
                          <TouchableOpacity style={{ alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}
                            onPress={() => setReturnTarget(txn)}>
                            <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>Return Items</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
                {totalPages > 1 && (
                  <View style={[st.pagination, { borderTopColor: colors.border }]}>
                    <TouchableOpacity style={[st.pageBtn, { borderColor: colors.border, opacity: txnPage <= 1 ? 0.4 : 1 }]}
                      onPress={() => setTxnPage((p) => Math.max(1, p - 1))} disabled={txnPage <= 1}>
                      <ChevronLeft size={16} color={colors.text} strokeWidth={2} />
                    </TouchableOpacity>
                    <Text style={[st.pageInfo, { color: colors.textSecondary }]}>{txnPage} / {totalPages} · {transactions.length} total</Text>
                    <TouchableOpacity style={[st.pageBtn, { borderColor: colors.border, opacity: txnPage >= totalPages ? 0.4 : 1 }]}
                      onPress={() => setTxnPage((p) => Math.min(totalPages, p + 1))} disabled={txnPage >= totalPages}>
                      <ChevronRight size={16} color={colors.text} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── INVENTORY TAB ── */}
      {activeTab === 'inventory' && (
        <View style={{ flex: 1 }}>
          {/* Restock notice banner */}
          {restockNotice && (
            <View style={{ marginHorizontal: grid.screenPadding, marginTop: 10, backgroundColor: colors.error + '12', borderColor: colors.error + '40', borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', alignSelf: 'center', width: '100%', maxWidth: grid.maxContentWidth }}>
              <Text style={{ color: colors.error, fontSize: 12, flex: 1, marginRight: 8 }}>⚠ {restockNotice}</Text>
              <TouchableOpacity onPress={() => setRestockNotice(null)}><X size={16} color={colors.error} strokeWidth={2} /></TouchableOpacity>
            </View>
          )}

          {/* Toolbar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: grid.screenPadding, paddingTop: 14, paddingBottom: 10, alignSelf: 'center', width: '100%', maxWidth: grid.maxContentWidth }}>
            <Text style={[st.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
              {outletItems.length} Item{outletItems.length !== 1 ? 's' : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {/* View toggle: web/tablet only */}
              {isWeb && grid.cols > 1 && (
                <View style={[invSt.viewToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity style={[invSt.toggleBtn, inventoryView === 'grid' && { backgroundColor: colors.primary }]}
                    onPress={() => setInventoryView('grid')} activeOpacity={0.8}>
                    <LayoutGrid size={14} color={inventoryView === 'grid' ? '#fff' : colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[invSt.toggleBtn, inventoryView === 'table' && { backgroundColor: colors.primary }]}
                    onPress={() => setInventoryView('table')} activeOpacity={0.8}>
                    <Table size={14} color={inventoryView === 'table' ? '#fff' : colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity style={[invSt.assignBtn, { backgroundColor: colors.primary }]}
                onPress={() => { setEditingInventoryItemId(undefined); setShowAddItemModal(true); setShowAssignItemsModal(false); }}
                activeOpacity={0.85}>
                <Plus size={14} color="#fff" strokeWidth={2.5} />
                <Text style={invSt.assignBtnTxt}>Assign Items</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.border, opacity: 0.5 }} />

          {/* Content */}
          {loading ? (
            <FlatList key="inv-skel" data={Array.from({ length: 6 })} keyExtractor={(_, i) => `skel-${i}`}
              numColumns={grid.cols}
              contentContainerStyle={{ paddingHorizontal: grid.screenPadding / 2, paddingTop: 12, paddingBottom: 40 }}
              renderItem={() => (
                <View style={{ flex: 1, padding: 6 }}>
                  <SkeletonPulse colors={colors} style={{ height: 160, borderRadius: 14 }} />
                </View>
              )} />
          ) : outletItems.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border + '40', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Package size={32} color={colors.textSecondary} strokeWidth={1.5} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 }}>No items yet</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', maxWidth: 260 }}>
                Tap <Text style={{ fontWeight: '700', color: colors.primary }}>Assign Items</Text> to add products to this outlet.
              </Text>
            </View>
          ) : isWeb && inventoryView === 'table' ? (
            // Table view
            <ScrollView style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: grid.screenPadding, paddingTop: 14, paddingBottom: 40, alignSelf: 'center', width: '100%', maxWidth: grid.maxContentWidth }}>
              <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                {renderInventoryTable()}
              </View>
            </ScrollView>
          ) : (
            // Grid view
            <FlatList key={`inventory-${grid.cols}`} data={outletItems} keyExtractor={(item) => item.id?.toString()}
              renderItem={renderInventoryItem} numColumns={grid.cols}
              contentContainerStyle={{ paddingHorizontal: grid.screenPadding / 2, paddingTop: 12, paddingBottom: 40, alignSelf: 'center', width: '100%', maxWidth: grid.maxContentWidth }} />
          )}
        </View>
      )}

      {/* ── STAFF TAB ── */}
      {activeTab === 'staff' && (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: grid.screenPadding, paddingVertical: 12, alignSelf: 'center', width: '100%', maxWidth: grid.maxContentWidth }}>
            <Text style={[st.sectionTitle, { color: colors.text }]}>{assignedStaff.length} Staff Assigned</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[st.addBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAssignModal(true)} activeOpacity={0.85}>
                <Plus size={14} color="#fff" strokeWidth={2.5} />
                <Text style={st.addBtnTxt}>Assign Staff</Text>
              </TouchableOpacity>
            </View>
          </View>
          {assignedStaff.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <Users size={36} color={colors.textSecondary} strokeWidth={1.5} />
              <Text style={[st.emptyTxt, { color: colors.textSecondary }]}>No staff assigned</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' }}>Tap Assign to add existing users or New to create a staff account</Text>
            </View>
          ) : (
            <FlatList key={`staff-${grid.cols}`} data={assignedStaff} keyExtractor={(item) => item.id}
              renderItem={renderStaffItem} numColumns={grid.cols}
              contentContainerStyle={{ paddingHorizontal: grid.screenPadding / 2, paddingBottom: 40, alignSelf: 'center', width: '100%', maxWidth: grid.maxContentWidth }} />
          )}
        </View>
      )}

      <AssignStaffModal visible={showAssignModal} onClose={() => setShowAssignModal(false)} onAssigned={loadData} colors={colors} outletId={outletId} alreadyAssigned={assignedStaff} />
      <CreateStaffModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={(user) => setAssignedStaff((prev) => [...prev, user])} colors={colors} />
      <EditOutletModal
        visible={showEditModal} onClose={() => setShowEditModal(false)}
        outletName={outletName ?? ''} outletId={outletId ?? ''}
        outletBannerImage={outletBannerImage} outletBannerImagePath={outletBannerImagePath}
        outletData={outletData}
        onUpdated={(newUrl, newPath) => { if (newUrl) setOutletBannerImage(newUrl); if (newPath) setOutletBannerImagePath(newPath); }}
        onSuccess={() => loadData()} colors={colors}
      />

      {/* Assign Items Modal */}
      <Modal visible={showAssignItemsModal} transparent animationType={isWeb ? 'fade' : 'slide'}>
        <View style={inlineOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowAssignItemsModal(false)} />
          <View style={[inlineSheetBase, { backgroundColor: colors.surface }]}>
            {!isWeb && <View style={[st.modalHandle, { backgroundColor: colors.border }]} />}
            <View style={[st.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[st.modalTitle, { color: colors.text }]}>Assign Items to Outlet</Text>
              <TouchableOpacity onPress={() => setShowAssignItemsModal(false)}><X size={20} color={colors.textSecondary} strokeWidth={2} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={st.modalBody}>
              {availableItems.map((item) => {
                const itemIdStr = item.id.toString();
                const isSelected = selectedItems.includes(itemIdStr);
                const isAssigned = outletItems.some((oi) => oi.item?.id === item.id);
                return (
                  <View key={item.id} style={[st.itemRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: isAssigned ? 0.6 : 1 }]}>
                    <TouchableOpacity style={[st.checkbox, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary + '30' : 'transparent', opacity: isAssigned ? 0.5 : 1 }]}
                      onPress={() => { if (!isAssigned) setSelectedItems((prev) => isSelected ? prev.filter((id) => id !== itemIdStr) : [...prev, itemIdStr]); }}
                      disabled={isAssigned}>
                      {isSelected && <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>✓</Text>}
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[st.itemName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[st.itemDetail, { color: colors.textSecondary, marginTop: 2 }]}>{item.barcode && `SKU: ${item.barcode}`}</Text>
                    </View>
                    {isAssigned && <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>✓ Assigned</Text>}
                  </View>
                );
              })}
            </ScrollView>
            <View style={[st.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={[st.modalBtn, st.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => { setSelectedItems([]); setItemQuantities({}); setItemPrices({}); setShowAssignItemsModal(false); }}>
                <Text style={[st.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.modalBtn, st.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleAssignItems} disabled={selectedItems.length === 0}>
                <Text style={[st.modalBtnText, { color: '#fff' }]}>Assign {selectedItems.length} Items</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Restock Modal */}
      <Modal visible={!!restockTarget} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={() => setRestockTarget(null)}>
        <View style={inlineOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setRestockTarget(null)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[inlineSheetBase, { backgroundColor: colors.surface }]}>
              {!isWeb && <View style={[st.modalHandle, { backgroundColor: colors.border }]} />}
              <View style={[st.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[st.modalTitle, { color: colors.text }]}>Restock — {restockTarget?.item?.name}</Text>
                <TouchableOpacity onPress={() => setRestockTarget(null)}><X size={20} color={colors.textSecondary} strokeWidth={2} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>Current outlet stock: {restockTarget?.quantity} {restockTarget?.item?.stockLabel ?? 'pcs'}</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>Unallocated org stock: {restockTarget?.item?.remainingStock ?? 0} {restockTarget?.item?.stockLabel ?? 'pcs'}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>QUANTITY TO ADD</Text>
                <TextInput style={{ borderWidth: 1, borderRadius: 10, borderColor: restockExceedsMax ? colors.error : colors.border, backgroundColor: colors.background, color: colors.text, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16, marginBottom: 6 }}
                  placeholder="0" placeholderTextColor={colors.textSecondary} value={restockQty} onChangeText={setRestockQty} keyboardType="decimal-pad" autoFocus />
                {restockExceedsMax && (
                  <Text style={{ fontSize: 11, color: colors.error, fontWeight: '600', marginBottom: 8 }}>⚠ This exceeds unallocated warehouse stock ({maxRestock} {restockTarget?.item?.stockLabel ?? 'pcs'}). You can still proceed, but stock records may go negative.</Text>
                )}
                {!restockExceedsMax && <View style={{ marginBottom: 14 }} />}
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 }}>REASON (optional)</Text>
                <TextInput style={{ borderWidth: 1, borderRadius: 10, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginBottom: 20 }}
                  placeholder="e.g. Weekly restock from warehouse" placeholderTextColor={colors.textSecondary} value={restockReason} onChangeText={setRestockReason} />
                <TouchableOpacity style={{ backgroundColor: restockQtyNum > 0 ? restockExceedsMax ? colors.error : colors.primary : colors.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: restocking ? 0.7 : 1 }}
                  onPress={handleRestock} disabled={!restockQty || restockQtyNum <= 0 || restocking}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{restocking ? 'Restocking…' : restockExceedsMax ? `Add ${restockQty || '0'} Anyway (Over Stock)` : `Add ${restockQty || '0'} to Outlet`}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Return Modal */}
      <Modal visible={!!returnTarget} transparent animationType={isWeb ? 'fade' : 'slide'} onRequestClose={() => setReturnTarget(null)}>
        <View style={inlineOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setReturnTarget(null)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[inlineSheetBase, { backgroundColor: colors.surface }]}>
              {!isWeb && <View style={[st.modalHandle, { backgroundColor: colors.border }]} />}
              <View style={[st.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[st.modalTitle, { color: colors.text }]}>Return Items — #{returnTarget?.id.toString().slice(-6).toUpperCase()}</Text>
                <TouchableOpacity onPress={() => setReturnTarget(null)}><X size={20} color={colors.textSecondary} strokeWidth={2} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                {returnTarget?.items.map((item) => {
                  const state = returnItems[item.id] ?? { qty: '', isResellable: true, reason: '' };
                  return (
                    <View key={item.id} style={{ marginBottom: 16, padding: 14, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{item.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>Sold qty: {item.quantity}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>RETURN QTY</Text>
                      <TextInput style={{ borderWidth: 1, borderRadius: 8, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginBottom: 10 }}
                        placeholder="0" placeholderTextColor={colors.textSecondary} value={state.qty}
                        onChangeText={(v) => setReturnItems((prev) => ({ ...prev, [item.id]: { ...state, qty: v } }))} keyboardType="decimal-pad" />
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, color: colors.text }}>Resellable (add back to stock)</Text>
                        <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: state.isResellable ? colors.success : colors.error, backgroundColor: state.isResellable ? colors.success + '18' : colors.error + '18' }}
                          onPress={() => setReturnItems((prev) => ({ ...prev, [item.id]: { ...state, isResellable: !state.isResellable } }))}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: state.isResellable ? colors.success : colors.error }}>{state.isResellable ? '✓ Yes' : '✕ Write-off'}</Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput style={{ borderWidth: 1, borderRadius: 8, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 }}
                        placeholder="Reason (optional)" placeholderTextColor={colors.textSecondary} value={state.reason}
                        onChangeText={(v) => setReturnItems((prev) => ({ ...prev, [item.id]: { ...state, reason: v } }))} />
                    </View>
                  );
                })}
                <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: returning ? 0.7 : 1 }}
                  onPress={handleReturn} disabled={returning}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{returning ? 'Processing…' : 'Process Return'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── KEY FIX: Only reload when modal explicitly saves (didSave param) ── */}
      <AddInventoryItemModal
        visible={showAddItemModal}
        onClose={(didSave?: boolean) => {
          setShowAddItemModal(false);
          setEditingInventoryItemId(undefined);
          // Only reload if the user actually saved something
          if (didSave) {
            setTimeout(() => loadData(), 300);
          }
        }}
        outletId={outletId ?? ''}
        outletName={outletName ?? ''}
        branchName={branchName ?? ''}
        branchId={branchId ?? ''}
        inventoryItemId={editingInventoryItemId}
      />
      <TransactionDetailModal transactionId={selectedTxnId} onClose={() => setSelectedTxnId(null)} colors={colors} />
    </SafeAreaView>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  editBtnTxt: { fontSize: 13, fontWeight: '600' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 13 },
  filterRow: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 3, marginBottom: 12 },
  filterTab: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  filterTabText: { fontSize: 11, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metricCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  metricVal: { fontSize: 15, fontWeight: '800' },
  metricLbl: { fontSize: 10, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  emptyCard: { borderRadius: 12, padding: 28, alignItems: 'center' },
  emptyTxt: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  cashierCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8 },
  cashierName: { fontSize: 15, fontWeight: '700' },
  cashierEmail: { fontSize: 12, marginTop: 1 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
  viewToggle: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden', padding: 2, gap: 2 },
  toggleBtn: { width: 32, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  txnCard: { borderRadius: 12, padding: 14, marginBottom: 8 },
  txnId: { fontSize: 13, fontWeight: '700' },
  txnTime: { fontSize: 12 },
  txnTotal: { fontSize: 15, fontWeight: '800' },
  payBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  payBadgeTxt: { fontSize: 10, fontWeight: '600' },
  thCell: { width: 100, padding: 10 },
  tdCell: { width: 100, paddingHorizontal: 10, paddingVertical: 10 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, marginTop: 8 },
  pageBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageInfo: { fontSize: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  staffRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 0, borderWidth: 1 },
  staffAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  staffName: { fontSize: 14, fontWeight: '700' },
  staffDetail: { fontSize: 8 },
  staffEmail: { fontSize: 12, marginTop: 1 },
  itemCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, borderWidth: 1, flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700' },
  itemDetail: { fontSize: 12, marginTop: 1 },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' as any },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalBody: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  modalFooter: { flexDirection: 'row', padding: 20, borderTopWidth: 1, gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelBtn: { borderWidth: 1, backgroundColor: 'transparent' },
  modalConfirmBtn: {},
  modalBtnText: { fontSize: 15, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  assignedText: { fontSize: 12, fontWeight: '600' },
});

// ─── Inventory-specific styles ─────────────────────────────────────────────────

const invSt = StyleSheet.create({
  // ── Grid card ──────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  imageBox: { width: '100%', height: 88, position: 'relative', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  ribbon: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  ribbonTxt: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  content: { flex: 1, padding: 10, paddingBottom: 6 },
  name: { fontSize: 13, fontWeight: '700', lineHeight: 18, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  qty: { fontSize: 14, fontWeight: '800' },
  unit: { fontSize: 12, marginRight: 4 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#aaa', marginHorizontal: 5 },
  price: { fontSize: 13, fontWeight: '700' },
  units: { fontSize: 11, marginBottom: 4 },
  warnBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, marginTop: 2, alignSelf: 'flex-start' },
  warnTxt: { fontSize: 10, fontWeight: '700' },
  restockBtn: { paddingVertical: 8, borderTopWidth: 1, alignItems: 'center' },
  restockTxt: { fontSize: 12, fontWeight: '700' },

  // ── Table ──────────────────────────────────────────────────────────────────
  tableHead: { flexDirection: 'row' },
  th: { paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' },
  thTxt: { fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.6 },
  tableRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  td: { paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' },
  tableThumb: { width: 36, height: 36, borderRadius: 8 },
  tableThumbPlaceholder: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: '700' },
  tableRestockBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },

  // ── Toolbar ────────────────────────────────────────────────────────────────
  viewToggle: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, overflow: 'hidden', padding: 3, gap: 2 },
  toggleBtn: { width: 34, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  assignBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  assignBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
});