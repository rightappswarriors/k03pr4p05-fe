import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthService } from '@/services/authService';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OnboardingContext } from './_layout';
import { useAuth } from '@/contexts/AuthContext';

import { Eye, EyeOff } from 'lucide-react-native';
import { RoleToggle } from '@/components/RoleToggle';
interface OnboardingScreenProps {
  initialStep?: 'register' | 'verify' | 'organization' | 'subscription';
}

// --- Password validation ---
export interface PasswordStrength {
  score: number; // 0–4
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  rules: {
    label: string;
    met: boolean;
  }[];
}

export function getPasswordStrength(password: string): PasswordStrength {
  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least one uppercase letter (A–Z)', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter (a–z)', met: /[a-z]/.test(password) },
    { label: 'At least one number (0–9)', met: /[0-9]/.test(password) },
    {
      label: 'At least one special character (!@#$…)',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const score = rules.filter((r) => r.met).length;

  const levels: PasswordStrength['label'][] = [
    'Too short',
    'Weak',
    'Fair',
    'Good',
    'Strong',
  ];
  const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

  return {
    score,
    label: levels[score] as PasswordStrength['label'],
    color: colors[score],
    rules,
  };
}


function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <EyeOff size={18} color="#9ca3af" />
  ) : (
    <Eye size={18} color="#9ca3af" />
  );
}

export default function OnboardingScreen({
  initialStep,
}: OnboardingScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const onboarding = useContext(OnboardingContext);
  const { user, refreshUser } = useAuth();

  const stepMap = {
    register: 1,
    verify: 2,
    organization: 3,
    subscription: 4,
  };

  useEffect(() => {
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
    }
  }, [params.email]);

  const [step, setStep] = useState<number>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [plan, setPlan] = useState<'BASIC' | 'GOLD'>('BASIC');
  const [orgRoles, setOrgRoles] = useState<string[]>(['SELLER']);
  const toggleOrgRole = (role: string) => {
    setOrgRoles(prev =>
      prev.includes(role) ? (prev.length > 1 ? prev.filter(r => r !== role) : prev) : [...prev, role]
    );
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const passwordStrength = getPasswordStrength(password);
  const isPasswordStrong = passwordStrength.score === 5;
  const passwordsMatch = password === confirmPassword;

  useEffect(() => {
    if (user) {
      const orgId = user.orgId || user.org?.id;
      if (orgId && !organizationId) {
        setOrganizationId(Number(orgId));
      }
      if (user.email && !email) {
        setEmail(user.email);
      }
    }
  }, [user, organizationId, email]);

  useEffect(() => {
    const stepFromParams = params.step as string;
    if (initialStep) {
      setStep(stepMap[initialStep]);
    } else if (stepFromParams && stepMap[stepFromParams as keyof typeof stepMap]) {
      setStep(stepMap[stepFromParams as keyof typeof stepMap]);
    } else if (user) {
      if (!user.isVerified) {
        setStep(2);
      } else if (!user.orgId && !user.org?.id) {
        setStep(3);
      } else if (!user.org?.subscription?.id) {
        setStep(4);
      } else {
        router.replace('/(erp)');
      }
    }
  }, [user, initialStep, params.step, router]);

  const goToComplete = async () => {
    try {
      if (onboarding) {
        await onboarding.setHasOnboarded(true);
        await onboarding.setIsLoggedIn(true);
      }
      router.replace('/(erp)');
    } catch {
      router.replace('/(erp)');
    }
  };

  const handleRegister = async () => {
    setPasswordTouched(true);
    setConfirmTouched(true);

    if (!fullName || !email || !password) {
      setError('Full name, email and password are required');
      return;
    }
    if (!isPasswordStrong) {
      setError('Please create a stronger password that meets all requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await AuthService.registerUser({ fullname: fullName, email, password, contactNumber });
      await AsyncStorage.setItem('temp_password', password);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otpCode) { setError('OTP code is required'); return; }
    setLoading(true);
    setError('');
    try {
      await AuthService.verifyEmail(email, otpCode);
      if (refreshUser) await refreshUser();
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError('');
    setResendMessage('');
    try {
      await AuthService.resendOTP(email);
      setResendMessage('OTP resent successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!orgName) { setError('Organization name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const org = await AuthService.createOrganization(orgName, orgRoles);
      setOrganizationId(org.id);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Organization creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscription = async () => {
    if (!organizationId) { setError('Organization setup required first'); return; }
    setLoading(true);
    setError('');
    try {
      await AuthService.createSubscription(organizationId, plan);
      const tempPassword = await AsyncStorage.getItem('temp_password');
      if (tempPassword && email) {
        try {
          await AuthService.login(email, tempPassword);
          await AsyncStorage.removeItem('temp_password');
        } catch { /* continue */ }
      } else if (refreshUser) {
        try { await refreshUser(); } catch { /* continue */ }
      }
      await goToComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription creation failed');
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = ['Register', 'Email Verification', 'Organization Setup', 'Subscription'][step - 1];

  // --- Shared input style ---
  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    marginBottom: 4,
  };

  // Step indicator dots
  const StepIndicator = () => (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
      {[1, 2, 3, 4].map((s) => (
        <View
          key={s}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor: s <= step ? colors.primary : colors.border,
          }}
        />
      ))}
    </View>
  );

  // Password strength bar + rules
  const PasswordStrengthUI = () => {
    if (!passwordTouched || !password) return null;
    return (
      <View style={{ marginTop: 8, gap: 6 }}>
        {/* Strength bar */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= passwordStrength.score ? passwordStrength.color : colors.border,
              }}
            />
          ))}
        </View>
        <Text style={{ fontSize: 12, color: passwordStrength.color, fontWeight: '600' }}>
          {passwordStrength.label}
        </Text>
        {/* Rules checklist */}
        <View style={{ gap: 3 }}>
          {passwordStrength.rules.map((rule) => (
            <View key={rule.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 12, color: rule.met ? '#22c55e' : '#ef4444' }}>
                {rule.met ? '✓' : '✗'}
              </Text>
              <Text style={{ fontSize: 12, color: rule.met ? colors.textSecondary : '#ef4444' }}>
                {rule.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 16,
      }}
    >
      {/* Centered card with max-width */}
      <View
        style={{
          width: '100%',
          maxWidth: 480,
          gap: 16,
        }}
      >
        {/* Logo / branding area */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 }}>
            Welcome
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
            Step {step} of 4 — {stepTitle}
          </Text>
        </View>

        <StepIndicator />

        {/* Error banner */}
        {error ? (
          <View
            style={{
              padding: 12,
              backgroundColor: '#fef2f2',
              borderRadius: 8,
              borderLeftWidth: 3,
              borderLeftColor: '#ef4444',
            }}
          >
            <Text style={{ color: '#dc2626', fontSize: 13, lineHeight: 18 }}>{error}</Text>
          </View>
        ) : null}

        {/* ── STEP 1: Register ── */}
        {step === 1 && (
          <>
            <View>
              <Text style={labelStyle}>Full Name</Text>
              <TextInput
                placeholder="Jane Doe"
                value={fullName}
                onChangeText={setFullName}
                style={inputStyle}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View>
              <Text style={labelStyle}>Email Address</Text>
              <TextInput
                placeholder="jane@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={inputStyle}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View>
              <Text style={labelStyle}>Password</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  placeholder="Create a strong password"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setPasswordTouched(true); }}
                  onBlur={() => setPasswordTouched(true)}
                  secureTextEntry={!showPassword}
                  style={[
                    inputStyle,
                    { paddingRight: 48 },
                    passwordTouched && password && !isPasswordStrong
                      ? { borderColor: '#ef4444' }
                      : {},
                    passwordTouched && isPasswordStrong
                      ? { borderColor: '#22c55e' }
                      : {},
                  ]}
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 0,
                    bottom: 0,
                    justifyContent: 'center',
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <EyeIcon visible={showPassword} />
                </TouchableOpacity>
              </View>
              <PasswordStrengthUI />
            </View>

            <View>
              <Text style={labelStyle}>Confirm Password</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); setConfirmTouched(true); }}
                  onBlur={() => setConfirmTouched(true)}
                  secureTextEntry={!showConfirmPassword}
                  style={[
                    inputStyle,
                    { paddingRight: 48 },
                    confirmTouched && confirmPassword && !passwordsMatch
                      ? { borderColor: '#ef4444' }
                      : {},
                    confirmTouched && confirmPassword && passwordsMatch
                      ? { borderColor: '#22c55e' }
                      : {},
                  ]}
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 0,
                    bottom: 0,
                    justifyContent: 'center',
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <EyeIcon visible={showConfirmPassword} />
                </TouchableOpacity>
              </View>
              {confirmTouched && confirmPassword && !passwordsMatch && (
                <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                  ✗ Passwords do not match
                </Text>
              )}
              {confirmTouched && confirmPassword && passwordsMatch && (
                <Text style={{ fontSize: 12, color: '#22c55e', marginTop: 4 }}>
                  ✓ Passwords match
                </Text>
              )}
            </View>

            <View>
              <Text style={labelStyle}>Contact Number (optional)</Text>
              <TextInput
                placeholder="+63 912 345 6789"
                value={contactNumber}
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
                style={inputStyle}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              style={{
                backgroundColor: colors.primary,
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 4,
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  Create Account
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── STEP 2: Verify ── */}
        {step === 2 && (
          <>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📧</Text>
              <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
                We sent a 6-digit code to{' '}
                <Text style={{ color: colors.text, fontWeight: '600' }}>{email}</Text>
              </Text>
            </View>

            <View>
              <Text style={labelStyle}>Verification Code</Text>
              <TextInput
                placeholder="000000"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                style={[
                  inputStyle,
                  { fontSize: 24, textAlign: 'center', letterSpacing: 10, fontWeight: '700' },
                ]}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              onPress={handleVerify}
              disabled={loading || resendLoading}
              style={{
                backgroundColor: colors.primary,
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 4,
                opacity: loading || resendLoading ? 0.5 : 1,
              }}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Verify Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={loading || resendLoading}
              style={{ padding: 12, alignItems: 'center', opacity: loading || resendLoading ? 0.5 : 1 }}
            >
              {resendLoading ? <ActivityIndicator color={colors.primary} /> : (
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Resend Code</Text>
              )}
            </TouchableOpacity>

            {resendMessage ? (
              <Text style={{ color: '#22c55e', fontSize: 14, textAlign: 'center' }}>
                ✓ {resendMessage}
              </Text>
            ) : null}
          </>
        )}

        {/* ── STEP 3: Organization ── */}
        {step === 3 && (
          <>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏢</Text>
              <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
                Set up your organization to get started.
              </Text>
            </View>

            <View>
              <Text style={labelStyle}>Organization Name</Text>
              <TextInput
                placeholder="Acme Corp"
                value={orgName}
                onChangeText={setOrgName}
                style={inputStyle}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            
            <View>
              <Text style={labelStyle}>Organization Type</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                Select at least one. You can change this later.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <RoleToggle
                  label="Seller"
                  subtitle="I sell to customers"
                  selected={orgRoles.includes('SELLER')}
                  onPress={() => toggleOrgRole('SELLER')}
                />
                <RoleToggle
                  label="Supplier"
                  subtitle="I supply to stores"
                  selected={orgRoles.includes('SUPPLIER')}
                  onPress={() => toggleOrgRole('SUPPLIER')}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCreateOrg}
              disabled={loading}
              style={{
                backgroundColor: colors.primary,
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 4,
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Create Organization</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── STEP 4: Subscription ── */}
        {step === 4 && (
          <>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>⭐</Text>
              <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center' }}>
                Choose a plan to activate your workspace.
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {(['BASIC', 'GOLD'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setPlan(option)}
                  style={{
                    borderWidth: 2,
                    borderColor: plan === option ? colors.primary : colors.border,
                    backgroundColor: plan === option
                      ? (colors.primary + '15') // subtle tint
                      : colors.surface,
                    borderRadius: 10,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: plan === option ? colors.primary : colors.border,
                      backgroundColor: plan === option ? colors.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {plan === option && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>
                      {option === 'BASIC' ? 'Basic' : 'Gold'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {option === 'BASIC' ? 'Essential features for small teams' : 'Advanced features + priority support'}
                    </Text>
                  </View>
                  {option === 'GOLD' && (
                    <View style={{ backgroundColor: '#f59e0b', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>PRO</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSubscription}
              disabled={loading}
              style={{
                backgroundColor: colors.primary,
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 4,
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Finish Setup</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}