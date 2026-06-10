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
import { Eye, EyeOff, X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { UserProfileService } from '../services/userProfileService';
import { getPasswordStrength } from '../utils/passwordStrength';

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

// ── Moved OUTSIDE the parent so it never remounts on re-render ──────────────

interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  onBlur?: () => void;
  colors: {
    text: string;
    textSecondary: string;
    border: string;
    cardBackground: string;
  };
  inputStyle: object[];
}

const PasswordField = ({
  label,
  value,
  onChangeText,
  visible,
  onToggleVisible,
  onBlur,
  colors,
  inputStyle,
}: PasswordFieldProps) => (
  <View>
    <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    <View style={styles.passwordField}>
      <TextInput
        style={[...inputStyle, styles.passwordInput]}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        secureTextEntry={!visible}
        autoCapitalize="none"
      />
      <TouchableOpacity
        onPress={onToggleVisible}
        style={styles.passwordToggle}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {visible ? (
          <EyeOff size={18} color={colors.textSecondary} />
        ) : (
          <Eye size={18} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
    </View>
  </View>
);

interface PasswordStrengthUIProps {
  newPasswordTouched: boolean;
  newPassword: string;
  passwordStrength: ReturnType<typeof getPasswordStrength>;
  colors: { border: string; textSecondary: string; danger: string };
}

const PasswordStrengthUI = ({
  newPasswordTouched,
  newPassword,
  passwordStrength,
  colors,
}: PasswordStrengthUIProps) => {
  if (!newPasswordTouched || !newPassword) return null;
  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBar}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              styles.strengthSegment,
              {
                backgroundColor:
                  i <= passwordStrength.score ? passwordStrength.color : colors.border,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
        {passwordStrength.label}
      </Text>
      {passwordStrength.rules.map((rule) => (
        <Text
          key={rule.label}
          style={[
            styles.ruleText,
            { color: rule.met ? colors.textSecondary : colors.danger },
          ]}
        >
          {rule.met ? '[x]' : '[ ]'} {rule.label}
        </Text>
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

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
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const passwordStrength = getPasswordStrength(newPassword);
  const isPasswordStrong = passwordStrength.score === 5;
  const passwordsMatch = newPassword === confirmPassword;

  useEffect(() => {
    if (visible) {
      loadProfile();
    } else {
      resetPasswordForm();
    }
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

  const resetPasswordForm = () => {
    setShowChangePassword(false);
    setPasswordSaving(false);
    setPasswordError('');
    setPasswordSuccess('');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setNewPasswordTouched(false);
    setConfirmPasswordTouched(false);
  };

  const handleChangePassword = async () => {
    setNewPasswordTouched(true);
    setConfirmPasswordTouched(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Old password, new password, and confirm password are required');
      return;
    }

    if (!isPasswordStrong) {
      setPasswordError('Please enter a stronger new password that meets all requirements.');
      return;
    }

    if (!passwordsMatch) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    try {
      setPasswordSaving(true);
      await UserProfileService.changePassword({ oldPassword, newPassword });
      setPasswordSuccess('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNewPasswordTouched(false);
      setConfirmPasswordTouched(false);
      Alert.alert('Success', 'Password changed successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordError(message);
      Alert.alert('Error', message);
    } finally {
      setPasswordSaving(false);
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
                onPress={() => {
                  setShowChangePassword((value) => !value);
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                style={[styles.secondaryButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  {showChangePassword ? 'Cancel Change Password' : 'Change Password'}
                </Text>
              </TouchableOpacity>

              {showChangePassword && (
                <View style={[styles.passwordSection, { borderColor: colors.border }]}>
                  {passwordError ? (
                    <View style={[styles.errorBox, { backgroundColor: colors.danger }]}>
                      <Text style={styles.errorText}>{passwordError}</Text>
                    </View>
                  ) : null}
                  {passwordSuccess ? (
                    <View style={[styles.successBox, { borderColor: colors.primary }]}>
                      <Text style={[styles.successText, { color: colors.primary }]}>
                        {passwordSuccess}
                      </Text>
                    </View>
                  ) : null}

                  <PasswordField
                    label="Old Password"
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    visible={showOldPassword}
                    onToggleVisible={() => setShowOldPassword((v) => !v)}
                    colors={colors}
                    inputStyle={inputStyle}
                  />

                  <PasswordField
                    label="New Password"
                    value={newPassword}
                    onChangeText={(value) => {
                      setNewPassword(value);
                      setNewPasswordTouched(true);
                    }}
                    visible={showNewPassword}
                    onToggleVisible={() => setShowNewPassword((v) => !v)}
                    onBlur={() => setNewPasswordTouched(true)}
                    colors={colors}
                    inputStyle={inputStyle}
                  />
                  <PasswordStrengthUI
                    newPasswordTouched={newPasswordTouched}
                    newPassword={newPassword}
                    passwordStrength={passwordStrength}
                    colors={colors}
                  />

                  <PasswordField
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      setConfirmPasswordTouched(true);
                    }}
                    visible={showConfirmPassword}
                    onToggleVisible={() => setShowConfirmPassword((v) => !v)}
                    onBlur={() => setConfirmPasswordTouched(true)}
                    colors={colors}
                    inputStyle={inputStyle}
                  />
                  {confirmPasswordTouched && confirmPassword && !passwordsMatch ? (
                    <Text style={[styles.ruleText, { color: colors.danger }]}>
                      Passwords do not match
                    </Text>
                  ) : null}

                  <TouchableOpacity
                    onPress={handleChangePassword}
                    disabled={passwordSaving}
                    style={[
                      styles.saveButton,
                      { backgroundColor: colors.primary, opacity: passwordSaving ? 0.6 : 1 },
                    ]}
                  >
                    {passwordSaving ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.saveButtonText}>Update Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

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
  passwordField: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 44,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  passwordSection: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  strengthContainer: {
    marginTop: 8,
    gap: 4,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  ruleText: {
    fontSize: 12,
  },
  successBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  successText: {
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '700',
    fontSize: 14,
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