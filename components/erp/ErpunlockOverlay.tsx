import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ERPUnlockOverlayProps {
  visible: boolean;
  onUnlock: () => void;
}

export default function ERPUnlockOverlay({ visible, onUnlock }: ERPUnlockOverlayProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleUnlock = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 300, useNativeDriver: true }),
    ]).start(() => onUnlock());
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(11, 27, 55, 0.92)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 40,
      alignItems: 'center',
      maxWidth: 420,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
      elevation: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    lockIcon: {
      fontSize: 32,
    },
    badge: {
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      marginBottom: 16,
    },
    badgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
      letterSpacing: -0.5,
    },
    description: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 32,
    },
    featureRow: {
      width: '100%',
      marginBottom: 28,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    featureDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
      marginRight: 12,
    },
    featureText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    unlockButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 16,
      paddingHorizontal: 48,
      width: '100%',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    unlockButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    subtext: {
      marginTop: 14,
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

  const features = [
    'Dashboard & Analytics',
    'Sales Order Management',
    'Inventory Tracking',
    'HR & Employee Records',
    'Finance & Profit Reporting',
  ];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.iconContainer}>
            <Text style={styles.lockIcon}>🔐</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Premium Module</Text>
          </View>
          <Text style={styles.title}>Unlock Full ERP</Text>
          <Text style={styles.description}>
            ERP modules give you enterprise-grade visibility across sales, inventory, HR, and
            finance — all in one unified dashboard.
          </Text>
          <View style={styles.featureRow}>
            {features.map((f) => (
              <View key={f} style={styles.featureItem}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock} activeOpacity={0.85}>
            <Text style={styles.unlockButtonText}>Unlock ERP — Free Trial</Text>
          </TouchableOpacity>
          <Text style={styles.subtext}>No payment required for this session</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}