// screens/(admin)/outlets.tsx — OutletListScreen
// Fixed:
//   - Google Maps replaced with safe coordinate fallback (no native crash)
//   - Add Outlet modal: all missing Prisma fields added + full validation
//   - Subscription limit guard wired correctly

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
  Animated,
  Switch,
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  PhilippinePeso,
  Users,
  Circle,
  Plus,
  X,
  Map,
  Navigation,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminService } from '@/services/adminService';
import { AdminOutlet, OutletRevenue } from '@/types';
import { DateRangeFilter, getDateRange } from '@/utils/dateHelpers';
import DateRangePickerModal from '@/components/DateRangePickerModal';
import { useWebSocket } from '@/contexts/WSContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DropdownField } from '.';
import { useLimitGuard } from '@/components/LockedFeature';
import { SkeletonPulse } from '.';
import {
  validatePercentage,
  validatePHPhone,
  validateOutletCode,
} from '@/utils/validators';

export const FILTERS: DateRangeFilter[] = [
  'today',
  'this_week',
  'this_month',
  'custom',
];
const OUTLET_TYPES = ['retail', 'wholesale', 'service'];
const OUTLET_STATUSES = ['open', 'closed', 'maintenance'];

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

// ─── Coordinate Picker (safe fallback — no native MapView) ────────────────────
// Shows manual lat/lng inputs with a "Use Current Location" hint.
// Once react-native-maps is properly configured (app.json + prebuild),
// replace this with the MapPinPicker that uses MapView.

function CoordinatePicker({
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
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError('Latitude must be between -90 and 90.');
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setError('Longitude must be between -180 and 180.');
      return;
    }
    onConfirm(latNum, lngNum);
    setLat('');
    setLng('');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={[cp.sheet, { backgroundColor: colors.surface }]}>
            <View style={[cp.handle, { backgroundColor: colors.border }]} />
            <View style={[cp.header, { borderBottomColor: colors.border }]}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Navigation size={18} color={colors.primary} strokeWidth={2} />
                <Text style={[cp.title, { color: colors.text }]}>
                  Set Location
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={cp.body}>
              {/* Map pending notice */}
              <View
                style={[
                  cp.notice,
                  {
                    backgroundColor: colors.primary + '12',
                    borderColor: colors.primary + '30',
                  },
                ]}
              >
                <Map size={14} color={colors.primary} strokeWidth={2} />
                <Text style={[cp.noticeTxt, { color: colors.primary }]}>
                  Interactive map coming after native rebuild. Enter coordinates
                  manually for now.
                </Text>
              </View>

              <Text style={[cp.hint, { color: colors.textSecondary }]}>
                Get coordinates from Google Maps: long-press any location → copy
                the numbers shown at the bottom.
              </Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[cp.label, { color: colors.textSecondary }]}>
                    LATITUDE
                  </Text>
                  <TextInput
                    style={[
                      cp.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="e.g. 10.7202"
                    placeholderTextColor={colors.textSecondary}
                    value={lat}
                    onChangeText={setLat}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[cp.label, { color: colors.textSecondary }]}>
                    LONGITUDE
                  </Text>
                  <TextInput
                    style={[
                      cp.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="e.g. 122.5621"
                    placeholderTextColor={colors.textSecondary}
                    value={lng}
                    onChangeText={setLng}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {error ? (
                <Text style={[cp.error, { color: colors.error }]}>{error}</Text>
              ) : null}

              <TouchableOpacity
                style={[
                  cp.confirmBtn,
                  {
                    backgroundColor:
                      lat && lng ? colors.primary : colors.border,
                  },
                ]}
                onPress={handleConfirm}
                disabled={!lat || !lng}
                activeOpacity={0.85}
              >
                <Text style={cp.confirmTxt}>Set Coordinates</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cp = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: '800' },
  body: { padding: 20 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  noticeTxt: { fontSize: 12, lineHeight: 17, flex: 1 },
  hint: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 4,
  },
  error: { fontSize: 12, marginBottom: 10 },
  confirmBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─── Add Outlet Modal — all Prisma fields ─────────────────────────────────────

interface OutletFormData {
  name: string;
  address: string;
  phone: string;
  code: string; // @unique — required by schema
  outletType: string;
  status: string;
  isActive: boolean;
  governmentTax: string;
  serviceCharge: string;
  wifiSSID: string;
  latitude: number | null;
  longitude: number | null;
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
    governmentTax: '',
    serviceCharge: '',
    wifiSSID: '',
    latitude: null,
    longitude: null,
  });
  const [showCoordPicker, setShowCoordPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Per-field validation errors — shown on blur
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldError = (field: string, msg: string) =>
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));

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

  const set = (field: keyof OutletFormData) => (value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Auto-generate outlet code from name
  const autoCode = (name: string) => {
    const prefix = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4);
    return prefix + Date.now().toString().slice(-4);
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

    // Phone validation (optional but must be valid if filled)
    const phoneCheck = validatePHPhone(form.phone);
    if (!phoneCheck.valid) {
      setError(phoneCheck.message);
      return;
    }

    // Outlet code validation
    const codeCheck = validateOutletCode(form.code);
    if (!codeCheck.valid) {
      setError(codeCheck.message);
      return;
    }

    // Percentage fields
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
      await onAdd({ ...form, code: finalCode });
      setForm({
        name: '',
        address: '',
        phone: '',
        code: '',
        outletType: 'retail',
        status: 'open',
        isActive: true,
        governmentTax: '',
        serviceCharge: '',
        wifiSSID: '',
        latitude: null,
        longitude: null,
      });
      setError('');
      onClose();
    } catch {
      setError('Failed to create outlet. Please try again.');
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

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.48)',
              justifyContent: 'flex-end',
            }}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={onClose}
            />
            <View style={[aom.sheet, { backgroundColor: colors.surface }]}>
              <View style={[aom.handle, { backgroundColor: colors.border }]} />
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
                {/* ── Basic info ─────────────────────────────────── */}
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
                  Unique code used by POS terminals. Must be unique across all
                  outlets.
                </Text>

                {/* ── Type & status ──────────────────────────────── */}
                <Text style={[aom.section, { color: colors.textSecondary }]}>
                  TYPE & STATUS
                </Text>

                <DropdownField
                  label="Outlet Type"
                  value={form.outletType}
                  options={OUTLET_TYPES}
                  onSelect={set('outletType')}
                  colors={colors}
                />
                <DropdownField
                  label="Status"
                  value={form.status}
                  options={OUTLET_STATUSES}
                  onSelect={set('status')}
                  colors={colors}
                />

                {/* isActive toggle */}
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

                {/* ── Fees ──────────────────────────────────────── */}
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

                {/* ── Settings ──────────────────────────────────── */}
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

                {/* ── Location ──────────────────────────────────── */}
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
                  onPress={() => setShowCoordPicker(true)}
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
                          latitude: null,
                          longitude: null,
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
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CoordinatePicker
        visible={showCoordPicker}
        onClose={() => setShowCoordPicker(false)}
        onConfirm={(la, ln) =>
          setForm((p) => ({ ...p, latitude: la, longitude: ln }))
        }
        colors={colors}
      />
    </>
  );
}

const aom = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
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
  error: { fontSize: 12, marginBottom: 8 },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function OutletListScreen() {
  const { branchId, branchName } = useLocalSearchParams<{
    branchId: string;
    branchName: string;
  }>();
  const { colors } = useTheme();
  const socket = useWebSocket();
  const { checkOutlet, GuardModal } = useLimitGuard();

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
    // TODO: replace with AdminService.createOutlet(branchId, data)
    const mock: AdminOutlet = {
      id: `o_${Date.now()}`,
      name: data.name,
      phone: data.phone,
      address: data.address,
      outletType: data.outletType as any,
      status: data.status as any,
      createdAt: new Date().toISOString(),
      assignedCashierIds: [],
      currentCashiers: [],
    };
    setOutlets((prev) => [...prev, mock]);
  };

  const openAddModal = () => {
    // Pass current count at call time — fixes the stale state bug
    if (!checkOutlet(outlets.length)) return;
    setAddModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    if (status === 'open') return colors.success;
    if (status === 'closed') return colors.error;
    if (status === 'maintenance') return colors.warning;
    return colors.textSecondary;
  };

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
          <Text style={[ols.title, { color: colors.text }]}>{branchName}</Text>
          <Text style={[ols.subtitle, { color: colors.textSecondary }]}>
            Outlets Overview
          </Text>
        </View>
      </View>

      {/* Date filters */}
      <View style={[ols.filterContainer, { backgroundColor: colors.card }]}>
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

      <ScrollView
        style={ols.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <Text style={[ols.sectionTitle, { color: colors.text }]}>
            {outlets.length} Outlet{outlets.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {loading && outlets.length === 0
          ? [1, 2, 3].map((i) => <SkeletonOutletCard key={i} colors={colors} />)
          : outlets.map((outlet) => {
              const revenue = outletRevenues[outlet.id];
              const statusColor = getStatusColor(outlet.status);
              return (
                <TouchableOpacity
                  key={outlet.id}
                  style={[ols.outletCard, { backgroundColor: colors.card }]}
                  onPress={() =>
                    router.push({
                      pathname: '/(admin)/outlet-detail',
                      params: {
                        outletId: outlet.id,
                        outletName: outlet.name,
                        branchName,
                        branchId,
                      },
                    })
                  }
                  activeOpacity={0.82}
                >
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
                          <Text
                            style={[ols.typeText, { color: colors.primary }]}
                          >
                            {outlet.outletType}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Circle
                        size={10}
                        color={statusColor}
                        fill={statusColor}
                      />
                      <Text style={[ols.statusText, { color: statusColor }]}>
                        {outlet.status.charAt(0).toUpperCase() +
                          outlet.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      ols.statsRow,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <View style={ols.statItem}>
                      <PhilippinePeso
                        size={14}
                        color={colors.success}
                        strokeWidth={2}
                      />
                      <Text style={[ols.statVal, { color: colors.text }]}>
                        ₱{(revenue?.totalRevenue ?? 0).toLocaleString()}
                      </Text>
                      <Text
                        style={[ols.statLbl, { color: colors.textSecondary }]}
                      >
                        Revenue
                      </Text>
                    </View>
                    <View style={ols.statItem}>
                      <MapPin size={14} color={colors.accent} strokeWidth={2} />
                      <Text style={[ols.statVal, { color: colors.text }]}>
                        {revenue?.transactionCount ?? 0}
                      </Text>
                      <Text
                        style={[ols.statLbl, { color: colors.textSecondary }]}
                      >
                        Transactions
                      </Text>
                    </View>
                    <View style={ols.statItem}>
                      <Users size={14} color={colors.primary} strokeWidth={2} />
                      <Text style={[ols.statVal, { color: colors.text }]}>
                        {outlet.currentCashiers.length}
                      </Text>
                      <Text
                        style={[ols.statLbl, { color: colors.textSecondary }]}
                      >
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
            })}
        <View style={{ height: 100 }} />
      </ScrollView>

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
        branchName={branchName ?? ''}
      />
      <GuardModal />
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
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
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
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  outletCard: { borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
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
