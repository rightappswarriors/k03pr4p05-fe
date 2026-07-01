
// ─── Edit Outlet Modal ─────────────────────────────────────────────────────────

import { OutletPromoItem, OutletPromoService } from "@/services/outletPromoService";
import { PromoTypeItem, PromoTypeService } from "@/services/promoTypeService";
import { VatTypeItem, VatTypeService } from "@/services/vatTypeService";
import { MediaService } from '@/services/mediaService';
import * as ImagePicker from 'expo-image-picker';
import { aom } from "@/components/AddOutletModal"
import React, { useEffect, useState } from "react";
import { StyleSheet, View, Modal, Text, TouchableOpacity, TextInput, Platform, Image, KeyboardAvoidingView, ScrollView, Switch } from "react-native";
import { AdminService } from "@/services/ManagerService";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownField } from "@/app/(erp)/branch";
import { bottomSheetOverlay, centeredOverlay } from "@/app/(erp)/outlets";
import { X, Map } from "lucide-react-native";
import { MapPinPicker } from '@/components/MapPinPicker';

const isWeb = Platform.OS === 'web';
export function EditOutletModal({
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
    const [showMapPicker, setShowMapPicker] = useState(false);

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
                const { user } = useAuth();
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
        <>
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
                                <Text style={[aom.section, { color: colors.textSecondary }]}>LOCATION</Text>
                                <TouchableOpacity
                                    style={[
                                        aom.locationBtn,
                                        {
                                            borderColor: latitude ? colors.primary : colors.border,
                                            backgroundColor: latitude ? colors.primary + '10' : colors.background,
                                        },
                                    ]}
                                    onPress={() => setShowMapPicker(true)}
                                    activeOpacity={0.82}
                                >
                                    <Map size={16} color={latitude ? colors.primary : colors.textSecondary} strokeWidth={2} />
                                    <Text
                                        style={[
                                            aom.locationBtnTxt,
                                            { color: latitude ? colors.primary : colors.textSecondary, flex: 1 },
                                        ]}
                                    >
                                        {latitude && longitude
                                            ? `📍 ${parseFloat(latitude).toFixed(5)}, ${parseFloat(longitude).toFixed(5)}`
                                            : 'Set coordinates'}
                                    </Text>
                                    {latitude && (
                                        <TouchableOpacity
                                            onPress={() => { setLatitude(''); setLongitude(''); }}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <X size={14} color={colors.error} strokeWidth={2} />
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
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
            <MapPinPicker
                visible={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                onConfirm={(lat, lng) => {
                    setLatitude(lat.toString());
                    setLongitude(lng.toString());
                }}
                colors={colors}
                initialLatitude={latitude ? parseFloat(latitude) : undefined}
                initialLongitude={longitude ? parseFloat(longitude) : undefined}
            />
        </>
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