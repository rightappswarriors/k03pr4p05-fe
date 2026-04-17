import { ShoppingCart, History, Printer, Settings, Clock } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet,
  useWindowDimensions,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Platform } from 'react-native';
interface ResponsiveTabLayoutProps {
  children: React.ReactNode;
}

const DEFAULT_TABS =
  Platform.OS === 'web'
    ? [
        { name: 'index', title: 'POS', icon: ShoppingCart },
        { name: 'history', title: 'Orders', icon: History },
        { name: 'settings', title: 'Settings', icon: Settings },
      ]
    : [
        { name: 'index', title: 'POS', icon: ShoppingCart },
        { name: 'history', title: 'Orders', icon: History },
        { name: 'printer', title: 'Printer', icon: Printer },
        { name: 'settings', title: 'Settings', icon: Settings },
      ];

const EMPLOYEE_TABS =
  Platform.OS === 'web'
    ? [
        { name: 'index', title: 'Attendance', icon: Clock },
        { name: 'history', title: 'Settings', icon: Settings },
      ]
    : [
        { name: 'index', title: 'Attendance', icon: Clock },
        { name: 'history', title: 'Settings', icon: Settings },
      ];
import { useResponsive } from '@/hooks/useResponsive';
import MainScreen from '@/app/(tabs)';
import HistoryScreen from '@/app/(tabs)/history';
import PrinterScreen from '@/app/(tabs)/printer';
import SettingsScreen from '@/app/(tabs)/settings';
import EmployeeAttendanceScreen from '@/app/(employee)/index';
import EmployeeSettingScreen from '@/app/(employee)/settings';
export default function ResponsiveTab({ name }: { name?: 'employee' | null }) {
  const { isDesktop } = useResponsive();
  const [currentRoute, setCurrentRoute] = useState('index');
  let renderCurrentScreen;
  if (name === 'employee') {
    renderCurrentScreen = () => {
      switch (currentRoute) {
        case 'index':
          return <EmployeeAttendanceScreen />;
        case 'history':
          return <EmployeeSettingScreen />;
        default:
          break;
      }
    };
  } else {
    renderCurrentScreen = () => {
      switch (currentRoute) {
        case 'index':
          return <MainScreen />;
        case 'history':
          return <HistoryScreen />;
        case 'printer':
          return <PrinterScreen />;
        case 'settings':
          return <SettingsScreen />;
        default:
          return null;
      }
    };
  }

  const { colors } = useTheme();
  const tabs = name === 'employee' ? EMPLOYEE_TABS : DEFAULT_TABS;

  if (isDesktop) {
    return (
      <View
        style={[
          styles.desktopContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <SafeAreaView
          edges={['bottom']}
          style={[styles.sidebar, { borderColor: colors.border }]}
        >
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = currentRoute === tab.name;

            return (
              <TouchableOpacity
                key={tab.name}
                style={[styles.sidebarTab, isActive && styles.sidebarTabActive]}
                onPress={() => setCurrentRoute(tab.name)}
              >
                <IconComponent
                  size={20}
                  color={isActive ? '#2563EB' : colors.textSecondary}
                />
              </TouchableOpacity>
            );
          })}
        </SafeAreaView>
        <View style={styles.desktopContent}>{renderCurrentScreen()}</View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 55,
    borderRightWidth: 1,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 16,
  },
  sidebarTab: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarTabActive: {
    backgroundColor: '#EBF4FF10',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  desktopContent: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    paddingVertical: 15,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bottomTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomTabTextActive: {
    color: '#2563EB',
  },
});
