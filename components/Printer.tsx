import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { useBluetooth } from "@/hooks/useBluetooth"

import { Printer, Bluetooth, Usb, Settings, CircleCheck as CheckCircle, Circle as XCircle, Wifi, } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive';
export default React.memo(function PrinterScreen() {
  const {
    colors
  } = useTheme()
  //if (Platform.OS === 'android') {
  const {
    devices,
    printReceipt,
    connectedDevice,
    connectToPrinter,
    scanForDevices } = useBluetooth()
  //}
  // Network connection inputs
  const [networkPrinters, setNetworkPrinters] = useState<any[]>([]);

  const { isMobile } = useResponsive()
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [printerStatus, setPrinterStatus] = useState<'disconnected' | 'connected' | 'connecting'>('disconnected');
  const [connectionType, setConnectionType] = useState<'bluetooth' | 'usb' | 'ethernet' | 'wifi' | 'cloud' | null>(null);
  const [activeTab, setActiveTab] = useState<'bluetooth' | 'usb' | 'ethernet' | 'wifi' | 'cloud'>('bluetooth');
  const [isScanning, setIsScanning] = useState(false);

  const scanForDevicesList = async (type: typeof activeTab) => {
    setIsScanning(true);
    try {
      switch (type) {
        case 'bluetooth':
          try {
            scanForDevices()
            setAvailableDevices([connectedDevice, devices]);
          } catch (error: any) {
            //console.error("Error: ", error)
            Alert.alert('Bluetooth Error', error.message);
            setAvailableDevices([]);
          } finally {
            setIsScanning(false)
          }
          break;
        case 'usb':
          try {
            //const usbDevices = await PrinterService.scanUSBDevices();
            //setAvailableDevices(usbDevices);
          } catch (error: any) {
            Alert.alert('USB Error', error.message);
            setAvailableDevices([]);
          }
          break;
        case 'wifi':
          try {
            //const netDevices = 
            //const netDevices = type === 'wifi'
            //? await PrinterService.scanWiFiPrinters()
            //: await PrinterService.scanNetworkPrinters();
            //setNetworkPrinters(netDevices);
          } catch (error: any) {
            Alert.alert('Network Error', error.message);
            //setNetworkPrinters([]);
          }
          break;
      }
    } catch (error: any) {
      Alert.alert('Scan Error', `Failed to scan for ${type} devices: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };
  const getStatusIcon = () => {
    switch (printerStatus) {
      case 'connected':
        return <CheckCircle size={24} color="#059669" />;
      case 'connecting':
        return <Settings size={24} color="#D97706" />;
      default:
        return <XCircle size={24} color="#DC2626" />;
    }
  };

  const getStatusText = () => {
    switch (printerStatus) {
      case 'connected':
        return `Connected via ${connectionType?.toUpperCase()}`;
      case 'connecting':
        return 'Connecting...';
      default:
        return 'Disconnected';
    }
  };

  const renderConnectionTab = (type: typeof activeTab, icon: any, label: string) => {
    const IconComponent = icon;
    const isActive = activeTab === type;

    return (
      <TouchableOpacity
        key={type}
        style={[styles.connectionTab, isActive && styles.activeConnectionTab, isMobile && { flexDirection: "column" }]}
        onPress={() => setActiveTab(type)}
      >
        <IconComponent size={20} color={isActive ? colors.accent : colors.primaryLight} />
        <Text style={[styles.connectionTabText, {color: colors.primary}, isActive && {color: colors.accent}]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBluetoothContent = () => (
    <View style={styles.connectionContent}>
      <Text style={styles.connectionDescription}>
        Connect to a Bluetooth-enabled receipt printer
      </Text>
      <TouchableOpacity
        style={[styles.scanButton, { backgroundColor: colors.accent}, isScanning && { backgroundColor: colors.textSecondary }]}
        onPress={() => scanForDevicesList('bluetooth')}
        disabled={isScanning === true}
      >
        <Text style={styles.scanButtonText}>
          {isScanning ? 'Scanning...' : 'Scan for Bluetooth Devices'}
        </Text>
      </TouchableOpacity>

      {devices.length > 0 && (
        <View style={styles.devicesList}>
          <Text style={styles.devicesTitle}>Available Devices:</Text>
          {devices.map((device, index) => (
            <TouchableOpacity
              key={index}
              style={styles.deviceItem}
              onPress={() => connectToPrinter(device.address)}
            >
              <Text style={styles.deviceName}>{device.name ? device.name : 'Unnamed device'}</Text>
              <Text style={styles.deviceId}>{device.address || device.id}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderUSBContent = () => (
    <View style={styles.connectionContent}>
      <Text style={styles.connectionDescription}>
        Connect via USB cable with OTG adapter
      </Text>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => scanForDevicesList('usb')}
        disabled={isScanning}
      >
        <Text style={styles.scanButtonText}>
          {isScanning ? 'Scanning...' : 'Scan for USB Devices'}
        </Text>
      </TouchableOpacity>

      {availableDevices.length > 0 && (
        <View style={styles.devicesList}>
          <Text style={styles.devicesTitle}>Available USB Devices:</Text>
          {availableDevices.map((device, index) => (
            <TouchableOpacity
              key={index}
              style={styles.deviceItem}
            //onPress={() => connectToPrinter(device.id, 'usb', { name: device.name })}
            >
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceId}>{device.id}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
  const renderWiFiContent = () => (
    <View style={styles.connectionContent}>
      <Text style={styles.connectionDescription}>
        Connect to WiFi-enabled printer directly
      </Text>

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => scanForDevicesList('wifi')}
        disabled={isScanning}
      >
        <Text style={styles.scanButtonText}>
          {isScanning ? 'Scanning WiFi...' : 'Scan for WiFi Printers'}
        </Text>
      </TouchableOpacity>

      {networkPrinters.length > 0 && (
        <View style={styles.devicesList}>
          <Text style={styles.devicesTitle}>Available WiFi Printers:</Text>
          {networkPrinters.map((printer, index) => (
            <TouchableOpacity
              key={index}
              style={styles.deviceItem}
            //onPress={() => connectToPrinter(printer.id, 'wifi', {
            //  ipAddress: printer.ipAddress,
            //  port: printer.port,
            //  name: printer.name,
            //})}
            >
              <Text style={styles.deviceName}>{printer.name}</Text>
              <Text style={styles.deviceId}>{printer.ipAddress}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Printer Settings</Text>

        {/* Printer Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Printer size={32} color={colors.accent} />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Printer Status</Text>
              <View style={styles.statusRow}>
                {getStatusIcon()}
                <Text style={styles.statusText}>{getStatusText()}</Text>
              </View>
            </View>
          </View>

          {printerStatus === 'connected' && (
            <View style={styles.connectedActions}>
              <TouchableOpacity style={styles.testButton} onPress={() => printReceipt}>
                <Text style={styles.testButtonText}>Print Test Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.disconnectButton}>
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Connection Methods */}
        {printerStatus !== 'connected' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connection Methods</Text>

              {/* Connection Tabs */}
              <View style={styles.connectionTabs}>
                {renderConnectionTab('bluetooth', Bluetooth, 'Bluetooth')}
                {/**{renderConnectionTab('usb', Usb, 'USB')}
                {renderConnectionTab('wifi', Wifi, 'WiFi')} **/}
              </View>

              {/* Connection Content */}
              <View style={styles.connectionCard}>
                {activeTab === 'bluetooth' && renderBluetoothContent()}
              </View>
            </View>
          </>
        )}

        {/* Printer Information */}
        <View style={[styles.infoCard, { backgroundColor: colors.border}]}>
          <Text style={[styles.infoTitle, { color: colors.primary}]}>Supported Printers & Requirements</Text>
          <View style={styles.infoList}>
            <Text style={[styles.infoCategory, { color: colors.primary}]}>Bluetooth:</Text>
            <Text style={[styles.infoItem, { color: colors.primary}]}>• Star TSP143III, Epson TM series, Zebra ZD series</Text>
            <Text style={[styles.infoItem, { color: colors.primary}]}>• ESC/POS compatible thermal printers</Text>
            {/**
            <Text style={styles.infoCategory}>Network (Ethernet/WiFi):</Text>
            <Text style={styles.infoItem}>• IP-enabled printers on port 9100 (RAW)</Text>
            <Text style={styles.infoItem}>• Brother, Canon, HP network printers</Text>

            <Text style={styles.infoCategory}>Cloud API:</Text>
            <Text style={styles.infoItem}>• Epson ePOS SDK compatible printers</Text>
            <Text style={styles.infoItem}>• Remote printing from anywhere</Text>

            <Text style={styles.infoCategory}>General:</Text>
            <Text style={styles.infoItem}>• 58mm or 80mm paper width supported</Text>
            <Text style={styles.infoItem}>• Auto-cut feature recommended</Text> */}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#4B5563',
  },
  connectedActions: {
    flexDirection: 'row',
    gap: 12,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  connectionTabs: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  connectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 6,
    gap: 6,
  },
  activeConnectionTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  connectionTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeConnectionTabText: {
    color: '#2563EB',
  },
  connectionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  connectionContent: {
    minHeight: 200,
  },
  connectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  scanButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  manualEntry: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
  },
  connectButton: {
    backgroundColor: '#059669',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  devicesList: {
    marginTop: 16,
  },
  devicesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  deviceItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  offlineDevice: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  deviceId: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#EBF4FF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 12,
  },
  infoList: {
    gap: 4,
  },
  infoCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginTop: 8,
    marginBottom: 4,
  },
  infoItem: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
    paddingLeft: 8,
  },
});

