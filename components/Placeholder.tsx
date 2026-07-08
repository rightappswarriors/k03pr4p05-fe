// components/PlaceholderScreen.tsx

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Construction, LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface PlaceholderScreenProps {
  title?: string;
  message?: string;
  icon?: LucideIcon;
}

// Drop this in for any route/screen that isn't built yet:
//
//   export default function Revenue() {
//     return <PlaceholderScreen title="Revenue" />;
//   }
//
// It'll pick up a sensible default message and icon, or you can override both.
export default function PlaceholderScreen({
  title = 'This page',
  message = "We're still building this out. Check back soon.",
  icon: Icon = Construction,
}: PlaceholderScreenProps) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  const styles = makeStyles(colors);

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Animated.View style={[styles.iconRing, { transform: [{ scale }], opacity }]}>
          <View style={styles.iconCircle}>
            <Icon size={30} color={colors.primary} strokeWidth={2} />
          </View>
        </Animated.View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>IN DEVELOPMENT</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      alignItems: 'center',
      backgroundColor: colors.sidebar,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    iconRing: {
      marginBottom: 18,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '1A',
    },
    badge: {
      backgroundColor: colors.accent,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      marginBottom: 14,
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });