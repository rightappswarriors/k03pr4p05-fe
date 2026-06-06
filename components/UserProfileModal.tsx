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
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { UserProfileService } from '../services/userProfileService';

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: number;
  onUpdated?: () => void;
}

interface ProfileData {
  contactNumber: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  dateOfBirth: string;
  profilePhoto: string;
}

export default function UserProfileModal({
  visible,
  onClose,
  userId,
  onUpdated,
}: UserProfileModalProps) {
  const { colors } = useTheme();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<ProfileData>({

    contactNumber: '',
    address: '',
    city: '',
    zipCode: '',
    country: '',
    dateOfBirth: '',
    profilePhoto: '',
  });

  useEffect(() => {
    if (visible) loadProfile();
  }, [visible]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const targetUserId = userId || authUser?.id;
      if (!targetUserId) { setError('User ID is required'); return; }

      const profile =
        userId
          ? await UserProfileService.getUserProfile(userId)
          : await UserProfileService.getMyProfile();

      if (profile) {
        setFormData({
          contactNumber: profile.contactNumber || '',
          address: profile.address || '',
          city: profile.city || '',
          zipCode: profile.zipCode || '',
          country: profile.country || '',
          dateOfBirth: profile.dateOfBirth || '',
          profilePhoto: profile.profilePhoto || '',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const targetUserId = userId || authUser?.id;
      if (!targetUserId) { setError('User ID is required'); return; }
      if (userId) {
        setError('You can only edit your own profile');
        return;
      }
      await UserProfileService.updateMyProfile(formData);
      Alert.alert('Success', 'Profile updated successfully');
      onUpdated?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: string) => {
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

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      {/* Dimmed overlay — tap outside to close */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Card — swallow taps so they don't bubble to the overlay */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[styles.modalCard, { backgroundColor: colors.surface }]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                My Profile
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: colors.cardBackground }]}
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
            >
              {error && (
                <View style={[styles.errorBox, { backgroundColor: colors.danger }]}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}


              <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
              <TextInput
                style={inputStyle}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textSecondary}
                value={formData.contactNumber}
                onChangeText={(v) => updateField('contactNumber', v)}
                keyboardType="phone-pad"
              />

              <Text style={[styles.label, { color: colors.text }]}>Date of Birth</Text>
              <TextInput
                style={inputStyle}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={formData.dateOfBirth}
                onChangeText={(v) => updateField('dateOfBirth', v)}
              />

              <Text style={[styles.label, { color: colors.text }]}>Address</Text>
              <TextInput
                style={inputStyle}
                placeholder="Enter address"
                placeholderTextColor={colors.textSecondary}
                value={formData.address}
                onChangeText={(v) => updateField('address', v)}
              />

              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={[styles.label, { color: colors.text }]}>City</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="City"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.city}
                    onChangeText={(v) => updateField('city', v)}
                  />
                </View>
                
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Zip Code</Text>
              <TextInput
                style={inputStyle}
                placeholder="Enter zip code"
                placeholderTextColor={colors.textSecondary}
                value={formData.zipCode}
                onChangeText={(v) => updateField('zipCode', v)}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { color: colors.text }]}>Country</Text>
              <TextInput
                style={inputStyle}
                placeholder="Enter country"
                placeholderTextColor={colors.textSecondary}
                value={formData.country}
                onChangeText={(v) => updateField('country', v)}
              />

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Profile</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexGrow: 0,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContent: {
    padding: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: 'white',
    fontSize: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 40,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  half: {
    flex: 1,
  },
  saveButton: {
    marginTop: 24,
    borderRadius: 8,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
});