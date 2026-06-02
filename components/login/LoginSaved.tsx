import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Eye, EyeOff, LockKeyhole, Sparkles, Store, UserRound, UsersRound } from 'lucide-react-native';
import { router } from 'expo-router';
import { User } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  user: User;
  onRemoveUser: () => void;
  isDesktop?: boolean;
}

export default function LoginSaved({ user, onRemoveUser, isDesktop }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, loginWithBiometric, removeUser, isBiometricSupported, isBiometricEnabled } = useAuth();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  useEffect(() => {
    setEmail(user.email);
    checkBiometricAvailability();
  }, [user]);

  const checkBiometricAvailability = async () => {
    const supported = await isBiometricSupported();
    const enabled = await isBiometricEnabled();
    setBiometricSupported(supported);
    setBiometricEnabledState(enabled);
  };

  const handleRemoveUser = async () => {
    const proceed = isDesktop
      ? window.confirm('Use a different account on this device?')
      : true;

    if (!proceed) return;

    if (!isDesktop) {
      Alert.alert('Use another account?', 'This removes the saved user from this device.', [
        { text: 'Cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            await removeUser();
            onRemoveUser();
          },
        },
      ]);
      return;
    }

    await removeUser();
    onRemoveUser();
  };

  const handleLogin = async () => {
    if (isLoading) return;
    if (!email.trim() || !password.trim()) {
      setError('Enter your password to unlock this workspace.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.replace('/');
    } catch (error) {
      setError((error as Error).message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (isLoading) return;
    setLoading(true);
    try {
      await loginWithBiometric();
    } catch (error) {
      setError((error as Error).message || 'Biometric login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} dataSet={{ authScreen: 'true' }}>
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <View style={styles.shell}>
        <View style={styles.card}>
          <View style={styles.cardGlow} />
          <View style={styles.logoWrap}>
            <Image
              source={require('@/assets/images/logo_transparent.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.kicker}>
            <Sparkles size={14} color={colors.accent} />
            <Text style={[styles.kickerText, { color: colors.textSecondary }]}>
              Saved workspace
            </Text>
          </View>

          <View style={[styles.profileBadge, { backgroundColor: colors.primaryLight }]}>
            <UserRound size={34} color={colors.primary} strokeWidth={2.2} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
          <Text style={[styles.name, { color: colors.textSecondary }]}>{user.fullname}</Text>

          <View style={styles.metaRow}>
            <View style={[styles.metaPill, { borderColor: colors.border }]}>
              <Store size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {user.org?.name || 'Kompra workspace'}
              </Text>
            </View>
            <View style={[styles.metaPill, { borderColor: colors.border }]}>
              <UsersRound size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{user.role || 'User'}</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputShell}>
            <LockKeyhole size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowPassword((v) => !v)}>
              {showPassword ? (
                <EyeOff size={19} color={colors.textSecondary} />
              ) : (
                <Eye size={19} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            style={[styles.primaryButton, { backgroundColor: colors.accent }, isLoading && { opacity: 0.7 }]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Unlock Workspace</Text>
            )}
          </TouchableOpacity>

          {biometricSupported && biometricEnabled ? (
            <TouchableOpacity
              onPress={handleBiometricLogin}
              style={[styles.secondaryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Use biometric login</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity onPress={handleRemoveUser} style={styles.switchButton}>
            <Text style={[styles.switchText, { color: colors.primary }]}>Use a different account</Text>
          </TouchableOpacity>
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
    width: 360,
    height: 360,
    borderRadius: 180,
    top: -110,
    left: -90,
    backgroundColor: 'rgba(37,99,235,0.18)',
  },
  orbTwo: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    right: -130,
    bottom: -160,
    backgroundColor: 'rgba(249,115,22,0.14)',
  },
  shell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderRadius: 28,
    padding: 38,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E1EE',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.12,
    shadowRadius: 42,
    elevation: 8,
  },
  cardGlow: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(29,78,216,0.1)',
  },
  logoWrap: {
    width: 174,
    height: 54,
    marginBottom: 14,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  kicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 20,
    backgroundColor: 'rgba(29,78,216,0.08)',
  },
  kickerText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  profileBadge: {
    width: 86,
    height: 86,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 6,
  },
  name: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorBox: {
    width: '100%',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  inputShell: {
    width: '100%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 18,
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
    width: '100%',
    minHeight: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E87722',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 50,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontWeight: '800',
  },
  switchButton: {
    marginTop: 22,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
