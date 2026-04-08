import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.72, 280);

export type ERPScreen =
  | 'Dashboard'
  | 'Sales'
  | 'Inventory'
  | 'RestockScheduling'
  | 'HR'
  | 'Finance'
  | 'SalesAnalytics';

interface ERPDrawerProps {
  isOpen: boolean;
  currentScreen: ERPScreen;
  onNavigate: (screen: ERPScreen) => void;
  onClose: () => void;
}

const menuItems: { label: string; screen: ERPScreen; icon: string }[] = [
  { label: 'Dashboard', screen: 'Dashboard', icon: '📊' },
  { label: 'Sales', screen: 'Sales', icon: '🛒' },
  { label: 'Inventory', screen: 'Inventory', icon: '📦' },
  { label: 'Restock Item', screen: 'RestockScheduling', icon: '📦' },
  { label: 'HR', screen: 'HR', icon: '👥' },
  { label: 'Finance', screen: 'Finance', icon: '💰' },
  { label: 'Sales Analytics', screen: 'SalesAnalytics', icon: '📈' },
];

export function ERPDrawer({ isOpen, currentScreen, onNavigate, onClose }: ERPDrawerProps) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isOpen ? 0 : -DRAWER_WIDTH,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: overlayOpacity },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.card,
            borderRightColor: colors.border,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.drawerLogo, { color: colors.accent }]}>⚡</Text>
          <View>
            <Text style={[styles.drawerTitle, { color: colors.text }]}>ERP Suite</Text>
            <Text style={[styles.drawerSubtitle, { color: colors.textSecondary }]}>
              Right Apps Inc.
            </Text>
          </View>
        </View>

        {/* Menu items */}
        <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>MODULES</Text>
          {menuItems.map((item) => {
            const isActive = currentScreen === item.screen;
            return (
              <TouchableOpacity
                key={item.screen}
                style={[
                  styles.menuItem,
                  isActive && { backgroundColor: colors.accent + '18' },
                ]}
                onPress={() => {
                  onNavigate(item.screen);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.menuLabel,
                    {
                      color: isActive ? colors.accent : colors.text,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {item.label}
                </Text>
                {isActive && (
                  <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            ERP v1.0 · Mock Mode
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    borderRightWidth: 1,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    paddingTop: 48,
    borderBottomWidth: 1,
  },
  drawerLogo: {
    fontSize: 28,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  drawerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  menuList: {
    flex: 1,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginHorizontal: 8,
    marginBottom: 2,
    borderRadius: 10,
    gap: 12,
    position: 'relative',
  },
  menuIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: 15,
    flex: 1,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
  },
});