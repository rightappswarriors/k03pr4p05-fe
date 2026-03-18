import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';
import { Fingerprint, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { User } from '@/types/index';
import { styles } from '@/styles/loginStyle';
import { useTheme } from '@/contexts/ThemeContext';
import { useLoading } from '@/contexts/LoadingContext';
import { responsive } from '@/styles/desktopAndTablet';
interface Props {
  user: User;
  onRemoveUser: () => void;
  isDesktop?: boolean;
}
export default function LoginScreenDefault({
  user,
  onRemoveUser,
  isDesktop,
}: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { isLoading, setLoading } = useLoading();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  const {
    login,
    loginWithBiometric,
    removeUser,
    isBiometricSupported,
    isBiometricEnabled,
  } = useAuth();
  const { isTablet } = useResponsive();
  useEffect(() => {
    setLoading(true);
    setEmail(user.email);
    checkBiometricAvailability();
    setLoading(false);
  }, [isLoading]);

  const checkBiometricAvailability = async () => {
    const supported = await isBiometricSupported();
    const enabled = await isBiometricEnabled();
    setBiometricSupported(supported);
    setBiometricEnabledState(enabled);
  };
  const handleRemoveUser = async () => {
    if (isDesktop) {
      const confirmed = window.confirm(
        'Are you sure you want to remove this user?',
      );
      if (confirmed) {
        try {
          await removeUser();
          onRemoveUser();
        } catch (error) {
          //console.error('Failed to remove user', error);
          Alert.alert('Error', 'Failed to log out user. Please try again.');
        }
      }
    } else {
      Alert.alert(
        'Remove Saved Acount',
        'Are you sure you want to remove this user?',
        [
          {
            text: 'No',
          },
          {
            text: 'Yes',
            onPress: async () => {
              try {
                await removeUser();
                onRemoveUser();
              } catch (error) {
                //console.error('Failed to remove user', error)
                Alert.alert(
                  'Error',
                  'Failed to remove user. Please try again.',
                );
              }
            },
          },
        ],
      );
    }
  };
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      if (isDesktop) {
        window.alert('Error Please enter both email and password');
      } else Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error) {
      if (isDesktop) {
        window.alert('Login Failed');
      } else Alert.alert('Login Failed', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const handleBiometricLogin = async () => {
    try {
      await loginWithBiometric();
    } catch (error) {
      Alert.alert('Biometric Login Failed', (error as Error).message);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            source={{
              uri: 'https://static.vecteezy.com/system/resources/previews/002/534/006/original/social-media-chatting-online-blank-profile-picture-head-and-body-icon-people-standing-icon-grey-background-free-vector.jpg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
            }}
            style={styles.logo}
          />
          <Text style={[styles.title, { color: colors.text }]}>
            Welcome back
          </Text>
          <Text style={[styles.name, { color: colors.textSecondary }]}>
            {user.name}
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
            <View
              style={[
                styles.passwordContainer,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[
                  styles.passwordInput,
                  { color: colors.text, borderWidth: 0 },
                  isDesktop && { outline: 'none' },
                  isTablet && { outline: 'none' },
                ]}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                keyboardType="default"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                underlineColorAndroid={
                  isDesktop && isTablet ? 'transparent' : ''
                }
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
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
          {biometricSupported && biometricEnabled && (
            <TouchableOpacity
              onPress={handleBiometricLogin}
              style={styles.biometricButton}
            >
              <Text style={styles.biometricButtonText}>Use Biometric</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.demoSection}>
          <Text style={[styles.demoTitle, { color: colors.textSecondary }]}>
            Not you?
          </Text>
          <View style={styles.demoButtons}>
            <TouchableOpacity
              onPress={() => handleRemoveUser()}
              style={[styles.demoButton, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.demoButtonText, { color: colors.text }]}>
                Log in with a different account.
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.poweredBy}>
          <Text style={{ color: colors.textSecondary }}>Powered By:</Text>
          <Image
            source={require('@/assets/images/logo_transparent.png')}
            style={[styles.poweredlogo, { backgroundColor: colors.card}]}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
