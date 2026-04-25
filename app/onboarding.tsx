import React, { useState } from 'react';
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
} from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router'; // Changed to useRouter hook for consistency
import { useTheme } from '@/contexts/ThemeContext';
import { responsive } from '@/styles/desktopAndTablet';

interface Props {
  isDesktop?: boolean;
}

export default function LoginScreenDefault({ isDesktop }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setLoading] = useState(false);
  
  const router = useRouter();
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
      // Navigate to the root/dashboard after successful login
      router.replace('/');
    } catch (error) {
      Alert.alert('Login Failed', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Welcome Back
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to your POS account
          </Text>
        </View>

        <View
          style={[
            styles.form,
            isDesktop && responsive.desktopPadding,
            isTablet && responsive.tabletPadding,
          ]}
        >
          {/* Email Input */}
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

          {/* Password Input */}
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

          {/* Sign In Button */}
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

        {/* Registration Section */}
<View style={styles.registrationContainer}>
  <Text style={[styles.registrationTitle, { color: colors.textSecondary }]}>
    New here? Register as:
  </Text>
  <View style={styles.registrationLinks}>
    <TouchableOpacity onPress={() => router.push('/onboarding')}>
      <Text style={[styles.linkText, { color: colors.accent }]}>
        Store Seller
      </Text>
    </TouchableOpacity>

    <View style={[styles.separator, { backgroundColor: colors.border }]} />

    {/* UPDATED CONNECTION: Pointing to the supplier registration file */}
    <TouchableOpacity onPress={() => router.push('/supplier-onboarding')}>
      <Text style={[styles.linkText, { color: colors.accent }]}>
        Supplier
      </Text>
    </TouchableOpacity>
  </View>
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  eyeButton: {
    padding: 10,
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
  registrationContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  registrationTitle: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
  registrationLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  linkText: {
    fontWeight: '700',
    fontSize: 15,
  },
  separator: {
    width: 1,
    height: 18,
  },
  poweredBy: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    marginTop: 60,
    justifyContent: 'center',
  },
  poweredlogo: {
    width: 180,
    height: 50,
    borderRadius: 40,
    resizeMode: 'contain',
  },
});