import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { Fingerprint, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useLoading } from '@/contexts/LoadingContext';
import { responsive } from '@/styles/desktopAndTablet';
interface Props {
  isDesktop?: boolean;
}
export default function LoginScreenDefault({ isDesktop }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const { colors, theme } = useTheme();
  const { login } = useAuth();
  const { isTablet } = useResponsive();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    setLoading(true);

    try {
      await login(email, password);
      // Don't redirect here - let the navigation logic in index.tsx handle routing
      // based on user onboarding state
      router.replace('/');
    } catch (error: any) {
      const message = (error as Error).message || 'Something went wrong';

      const showAlert = () => {
        if (Platform.OS === 'web') {
          alert('Login Failed: ' + message);
        } else {
          Alert.alert('Login Failed', message);
        }
      };

      // Check if user needs email verification
      if (message.toLowerCase().includes('verify your email')) {
        showAlert(); // 👈 show alert FIRST

        router.replace({
          pathname: '/onboarding',
          params: { step: 'verify', email },
        });

        return; // 👈 stop further execution
      }

      // Default case
      showAlert();
    } finally {
      setLoading(false);
    }
  };
  const icon =
    theme === 'dark'
      ? require('@/assets/images/icon_dark.png')
      : require('@/assets/images/icon_light.png');

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          {/**<Image source={icon} style={styles.logo} />**/}
          <Text style={[styles.title, { color: colors.text }]}>
            Welcome Back
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to your Kompra portal account
          </Text>
        </View>

        <View
          style={[
            styles.form,
            isDesktop && responsive.desktopPadding,
            isTablet && responsive.tabletPadding,
          ]}
        >
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View
              style={[
                styles.passwordContainer,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                keyboardType="default"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#6B7280" />
                ) : (
                  <Eye size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleLogin}
            style={[
              { backgroundColor: colors.accent },
              styles.loginButton,
              isLoading && { backgroundColor: colors.accentLight },
            ]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <Text style={{ color: colors.textSecondary }}>New here?</Text>
          <TouchableOpacity onPress={() => router.replace('/onboarding')}>
            <Text style={{ color: colors.accent, fontWeight: '700' }}>
              Get Started
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.poweredBy}>
          <Text style={{ color: colors.textSecondary }}>KompraPOS:</Text>
          <Image
            source={require('@/assets/images/logo_transparent.png')}
            style={[styles.poweredlogo, { backgroundColor: colors.card }]}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeButton: {
    padding: 14,
  },
  loginButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF4FF',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
    gap: 8,
  },
  biometricButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  demoSection: {
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  demoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  demoButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  demoButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  poweredBy: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    marginTop: 80,
    justifyContent: 'center',
  },
  poweredlogo: {
    width: 180,
    height: 50,
    borderRadius: 40,
  },
});
