// k03pr4p05-fe/components/AddOutletModal.tsx
// ─── Add Outlet Modal ──────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    KeyboardAvoidingView,
    ScrollView,
    Switch,
    Platform,
} from "react-native";
import { MapPinPicker } from '@/components/MapPinPicker';
import { OutletPromoInput } from "@/types";
import { PromoTypeItem, PromoTypeService } from "@/services/promoTypeService";
import { VatTypeItem, VatTypeService } from "@/services/vatTypeService";
import { validateOutletCode, validatePercentage, validatePHPhone } from "@/utils/validators";

import * as ImagePicker from 'expo-image-picker';
import { MediaService } from '@/services/mediaService';
import { autoCode } from '@/utils/autoCode';
import { AuthService } from "@/services/authService";
import { DropdownField } from "@/app/(erp)/branch";
import { Camera, ImageIcon, Map, X } from "lucide-react-native";
import { bottomSheetOverlay, centeredOverlay } from "@/app/(erp)/outlets";
export interface OutletFormData {
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



const OUTLET_TYPES = [{ id: 'retail', label: 'Retail' }, { id: 'wholesale', label: 'Wholesale' }, { id: 'service', label: 'Service' }];
const OUTLET_STATUSES = [{ id: 'open', label: 'Open' }, { id: 'closed', label: 'Closed' }, { id: 'maintenance', label: 'Maintenance' }];

const isWeb = Platform.OS === 'web';


export function AddOutletModal({
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