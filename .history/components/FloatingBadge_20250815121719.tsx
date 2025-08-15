import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';

export default function FloatingBadge() {
  const [showDialog, setShowDialog] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  const { colors } = useTheme();
  const { isMobile } = useResponsive();

  const handlePress = () => {
    setShowDialog(prev => !prev);
  };

  useEffect(() => {
    if (showDialog) {
      // Fade & slide in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true
        })
      ]).start();
    } else {
      // Fade & slide out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.ease,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 10,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true
        })
      ]).start();
    }
  }, [showDialog]);

  return (
    <>
      {showDialog && (
        <Animated.View
          style={[
            styles.dialogBox,
            { backgroundColor: colors.card },
            isMobile && { bottom: 125 },
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={[styles.dialogText, { color: colors.text }]}>
            Contact rightapps@gmail.com
          </Text>
          <Text style={[styles.dialogText, { color: colors.text }]}>
            Upgrade to the{' '}
            <Text style={[styles.link, { color: colors.primary }]}>
              Pro plan
            </Text>{' '}
            to Activate pro features.
          </Text>
        </Animated.View>
      )}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.6}>
        <View
          style={[
            styles.floatingButton,
            { backgroundColor: colors.background },
            isMobile && { bottom: 105 }
          ]}
        >
          <Text style={[styles.badgeText, { color: colors.text }]}>
            Powered by Right Apps
          </Text>
        </View>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  dialogBox: {
    position: 'absolute',
    bottom: 40,
    width: 200,
    right: 20,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999
  },
  dialogText: {
    fontSize: 12,
    marginBottom: 4
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline'
  },
  floatingButton: {
    position: 'absolute',
    width: 160,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 10,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10000
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold'
  }
});
