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

interface OnboardingScreenProps {
  initialStep?: 'register' | 'verify' | 'organization' | 'subscription';
}

export default function OnboardingScreen({
  initialStep,
}: OnboardingScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const onboarding = useContext(OnboardingContext);
  const { user, refreshUser } = useAuth();

  // Map string steps to numbers for backward compatibility
  const stepMap = {
    register: 1,
    verify: 2,
    organization: 3,
    subscription: 4,
  };

  useEffect(() => {
    // Pre-fill email if passed via params (e.g. from failed login)
    if (params.email && typeof params.email === 'string') {
      setEmail(params.email);
    }
  }, [params.email]);
  const [step, setStep] = useState<number>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [plan, setPlan] = useState<'BASIC' | 'GOLD'>('BASIC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  // Set organizationId whenever user data is available
  useEffect(() => {
    if (user) {
      const orgId = user.orgId || user.org?.id;
      if (orgId && !organizationId) {
        setOrganizationId(Number(orgId));
        console.log('[Onboarding] Set organizationId from user data:', orgId);
      }
      // Also set email from user data if not already set
      if (user.email && !email) {
        setEmail(user.email);
        console.log('[Onboarding] Set email from user data:', user.email);
      }
    }
  }, [user, organizationId, email]);
  // Determine initial step based on user state or prop or URL param
  useEffect(() => {
    const stepFromParams = params.step as string;
    if (initialStep) {
      setStep(stepMap[initialStep]);
    } else if (
      stepFromParams &&
      stepMap[stepFromParams as keyof typeof stepMap]
    ) {
      setStep(stepMap[stepFromParams as keyof typeof stepMap]);
    } else if (user) {
      // Determine step based on user state
      console.log('[Onboarding] User state:', {
        isVerified: user.isVerified,
        orgId: user.orgId,
        orgIdFromRelation: user.org?.id,
        hasSubscription: !!user.org?.subscription?.id,
      });

      if (!user.isVerified) {
        setStep(2); // Verify email
      } else if (!user.orgId && !user.org?.id) {
        setStep(3); // Create organization
      } else if (!user.org?.subscription?.id) {
        setStep(4); // Choose subscription
        console.log('[Onboarding] User has org, going to subscription step');
      } else {
        // Fully onboarded, redirect to dashboard
        console.log(
          '[Onboarding] User fully onboarded, redirecting to dashboard',
        );
        router.replace('/(erp)/erp');
      }
    }
  }, [user, initialStep, params.step, router, stepMap]);
  const goToComplete = async () => {
    try {
      console.log('[Onboarding] goToComplete: Starting completion process');
      if (onboarding) {
        console.log('[Onboarding] goToComplete: Setting onboarding states...');
        await onboarding.setHasOnboarded(true);
        await onboarding.setIsLoggedIn(true);

        console.log('[Onboarding] goToComplete: Onboarding states set successfully');
      }
      console.log('[Onboarding] goToComplete: Navigating to admin dashboard...');
      router.replace('/(erp)/erp');
    } catch (error) {
      console.error('[Onboarding] goToComplete: Error during completion:', error);
      console.log('[Onboarding] goToComplete: Attempting navigation despite error...');
      router.replace('/(erp)/erp');
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      setError('Full name, email and password are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await AuthService.registerUser({
        fullname: fullName,
        email,
        password,
        contactNumber,
      });
      // Store password temporarily for auto-login after subscription
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
      setError('OTP code is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await AuthService.verifyEmail(email, otpCode);
      // Refresh user context after successful verification
      if (refreshUser) {
        await refreshUser();
      }
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
    if (!orgName) {
      setError('Organization name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {

      console.log('[Onboarding] handleCreateOrg: Creating organization:', orgName);
      const org = await AuthService.createOrganization(orgName);
      console.log('[Onboarding] handleCreateOrg: Organization created:', org);
      console.log('[Onboarding] handleCreateOrg: Setting organizationId to', org.id);
      setOrganizationId(org.id);

      // During onboarding, we don't need to refresh user context
      // We'll let the subscription step handle the final refresh
      console.log('[Onboarding] handleCreateOrg: Advancing to subscription step (step 4)');
      setStep(4);
      console.log('[Onboarding] handleCreateOrg: Successfully advanced to step 4');
    } catch (err) {
      console.error('[Onboarding] handleCreateOrg: Caught error:', err);

      setError(
        err instanceof Error ? err.message : 'Organization creation failed',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubscription = async () => {
    if (!organizationId) {
      setError('Organization setup required first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      console.log('[Onboarding] handleSubscription: Creating subscription with plan:', plan);
      await AuthService.createSubscription(organizationId, plan);
      console.log('[Onboarding] handleSubscription: Subscription created successfully');

      // Check if we need to auto-login (fresh registration flow) or if already authenticated (login flow)
      const tempPassword = await AsyncStorage.getItem('temp_password');
      if (tempPassword && email) {
        // Fresh registration flow: user came from register → verify → organization → subscription
        console.log('[Onboarding] handleSubscription: Fresh registration detected, auto-logging in');
        try {
          await AuthService.login(email, tempPassword);
          await AsyncStorage.removeItem('temp_password');
          console.log('[Onboarding] handleSubscription: Auto-login successful');
        } catch (loginErr) {
          console.warn('[Onboarding] handleSubscription: Auto-login failed, but continuing:', loginErr);
          // Continue even if login fails - user might be able to navigate
        }
      } else {
        // Login flow: user logged in and is completing onboarding
        // Already authenticated, just refresh user context
        console.log('[Onboarding] handleSubscription: Existing user completing onboarding, refreshing context');
        if (refreshUser) {
          try {
            await refreshUser();
            console.log('[Onboarding] handleSubscription: User context refreshed');
          } catch (refreshErr) {
            console.warn('[Onboarding] handleSubscription: User refresh failed, continuing anyway:', refreshErr);
          }
        }
      }

      console.log('[Onboarding] handleSubscription: Going to completion');
      await goToComplete();
    } catch (err) {
      console.error('[Onboarding] handleSubscription: Error:', err);
      setError(
        err instanceof Error ? err.message : 'Subscription creation failed',
      );
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = [
    'Register',
    'Email Verification',
    'Organization Setup',
    'Subscription',
  ][step - 1];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>
          {stepTitle}
        </Text>

        {error ? (
          <Text
            style={{
              color: '#ef4444',
              fontSize: 13,
              padding: 10,
              backgroundColor: '#fee2e2',
              borderRadius: 6,
            }}
          >
            {error}
          </Text>
        ) : null}

        {step === 1 && (
          <>
            <TextInput
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 6,
                padding: 12,
                backgroundColor: colors.surface,
                color: colors.text,
              }}
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 6,
                padding: 12,
                backgroundColor: colors.surface,
                color: colors.text,
              }}
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 6,
                padding: 12,
                backgroundColor: colors.surface,
                color: colors.text,
              }}
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              placeholder="Contact Number"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 6,
                padding: 12,
                backgroundColor: colors.surface,
                color: colors.text,
              }}
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              style={{
                backgroundColor: colors.primary,
                padding: 14,
                borderRadius: 6,
                alignItems: 'center',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  Register
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            {/* OTP Verification UI Improvements */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                Verify Your Email
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: colors.textSecondary,
                  textAlign: 'center',
                }}
              >
                Code was sent to {email}
              </Text>
            </View>

            <TextInput
              placeholder="Enter 6-digit OTP code"
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 6,
                padding: 16,
                backgroundColor: colors.surface,
                color: colors.text,
                fontSize: 18,
                textAlign: 'center',
                letterSpacing: 8,
              }}
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity
              onPress={handleVerify}
              disabled={loading || resendLoading}
              style={{
                backgroundColor: colors.primary,
                padding: 14,
                borderRadius: 6,
                alignItems: 'center',
                marginTop: 10,
                opacity: loading || resendLoading ? 0.5 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  Verify OTP
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={loading || resendLoading}
              style={{
                padding: 14,
                borderRadius: 6,
                alignItems: 'center',
                marginTop: 10,
                opacity: loading || resendLoading ? 0.5 : 1,
              }}
            >
              {resendLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  Resend Code
                </Text>
              )}
            </TouchableOpacity>

            {resendMessage ? (
              <Text
                style={{
                  color: '#10b981',
                  fontSize: 14,
                  textAlign: 'center',
                  marginTop: 10,
                }}
              >
                {resendMessage}
              </Text>
            ) : null}
          </>
        )}

        {step === 3 && (
          <>
            <TextInput
              placeholder="Organization Name"
              value={orgName}
              onChangeText={setOrgName}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 6,
                padding: 12,
                backgroundColor: colors.surface,
                color: colors.text,
              }}
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity
              onPress={handleCreateOrg}
              disabled={loading}
              style={{
                backgroundColor: colors.primary,
                padding: 14,
                borderRadius: 6,
                alignItems: 'center',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  Create Organization
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 4 && (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {['BASIC', 'GOLD'].map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setPlan(option as 'BASIC' | 'GOLD')}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor:
                      plan === option ? colors.primary : colors.border,
                    backgroundColor:
                      plan === option ? colors.primary : colors.surface,
                    borderRadius: 6,
                    padding: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{ color: plan === option ? '#fff' : colors.text }}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSubscription}
              disabled={loading}
              style={{
                backgroundColor: colors.primary,
                padding: 14,
                borderRadius: 6,
                alignItems: 'center',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  Finish Onboarding
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}
