import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    ActivityIndicator,
    Alert,
    Image,
    Platform,
} from 'react-native';
import { X, Camera, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { OrganizationService } from '../services/organizationService';
import { MediaService } from '../services/mediaService';
import { AuthService } from '../services/authService';

interface OrganizationProfileModalProps {
    visible: boolean;
    onClose: () => void;
    organizationId: number;
    onUpdated?: () => void;
}

interface OrgData {
    name: string;
    bio: string;
    email: string;
    contactNumber: string;
    location: string;
    profileImg: string;
    bannerImg: string;
    facebookLink: string;
    instagramLink: string;
    twitterLink: string;
}

export default function OrganizationProfileModal({
    visible,
    onClose,
    organizationId,
    onUpdated,
}: OrganizationProfileModalProps) {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [confirmVisible, setConfirmVisible] = useState(false);

    const [formData, setFormData] = useState<OrgData>({
        name: '',
        bio: '',
        email: '',
        contactNumber: '',
        location: '',
        profileImg: '',
        bannerImg: '',
        facebookLink: '',
        instagramLink: '',
        twitterLink: '',
    });

    // Local preview URIs for display
    const [profileImgLocal, setProfileImgLocal] = useState<string | null>(null);
    const [bannerImgLocal, setBannerImgLocal] = useState<string | null>(null);

    // On web, store the raw File objects so we can pass them directly to MediaService
    const [profileImgFile, setProfileImgFile] = useState<File | null>(null);
    const [bannerImgFile, setBannerImgFile] = useState<File | null>(null);

    const [originalProfileImgPath, setOriginalProfileImgPath] = useState<string>('');
    const [originalBannerImgPath, setOriginalBannerImgPath] = useState<string>('');
    const [profileImgRemoved, setProfileImgRemoved] = useState(false);
    const [bannerImgRemoved, setBannerImgRemoved] = useState(false);

    useEffect(() => {
        if (visible) loadOrganization();
    }, [visible]);

    const loadOrganization = async () => {
        try {
            setLoading(true);
            setError('');
            const org = await OrganizationService.getOrganization(organizationId);
            if (org) {
                setFormData({
                    name: org.name || '',
                    bio: org.bio || '',
                    email: org.email || '',
                    contactNumber: org.contactNumber || '',
                    location: org.location || '',
                    profileImg: org.profileImg || '',
                    bannerImg: org.bannerImg || '',
                    facebookLink: org.facebookLink || '',
                    instagramLink: org.instagramLink || '',
                    twitterLink: org.twitterLink || '',
                });
                setOriginalProfileImgPath(org.profileImg || '');
                setOriginalBannerImgPath(org.bannerImg || '');
            }
            setProfileImgLocal(null);
            setBannerImgLocal(null);
            setProfileImgFile(null);
            setBannerImgFile(null);
            setProfileImgRemoved(false);
            setBannerImgRemoved(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load organization';
            setError(message);
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    // ── Image picker ────────────────────────────────────────────────────────────
    const pickImage = async (field: 'profileImg' | 'bannerImg') => {
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e: any) => {
                const file: File | undefined = e.target?.files?.[0];
                if (!file) return;
                const blobUrl = URL.createObjectURL(file);
                // Store blob URL as the local URI — normalizeMediaFile handles blob: on web
                if (field === 'profileImg') {
                    setProfileImgLocal(blobUrl);
                    setProfileImgRemoved(false);
                } else {
                    setBannerImgLocal(blobUrl);
                    setBannerImgRemoved(false);
                }
            };
            input.click();
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            aspect: field === 'profileImg' ? [1, 1] : [16, 9],
        });

        if (!result.canceled && result.assets[0]) {
            const uri = result.assets[0].uri;
            if (field === 'profileImg') {
                setProfileImgLocal(uri);
                setProfileImgRemoved(false);
            } else {
                setBannerImgLocal(uri);
                setBannerImgRemoved(false);
            }
        }
    };

    const removeImage = (field: 'profileImg' | 'bannerImg') => {
        if (field === 'profileImg') {
            setProfileImgLocal(null);
            setProfileImgFile(null);
            setProfileImgRemoved(true);
        } else {
            setBannerImgLocal(null);
            setBannerImgFile(null);
            setBannerImgRemoved(true);
        }
    };

    // ── Resolve uploads/deletes, return final public URLs ───────────────────────
    const resolveImageUploads = async (orgId: string) => {
        let finalProfileImg = formData.profileImg;
        let finalBannerImg = formData.bannerImg;

        // ── Profile image ────────────────────────────────────────────────────────
        const hasNewProfileImg =
            !!profileImgLocal &&
            !profileImgLocal.startsWith('http') &&
            profileImgLocal !== formData.profileImg;
        const hasRemovedProfileImg = !profileImgLocal && !!originalProfileImgPath && profileImgRemoved;

        if (hasNewProfileImg && profileImgLocal) {
            const file = { uri: profileImgLocal, name: `profile_${Date.now()}.jpg`, type: 'image/jpeg' };
            if (originalProfileImgPath) {
                const media = await MediaService.updateMedia(file, originalProfileImgPath, orgId);
                finalProfileImg = media?.publicUrl ?? '';
            } else {
                const media = await MediaService.uploadMedia(file, orgId);
                finalProfileImg = media.publicUrl;
            }
        } else if (hasRemovedProfileImg) {
            await MediaService.deleteMedia(originalProfileImgPath);
            finalProfileImg = '';
        }

        // ── Banner image ─────────────────────────────────────────────────────────
        const hasNewBannerImg =
            !!bannerImgLocal &&
            !bannerImgLocal.startsWith('http') &&
            bannerImgLocal !== formData.bannerImg;
        const hasRemovedBannerImg = !bannerImgLocal && !!originalBannerImgPath && bannerImgRemoved;

        if (hasNewBannerImg && bannerImgLocal) {
            const file = { uri: bannerImgLocal, name: `banner_${Date.now()}.jpg`, type: 'image/jpeg' };
            if (originalBannerImgPath) {
                const media = await MediaService.updateMedia(file, originalBannerImgPath, orgId);
                finalBannerImg = media?.publicUrl ?? '';
            } else {
                const media = await MediaService.uploadMedia(file, orgId);
                finalBannerImg = media.publicUrl;
            }
        } else if (hasRemovedBannerImg) {
            await MediaService.deleteMedia(originalBannerImgPath);
            finalBannerImg = '';
        }

        return { finalProfileImg, finalBannerImg };
    };

    // ── Save (called after confirmation) ────────────────────────────────────────
    const handleConfirmedSave = async () => {
        setConfirmVisible(false);
        try {
            setSaving(true);
            setError('');

            const user = await AuthService.getCurrentUser();
            if (!user?.orgId) throw new Error('Organization identifier not found.');
            const orgId = String(user.orgId);

            const { finalProfileImg, finalBannerImg } = await resolveImageUploads(orgId);

            await OrganizationService.updateOrganization(organizationId, {
                name: formData.name,
                bio: formData.bio,
                email: formData.email,
                contactNumber: formData.contactNumber,
                location: formData.location,
                profileImg: finalProfileImg,
                bannerImg: finalBannerImg,
                facebookLink: formData.facebookLink,
                instagramLink: formData.instagramLink,
                twitterLink: formData.twitterLink,
            });

            Alert.alert('Success', 'Organization profile updated successfully');
            onUpdated?.();
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update organization';
            setError(message);
            Alert.alert('Error', message);
        } finally {
            setSaving(false);
        }
    };

    // ── Pre-save validation → show confirm modal ─────────────────────────────────
    const handleSavePress = () => {
        if (!formData.name.trim()) {
            setError('Organization name is required');
            return;
        }
        setError('');
        setConfirmVisible(true);
    };

    const updateField = (field: keyof OrgData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const inputStyle = [
        styles.input,
        {
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.cardBackground,
        },
    ];

    const disabledInputStyle = [
        styles.input,
        {
            borderColor: colors.border,
            color: colors.textSecondary,
            backgroundColor: colors.cardBackground,
            opacity: 0.6,
        },
    ];

    const profileImgDisplay = profileImgRemoved ? null : profileImgLocal || formData.profileImg || null;
    const bannerImgDisplay = bannerImgRemoved ? null : bannerImgLocal || formData.bannerImg || null;

    return (
        <>
            <Modal visible={visible} animationType="fade" transparent={true}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={saving ? undefined : onClose}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                        style={[styles.modalCard, { backgroundColor: colors.surface }]}
                    >
                        {/* Header */}
                        <View style={[styles.header, { borderBottomColor: colors.border }]}>
                            <View style={styles.headerContent}>
                                <Text style={[styles.headerTitle, { color: colors.text }]}>
                                    Organization Profile
                                </Text>
                                <TouchableOpacity
                                    onPress={saving ? undefined : onClose}
                                    disabled={saving}
                                    style={[
                                        styles.closeButton,
                                        { backgroundColor: colors.cardBackground, opacity: saving ? 0.4 : 1 },
                                    ]}
                                >
                                    <X size={20} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {loading ? (
                            <View style={styles.centerContent}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        ) : (
                            <ScrollView
                                style={styles.content}
                                contentContainerStyle={styles.contentContainer}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                scrollEnabled={!saving}
                            >
                                {error ? (
                                    <View style={[styles.errorBox, { backgroundColor: colors.danger }]}>
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                ) : null}

                                {/* Saving overlay hint */}
                                {saving && (
                                    <View style={[styles.savingBanner, { backgroundColor: colors.primary }]}>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={styles.savingText}>Saving changes…</Text>
                                    </View>
                                )}

                                {/* ── Banner Image ───────────────────────── */}
                                <View style={styles.bannerWrapper}>
                                    <TouchableOpacity
                                        onPress={saving ? undefined : () => pickImage('bannerImg')}
                                        activeOpacity={saving ? 1 : 0.85}
                                        style={[
                                            styles.bannerContainer,
                                            {
                                                backgroundColor: colors.cardBackground,
                                                borderColor: colors.border,
                                                opacity: saving ? 0.6 : 1,
                                            },
                                        ]}
                                    >
                                        {bannerImgDisplay ? (
                                            <Image
                                                source={{ uri: bannerImgDisplay }}
                                                style={styles.bannerImage}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={styles.bannerPlaceholder}>
                                                <Camera size={24} color={colors.textSecondary} />
                                                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                                                    Tap to add banner
                                                </Text>
                                            </View>
                                        )}
                                        {!saving && (
                                            <View style={styles.bannerActions}>
                                                <TouchableOpacity
                                                    onPress={() => pickImage('bannerImg')}
                                                    style={[styles.imageActionBtn, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
                                                >
                                                    <Camera size={14} color="#fff" />
                                                </TouchableOpacity>
                                                {bannerImgDisplay && (
                                                    <TouchableOpacity
                                                        onPress={() => removeImage('bannerImg')}
                                                        style={[styles.imageActionBtn, { backgroundColor: 'rgba(239,68,68,0.85)' }]}
                                                    >
                                                        <Trash2 size={14} color="#fff" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* ── Profile Image + Org Name ───────────── */}
                                <View style={styles.profileRow}>
                                    <TouchableOpacity
                                        onPress={saving ? undefined : () => pickImage('profileImg')}
                                        activeOpacity={saving ? 1 : 0.85}
                                        style={[
                                            styles.avatarWrapper,
                                            {
                                                borderColor: colors.surface,
                                                backgroundColor: colors.cardBackground,
                                                opacity: saving ? 0.6 : 1,
                                            },
                                        ]}
                                    >
                                        {profileImgDisplay ? (
                                            <Image source={{ uri: profileImgDisplay }} style={styles.avatarImage} />
                                        ) : (
                                            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.cardBackground }]}>
                                                <Camera size={20} color={colors.textSecondary} />
                                            </View>
                                        )}
                                        <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
                                            <Camera size={10} color="#fff" />
                                        </View>
                                    </TouchableOpacity>

                                    <View style={styles.profileMeta}>
                                        <Text style={[styles.orgNamePreview, { color: colors.text }]} numberOfLines={2}>
                                            {formData.name || 'Organization Name'}
                                        </Text>
                                        {profileImgDisplay && !saving && (
                                            <TouchableOpacity onPress={() => removeImage('profileImg')}>
                                                <Text style={[styles.removeText, { color: colors.error }]}>
                                                    Remove photo
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                {/* ── Form fields ───────────────────────── */}
                                <Text style={[styles.label, { color: colors.text }]}>Organization Name *</Text>
                                <TextInput
                                    style={saving ? disabledInputStyle : inputStyle}
                                    placeholder="Enter organization name"
                                    placeholderTextColor={colors.textSecondary}
                                    value={formData.name}
                                    onChangeText={(v) => updateField('name', v)}
                                    editable={!saving}
                                />

                                <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
                                <TextInput
                                    style={saving ? [...disabledInputStyle, styles.textArea] : [...inputStyle, styles.textArea]}
                                    placeholder="Enter bio"
                                    placeholderTextColor={colors.textSecondary}
                                    value={formData.bio}
                                    onChangeText={(v) => updateField('bio', v)}
                                    multiline
                                    numberOfLines={4}
                                    editable={!saving}
                                />

                                <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                                <TextInput
                                    style={saving ? disabledInputStyle : inputStyle}
                                    placeholder="Enter email"
                                    placeholderTextColor={colors.textSecondary}
                                    value={formData.email}
                                    onChangeText={(v) => updateField('email', v)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={!saving}
                                />

                                <Text style={[styles.label, { color: colors.text }]}>Contact Number</Text>
                                <TextInput
                                    style={saving ? disabledInputStyle : inputStyle}
                                    placeholder="Enter contact number"
                                    placeholderTextColor={colors.textSecondary}
                                    value={formData.contactNumber}
                                    onChangeText={(v) => updateField('contactNumber', v)}
                                    keyboardType="phone-pad"
                                    editable={!saving}
                                />

                                <Text style={[styles.label, { color: colors.text }]}>Location</Text>
                                <TextInput
                                    style={saving ? disabledInputStyle : inputStyle}
                                    placeholder="Enter location"
                                    placeholderTextColor={colors.textSecondary}
                                    value={formData.location}
                                    onChangeText={(v) => updateField('location', v)}
                                    editable={!saving}
                                />

                                <Text style={[styles.label, { color: colors.text }]}>Facebook</Text>
                                <TextInput
                                    style={saving ? disabledInputStyle : inputStyle}
                                    placeholder="Facebook URL"
                                    placeholderTextColor={colors.textSecondary}
                                    value={formData.facebookLink}
                                    onChangeText={(v) => updateField('facebookLink', v)}
                                    autoCapitalize="none"
                                    keyboardType="url"
                                    editable={!saving}
                                />

                                <Text style={[styles.label, { color: colors.text }]}>Instagram</Text>
                                <TextInput
                                    style={saving ? disabledInputStyle : inputStyle}
                                    placeholder="Instagram URL"
                                    placeholderTextColor={colors.textSecondary}
                                    value={formData.instagramLink}
                                    onChangeText={(v) => updateField('instagramLink', v)}
                                    autoCapitalize="none"
                                    keyboardType="url"
                                    editable={!saving}
                                />

                                <Text style={[styles.label, { color: colors.text }]}>Twitter / X</Text>
                                <TextInput
                                    style={saving ? disabledInputStyle : inputStyle}
                                    placeholder="Twitter URL"
                                    placeholderTextColor={colors.textSecondary}
                                    value={formData.twitterLink}
                                    onChangeText={(v) => updateField('twitterLink', v)}
                                    autoCapitalize="none"
                                    keyboardType="url"
                                    editable={!saving}
                                />

                                <TouchableOpacity
                                    onPress={handleSavePress}
                                    disabled={saving}
                                    style={[
                                        styles.saveButton,
                                        {
                                            backgroundColor: saving ? colors.textSecondary : colors.primary,
                                            opacity: saving ? 0.6 : 1,
                                        },
                                    ]}
                                >
                                    {saving ? (
                                        <View style={styles.savingRow}>
                                            <ActivityIndicator color="white" size="small" />
                                            <Text style={styles.saveButtonText}>Saving…</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.saveButtonText}>Save Changes</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* ── Confirmation Modal ────────────────────────────────────────────── */}
            <Modal visible={confirmVisible} animationType="fade" transparent={true}>
                <View style={styles.confirmOverlay}>
                    <View style={[styles.confirmCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.confirmTitle, { color: colors.text }]}>
                            Update Organization Profile
                        </Text>
                        <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
                            Are you sure you want to save these changes to your organization profile?
                        </Text>

                        <View style={styles.confirmActions}>
                            <TouchableOpacity
                                onPress={() => setConfirmVisible(false)}
                                style={[
                                    styles.confirmBtn,
                                    styles.confirmBtnCancel,
                                    { borderColor: colors.border, backgroundColor: colors.cardBackground },
                                ]}
                            >
                                <Text style={[styles.confirmBtnCancelText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleConfirmedSave}
                                style={[styles.confirmBtn, styles.confirmBtnConfirm, { backgroundColor: colors.primary }]}
                            >
                                <Text style={styles.confirmBtnConfirmText}>Yes, Update</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const AVATAR_SIZE = 72;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalCard: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '90%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: { flexGrow: 0 },
    contentContainer: { paddingBottom: 32 },
    centerContent: { padding: 48, justifyContent: 'center', alignItems: 'center' },
    savingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 8,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 8,
    },
    savingText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    errorBox: {
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 12,
        marginTop: 12,
    },
    errorText: { color: 'white', fontSize: 12 },
    bannerWrapper: { width: '100%' },
    bannerContainer: {
        width: '100%',
        height: 130,
        borderBottomWidth: 1,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerImage: { width: '100%', height: '100%' },
    bannerPlaceholder: { alignItems: 'center', gap: 6 },
    bannerActions: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        gap: 6,
    },
    imageActionBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        gap: 12,
    },
    avatarWrapper: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        borderWidth: 3,
        overflow: 'visible',
        position: 'relative',
    },
    avatarImage: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
    },
    avatarPlaceholder: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileMeta: { flex: 1, gap: 4 },
    orgNamePreview: { fontSize: 16, fontWeight: '700' },
    removeText: { fontSize: 12, fontWeight: '500' },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 12,
        paddingHorizontal: 16,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        minHeight: 40,
        marginHorizontal: 16,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    placeholderText: { fontSize: 12 },
    saveButton: {
        marginTop: 24,
        marginHorizontal: 16,
        borderRadius: 8,
        paddingVertical: 12,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

    // ── Confirm modal ──────────────────────────────────────────────────────────
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    confirmCard: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 16,
        padding: 24,
        gap: 12,
    },
    confirmTitle: { fontSize: 17, fontWeight: '700' },
    confirmMessage: { fontSize: 14, lineHeight: 20 },
    confirmActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnCancel: { borderWidth: 1 },
    confirmBtnConfirm: {},
    confirmBtnCancelText: { fontSize: 14, fontWeight: '600' },
    confirmBtnConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});