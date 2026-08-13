import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, MailCheck, ShieldCheck, Sparkles, Store } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthService } from '@/services/authService';
import { OnboardingContext } from './_layout';
import { useAuth } from '@/contexts/AuthContext';

import { Eye, EyeOff } from 'lucide-react-native';
import { RoleToggle } from '@/components/RoleToggle';
interface OnboardingScreenProps {
  initialStep?: 'register' | 'verify' | 'organization' | 'subscription';
}

const STEP_MAP = {
  register: 1,
  verify: 2,
  organization: 3,
  subscription: 4,
} as const;

const STEP_LABELS = ['Account', 'Verify', 'Workspace', 'Plan'];
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
export default function OnboardingScreen({ initialStep }: OnboardingScreenProps) {
  // --- Password validation ---





  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;
  const router = useRouter();
  const params = useLocalSearchParams();
  const onboarding = useContext(OnboardingContext);
  const { user, refreshUser } = useAuth();

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

  useEffect(() => {
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
    }
  }, [params.email]);
  const passwordStrength = getPasswordStrength(password);
  const isPasswordStrong = passwordStrength.score === 5;
  const passwordsMatch = password === confirmPassword;

  useEffect(() => {
    if (user) {
      const orgId = user.orgId || user.org?.id;
      if (orgId && !organizationId) setOrganizationId(Number(orgId));
      if (user.email && !email) setEmail(user.email);
    }
  }, [user, organizationId, email]);

  useEffect(() => {
    const stepFromParams = params.step as string;
    if (initialStep) {
      setStep(STEP_MAP[initialStep]);
    } else if (stepFromParams && STEP_MAP[stepFromParams as keyof typeof STEP_MAP]) {
      setStep(STEP_MAP[stepFromParams as keyof typeof STEP_MAP]);
    } else if (user) {
      const currentOrgId = organizationId || user.orgId || user.org?.id;
      if (!user.isVerified) setStep(2);
      else if (!currentOrgId) setStep(3);
      else if (!user.org?.subscription?.id) setStep(4);
      else router.replace('/(erp)');
    }
  }, [user, organizationId, initialStep, params.step, router]);

  const goToComplete = async () => {
    try {
      await onboarding?.setHasOnboarded(true);
      await onboarding?.setIsLoggedIn(true);
    } finally {
      router.replace('/(erp)');
    }
  };

  const handleRegister = async () => {
    setPasswordTouched(true);
    setConfirmTouched(true);

    if (!fullName || !email || !password) {
      setError('Full name, email, and password are required.');
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
    if (!otpCode) {
      setError('OTP code is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await AuthService.verifyEmail(email, otpCode);
      await refreshUser?.();
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
      setResendMessage('A fresh OTP was sent to your email.');
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
    if (!organizationId) {
      setError('Organization setup required first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await AuthService.createSubscription(organizationId, plan);
      const tempPassword = await AsyncStorage.getItem('temp_password');
      if (tempPassword && email) {
        try {
          await AuthService.login(email, tempPassword);
          await AsyncStorage.removeItem('temp_password');
        } catch { }
      } else {
        await refreshUser?.();
      }
      await goToComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription creation failed');
    } finally {
      setLoading(false);
    }
  };

  const title = ['Create your account', 'Verify your email', 'Name your workspace', 'Choose your plan'][step - 1];
  const subtitle = [
    'Set up the owner login for your KompraPOS workspace.',
    `Enter the 6-digit code sent to ${email || 'your email'}.`,
    'This becomes the store or company name shown in your dashboard.',
    'Start simple, then upgrade when your team needs more modules.',
  ][step - 1];
  const stepTitle = ['Register', 'Email Verification', 'Organization Setup', 'Subscription'][step - 1];


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

  const renderInput = (
    placeholder: string,
    value: string,
    onChangeText: (value: string) => void,
    options: Partial<React.ComponentProps<typeof TextInput>> = {},
  ) => (
    <TextInput
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor="#64748B"
      style={styles.input}
      {...options}
    />
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      //dataSet={{ authScreen: 'true' }}
    >
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <View style={[styles.shell, !isWide && styles.shellMobile]}>
        <View style={[styles.connectedPanel, !isWide && styles.connectedPanelMobile]}>
          {isWide ? (
            <View style={styles.brandRail}>
              <View style={styles.brandPattern} />
              <View style={styles.brandTop}>
                <View style={styles.brandMark}>
                  <Sparkles size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.brandName}>KompraPOS</Text>
              </View>
              <View style={styles.brandCopy}>
                <Text style={styles.brandEyebrow}>Launch your POS workspace</Text>
                <Text style={styles.brandTitle}>From first account to live operations in minutes.</Text>
                <Text style={styles.brandText}>
                  Build the business profile, verify ownership, and unlock the dashboard without losing focus.
                </Text>
              </View>
              <View style={styles.brandBadge}>
                <ShieldCheck size={18} color="#FFFFFF" />
                <Text style={styles.brandBadgeText}>Verified accounts protect store access</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <Image source={require('@/assets/images/logo_transparent.png')} style={styles.logo} resizeMode="contain" />

            <View style={styles.progressRow}>
              {STEP_LABELS.map((label, index) => {
                const number = index + 1;
                const active = number === step;
                const complete = number < step;
                return (
                  <View key={label} style={styles.progressItem}>
                    <View
                      style={[
                        styles.progressDot,
                        {
                          backgroundColor: active || complete ? colors.accent : colors.card,
                          borderColor: active || complete ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      {complete ? <CheckCircle2 size={14} color="#FFFFFF" /> : <Text style={{ color: active ? '#FFFFFF' : '#64748B', fontSize: 11, fontWeight: '800' }}>{number}</Text>}
                    </View>
                    <Text style={{ color: active ? '#0F172A' : '#64748B', fontSize: 11, fontWeight: '800' }}>{label}</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {step === 1 ? (
              <View style={styles.form}>
                {renderInput('Full name', fullName, setFullName)}
                {renderInput('Email address', email, setEmail, { keyboardType: 'email-address', autoCapitalize: 'none' })}

                <View>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      placeholder="Create a strong password"
                      value={password}
                      placeholderTextColor="#64748B"
                      onChangeText={(v) => { setPassword(v); setPasswordTouched(true); }}
                      onBlur={() => setPasswordTouched(true)}
                      secureTextEntry={!showPassword}
                      style={[
                        styles.input,
                        { paddingRight: 48 },
                        passwordTouched && password && !isPasswordStrong
                          ? { borderColor: '#ef4444' }
                          : {},
                        passwordTouched && isPasswordStrong
                          ? { borderColor: '#22c55e' }
                          : {},
                      ]}
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
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChangeText={(v) => { setConfirmPassword(v); setConfirmTouched(true); }}
                      onBlur={() => setConfirmTouched(true)}
                      secureTextEntry={!showConfirmPassword}
                      style={[
                        styles.input,
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
                {renderInput('Contact number', contactNumber, setContactNumber, { keyboardType: 'phone-pad' })}
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={handleRegister} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.replace('/login')} style={styles.linkButton}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>Already have an account?</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.form}>
                <View style={[styles.verificationIcon, { backgroundColor: colors.primaryLight }]}>
                  <MailCheck size={30} color={colors.primary} />
                </View>
                {renderInput('Enter 6-digit OTP', otpCode, setOtpCode, {
                  keyboardType: 'number-pad',
                  maxLength: 6,
                  textAlign: 'center',
                })}
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={handleVerify} disabled={loading || resendLoading}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Verify Email</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleResendOTP} disabled={loading || resendLoading} style={styles.linkButton}>
                  <Text style={[styles.linkText, { color: colors.primary }]}>
                    {resendLoading ? 'Sending...' : 'Resend code'}
                  </Text>
                </TouchableOpacity>
                {resendMessage ? <Text style={[styles.successText, { color: colors.success }]}>{resendMessage}</Text> : null}
              </View>
            ) : null}

            {step === 3 ? (
              <View style={styles.form}>
                <View style={[styles.verificationIcon, { backgroundColor: colors.accentLight }]}>
                  <Store size={30} color={colors.accent} />
                </View>
                {renderInput('Organization or store name', orgName, setOrgName)}

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
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={handleCreateOrg} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Create Workspace</Text>}
                </TouchableOpacity>
              </View>
            ) : null}

            {step === 4 ? (
              <View style={styles.form}>
                <View style={styles.planGrid}>
                  {(['BASIC', 'GOLD'] as const).map((option) => {
                    const selected = plan === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => setPlan(option)}
                        style={[
                          styles.planCard,
                          {
                            backgroundColor: selected ? colors.primaryLight : colors.card,
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.planTitle, { color: colors.text }]}>{option}</Text>
                        <Text style={[styles.planText, { color: colors.textSecondary }]}>
                          {option === 'BASIC' ? 'Core sales and inventory tools.' : 'Advanced ERP and analytics modules.'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={handleSubscription} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Finish Setup</Text>}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#07111F',
  },
  scroll: {
    flexGrow: 1,
    overflow: 'hidden',
  },
  orbOne: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    top: -150,
    left: -130,
    backgroundColor: 'rgba(37,99,235,0.18)',
  },
  orbTwo: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    right: -130,
    bottom: -150,
    backgroundColor: 'rgba(249,115,22,0.14)',
  },
  shell: {
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  shellMobile: {
    padding: 18,
  },
  connectedPanel: {
    width: '100%',
    maxWidth: 1100,
    minHeight: 650,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#203A5C',
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.32,
    shadowRadius: 46,
    elevation: 10,
  },
  connectedPanelMobile: {
    minHeight: 0,
    maxWidth: 540,
    borderRadius: 28,
  },
  brandRail: {
    flex: 1,
    maxWidth: 520,
    padding: 40,
    justifyContent: 'space-between',
    backgroundColor: '#0E1B2E',
    borderRightWidth: 1,
    borderRightColor: '#203A5C',
    overflow: 'hidden',
  },
  brandPattern: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    right: -110,
    top: -90,
    backgroundColor: 'rgba(37,99,235,0.18)',
  },
  brandTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E87722',
  },
  brandName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  brandCopy: {
    gap: 16,
  },
  brandEyebrow: {
    color: '#FDBA74',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 35,
    lineHeight: 42,
    fontWeight: '900',
    maxWidth: 460,
  },
  brandText: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 430,
  },
  brandBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0F172A',
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    width: '100%',
    maxWidth: 540,
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 44,
    overflow: 'hidden',
  },
  logo: {
    width: 174,
    height: 54,
    marginBottom: 24,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 28,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#0F172A',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  form: {
    gap: 14,
  },
  input: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: '#F8FAFC',
    borderColor: '#D8E1EE',
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },
  primaryButton: {
    minHeight: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    color: '#B91C1C',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    borderRadius: 18,
    marginBottom: 16,
    fontWeight: '700',
  },
  successText: {
    textAlign: 'center',
    fontWeight: '700',
  },
  verificationIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  planGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    minHeight: 130,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  planText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});

