import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  isDesktop?: boolean;
}

export default function LoginScreenDefault({ isDesktop }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { colors } = useTheme();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.replace('/');
    } catch (error: any) {
      const message = (error as Error).message || 'Something went wrong';

      if (message.toLowerCase().includes('verify your email')) {
        if (Platform.OS === 'web') {
          window.alert('Login Failed: ' + message);
        } else {
          Alert.alert('Login Failed', message);
        }

        router.replace({
          pathname: '/onboarding',
          params: { step: 'verify', email },
        });
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const showSplit = !!isDesktop;

  return (
    <SafeAreaView style={styles.screen} dataSet={{ authScreen: 'true' }}>
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <View style={[styles.shell, !showSplit && styles.shellMobile]}>
        <View style={[styles.connectedPanel, !showSplit && styles.connectedPanelMobile]}>
          {showSplit ? (
            <View style={styles.brandRail}>
              <View style={styles.brandPattern} />
              <View style={styles.brandTop}>
                <View style={styles.brandMark}>
                  <Sparkles size={22} color="#FFFFFF" strokeWidth={2.4} />
                </View>
                <Text style={styles.brandName}>KompraPOS</Text>
              </View>

              <View style={styles.brandCopy}>
                <Text style={styles.brandEyebrow}>Retail command center</Text>
                <Text style={styles.brandTitle}>
                  A cleaner command center for modern retail teams.
                </Text>
                <Text style={styles.brandText}>
                  Built for teams that need a fast POS today and a more organized operation tomorrow.
                </Text>
              </View>

              <View style={styles.brandBadge}>
                <ShieldCheck size={18} color="#FFFFFF" />
                <Text style={styles.brandBadgeText}>Secure owner and staff access</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
          <View style={styles.logoWrap}>
            <Image
              source={require('@/assets/images/logo_transparent.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue managing your store.
          </Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <View style={styles.inputShell}>
              <Mail size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="you@company.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputShell}>
              <LockKeyhole size={18} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowPassword((v) => !v)}>
                {showPassword ? (
                  <EyeOff size={19} color="#64748B" />
                ) : (
                  <Eye size={19} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            style={[styles.primaryButton, { backgroundColor: colors.accent }, isLoading && { opacity: 0.7 }]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={{ color: '#64748B' }}>New to Kompra?</Text>
            <TouchableOpacity onPress={() => router.replace('/onboarding')}>
              <Text style={[styles.linkText, { color: colors.primary }]}>Create account</Text>
            </TouchableOpacity>
          </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#07111F',
  },
  orbOne: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    top: -150,
    right: -120,
    backgroundColor: 'rgba(37,99,235,0.18)',
  },
  orbTwo: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    left: -120,
    bottom: -140,
    backgroundColor: 'rgba(249,115,22,0.14)',
  },
  shell: {
    flex: 1,
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
    minHeight: 620,
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
    maxWidth: 520,
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
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    maxWidth: 430,
  },
  brandText: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 420,
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
    maxWidth: 520,
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 44,
    overflow: 'hidden',
  },
  logoWrap: {
    alignSelf: 'flex-start',
    width: 174,
    height: 54,
    marginBottom: 30,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: '#0F172A',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 30,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  inputShell: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderColor: '#D8E1EE',
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },
  iconButton: {
    padding: 6,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#E87722',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  linkText: {
    fontWeight: '800',
  },
});
