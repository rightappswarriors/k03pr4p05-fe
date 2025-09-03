import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { Printer, Bluetooth, Usb, Settings, CircleCheck as CheckCircle, Circle as XCircle, Wifi, Globe, Cloud } from 'lucide-react-native';
import { PrinterService } from '@/services/printerService';
import { useResponsive } from '@/hooks/useResponsive'
import { useBluetooth } from "@/services/bluetoothService"
export default function PrinterScreen() {
  const { 
    devices,
    connectedDevice,
    requestPermissions,
    scanForBTDevices,
    connectToDevice,

  } = useBluetooth();
  const { isMobile } = useResponsive()
  const [printerStatus, setPrinterStatus] = useState<'disconnected' | 'connected' | 'connecting'>('disconnected');
  const [connectionType, setConnectionType] = useState<'bluetooth' | 'usb' | 'ethernet' | 'wifi' | 'cloud' | null>(null);
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [networkPrinters, setNetworkPrinters] = useState<any[]>([]);
  const [cloudPrinters, setCloudPrinters] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'bluetooth' | 'usb' | 'ethernet' | 'wifi' | 'cloud'>('bluetooth');

  // Network connection inputs
  const [ipAddress, setIpAddress] = useState('192.168.1.100');
  const [port, setPort] = useState('9100');
  const [printerName, setPrinterName] = useState('Network Printer');

  // Cloud connection inputs
  const [cloudApiKey, setCloudApiKey] = useState('');
  useEffect(() => {
    PrinterService.initListeners();
    PrinterService.subscribe('found', (rsp: any) => {
      console.log('Found printer:', rsp);
    });
  }, []);
  const [selectedCloudPrinter, setSelectedCloudPrinter] = useState<string>('');

  useEffect(() => {
    loadPrinterStatus();
  }, []);

  const loadPrinterStatus = async () => {
    const status = await PrinterService.getPrinterStatus();
    setPrinterStatus(status.isConnected ? 'connected' : 'disconnected');
    setConnectionType(status.connectionType);
  };

  const scanForDevices = async (type: typeof activeTab) => {
    setIsScanning(true);
    try {
      switch (type) {
        case 'bluetooth':
          try {
            await scanForBTDevices()
            setAvailableDevices([connectedDevice, devices]);
          } catch (error: any) {
            console.error("Error: ", error)
            Alert.alert('Bluetooth Error', error.message);
            setAvailableDevices([]);
          }
          break;
        case 'usb':
          try {
            const usbDevices = await PrinterService.scanUSBDevices();
            setAvailableDevices(usbDevices);
          } catch (error: any) {
            Alert.alert('USB Error', error.message);
            setAvailableDevices([]);
          }
          break;
        case 'ethernet':
        case 'wifi':
          try {
            const netDevices = type === 'wifi'
              ? await PrinterService.scanWiFiPrinters()
              : await PrinterService.scanNetworkPrinters();
            setNetworkPrinters(netDevices);
          } catch (error: any) {
            Alert.alert('Network Error', error.message);
            setNetworkPrinters([]);
          }
          break;
        case 'cloud':
          if (!cloudApiKey) {
            Alert.alert('Error', 'Please enter your Cloud API key first');
            return;
          }
          try {

          } catch (error: any) {
            Alert.alert('Cloud Error', error.message);
            setCloudPrinters([]);
          }
          break;
      }
    } catch (error: any) {
      Alert.alert('Scan Error', `Failed to scan for ${type} devices: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const connectToPrinter = async (deviceId: string, type: typeof activeTab, options?: any) => {
    setPrinterStatus('connecting');
    try {
      const success = await PrinterService.connectToPrinter(deviceId, type, options);
      if (success) {
        setPrinterStatus('connected');
        setConnectionType(type);
        Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} printer connected successfully`);
      } else {
        setPrinterStatus('disconnected');
        Alert.alert('Error', 'Failed to connect to printer');
      }
    } catch (error: any) {
      setPrinterStatus('disconnected');
      Alert.alert('Connection Error', error.message || 'Connection failed');
    }
  };

  const connectNetworkPrinter = async (printer: any) => {
    await connectToPrinter(printer.id, activeTab, {
      ipAddress: printer.ipAddress,
      port: printer.port,
      name: printer.name,
    });
  };

  const connectManualNetwork = async () => {
    if (!ipAddress || !port) {
      Alert.alert('Error', 'Please enter IP address and port');
      return;
    }

    await connectToPrinter(`manual_${ipAddress}:${port}`, activeTab, {
      ipAddress,
      port: parseInt(port),
      name: printerName,
    });
  };

  const connectCloudPrinter = async (printerId: string, printerName: string) => {
    if (!cloudApiKey) {
      Alert.alert('Error', 'Please enter your Cloud API key');
      return;
    }

    await connectToPrinter(printerId, 'cloud', {
      name: printerName,
      apiKey: cloudApiKey,
    });
  };

  const disconnectPrinter = async () => {
    try {
      await PrinterService.disconnectPrinter();
      setPrinterStatus('disconnected');
      setConnectionType(null);
      Alert.alert('Success', 'Printer disconnected');
    } catch (error) {
      Alert.alert('Error', 'Failed to disconnect printer');
    }
  };

  const testPrint = async () => {
    try {
      const success = await PrinterService.printTestReceipt();
      if (success) {
        Alert.alert('Success', 'Test receipt printed successfully');
      } else {
        Alert.alert('Error', 'Failed to print test receipt');
      }
    } catch (error: any) {
      Alert.alert('Print Error', error.message || 'Print test failed');
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
        <IconComponent size={20} color={isActive ? '#2563EB' : '#6B7280'} />
        <Text style={[styles.connectionTabText, isActive && styles.activeConnectionTabText]}>
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
        style={styles.scanButton}
        onPress={() => scanForDevices('bluetooth')}
        disabled={isScanning}
      >
        <Text style={styles.scanButtonText}>
          {isScanning ? 'Scanning...' : 'Scan for Bluetooth Devices'}
        </Text>
      </TouchableOpacity>

      {availableDevices.length > 0 && (
        <View style={styles.devicesList}>
          <Text style={styles.devicesTitle}>Available Devices:</Text>
          {availableDevices.map((device, index) => (
            <TouchableOpacity
              key={index}
              style={styles.deviceItem}
              onPress={() => connectToPrinter(device.id, 'bluetooth', { name: device.name })}
            >
              <Text style={styles.deviceName}>{device.name}</Text>
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
        onPress={() => scanForDevices('usb')}
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
              onPress={() => connectToPrinter(device.id, 'usb', { name: device.name })}
            >
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceId}>{device.id}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderNetworkContent = () => (
    <View style={styles.connectionContent}>
      <Text style={styles.connectionDescription}>
        Connect to network printer via IP address (LAN/Ethernet)
      </Text>

      {/* Manual IP Entry */}
      <View style={styles.manualEntry}>
        <Text style={styles.inputLabel}>IP Address:</Text>
        <TextInput
          style={styles.textInput}
          value={ipAddress}
          onChangeText={setIpAddress}
          placeholder="192.168.1.100"
          keyboardType="numeric"
        />

        <Text style={styles.inputLabel}>Port:</Text>
        <TextInput
          style={styles.textInput}
          value={port}
          onChangeText={setPort}
          placeholder="9100"
          keyboardType="numeric"
        />

        <Text style={styles.inputLabel}>Printer Name:</Text>
        <TextInput
          style={styles.textInput}
          value={printerName}
          onChangeText={setPrinterName}
          placeholder="Network Printer"
        />

        <TouchableOpacity style={styles.connectButton} onPress={connectManualNetwork}>
          <Text style={styles.connectButtonText}>Connect</Text>
        </TouchableOpacity>
      </View>

      {/* Auto-discovered printers */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => scanForDevices('ethernet')}
        disabled={isScanning}
      >
        <Text style={styles.scanButtonText}>
          {isScanning ? 'Scanning Network...' : 'Auto-Discover Network Printers'}
        </Text>
      </TouchableOpacity>

      {networkPrinters.length > 0 && (
        <View style={styles.devicesList}>
          <Text style={styles.devicesTitle}>Discovered Printers:</Text>
          {networkPrinters.map((printer, index) => (
            <TouchableOpacity
              key={index}
              style={styles.deviceItem}
              onPress={() => connectNetworkPrinter(printer)}
            >
              <Text style={styles.deviceName}>{printer.name}</Text>
              <Text style={styles.deviceId}>{printer.ipAddress}:{printer.port}</Text>
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
        onPress={() => scanForDevices('wifi')}
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
              onPress={() => connectToPrinter(printer.id, 'wifi', {
                ipAddress: printer.ipAddress,
                port: printer.port,
                name: printer.name,
              })}
            >
              <Text style={styles.deviceName}>{printer.name}</Text>
              <Text style={styles.deviceId}>{printer.ipAddress}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderCloudContent = () => (
    <View style={styles.connectionContent}>
      <Text style={styles.connectionDescription}>
        Connect to cloud-enabled printers (Epson ePOS SDK)
      </Text>

      <View style={styles.manualEntry}>
        <Text style={styles.inputLabel}>Cloud API Key:</Text>
        <TextInput
          style={styles.textInput}
          value={cloudApiKey}
          onChangeText={setCloudApiKey}
          placeholder="Enter your Epson ePOS API key"
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => scanForDevices('cloud')}
          disabled={isScanning || !cloudApiKey}
        >
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Loading...' : 'Load Cloud Printers'}
          </Text>
        </TouchableOpacity>
      </View>

      {cloudPrinters.length > 0 && (
        <View style={styles.devicesList}>
          <Text style={styles.devicesTitle}>Available Cloud Printers:</Text>
          {cloudPrinters.map((printer, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.deviceItem,
                printer.status === 'offline' && styles.offlineDevice
              ]}
              onPress={() => printer.status === 'online' && connectCloudPrinter(printer.id, printer.name)}
              disabled={printer.status === 'offline'}
            >
              <Text style={styles.deviceName}>{printer.name}</Text>
              <Text style={[styles.deviceId, { color: printer.status === 'online' ? '#059669' : '#DC2626' }]}>
                {printer.model} • {printer.status}
              </Text>
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
            <Printer size={32} color="#2563EB" />
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
              <TouchableOpacity style={styles.testButton} onPress={testPrint}>
                <Text style={styles.testButtonText}>Print Test Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.disconnectButton} onPress={disconnectPrinter}>
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
                {renderConnectionTab('usb', Usb, 'USB')}
                {renderConnectionTab('ethernet', Globe, 'Ethernet')}
                {renderConnectionTab('wifi', Wifi, 'WiFi')}
                {renderConnectionTab('cloud', Cloud, 'Cloud')}
              </View>

              {/* Connection Content */}
              <View style={styles.connectionCard}>
                {activeTab === 'bluetooth' && renderBluetoothContent()}
                {activeTab === 'usb' && renderUSBContent()}
                {activeTab === 'ethernet' && renderNetworkContent()}
                {activeTab === 'wifi' && renderWiFiContent()}
                {activeTab === 'cloud' && renderCloudContent()}
              </View>
            </View>
          </>
        )}

        {/* Printer Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Supported Printers & Requirements</Text>
          <View style={styles.infoList}>
            <Text style={styles.infoCategory}>Bluetooth:</Text>
            <Text style={styles.infoItem}>• Star TSP143III, Epson TM series, Zebra ZD series</Text>
            <Text style={styles.infoItem}>• ESC/POS compatible thermal printers</Text>

            <Text style={styles.infoCategory}>Network (Ethernet/WiFi):</Text>
            <Text style={styles.infoItem}>• IP-enabled printers on port 9100 (RAW)</Text>
            <Text style={styles.infoItem}>• Brother, Canon, HP network printers</Text>

            <Text style={styles.infoCategory}>Cloud API:</Text>
            <Text style={styles.infoItem}>• Epson ePOS SDK compatible printers</Text>
            <Text style={styles.infoItem}>• Remote printing from anywhere</Text>

            <Text style={styles.infoCategory}>General:</Text>
            <Text style={styles.infoItem}>• 58mm or 80mm paper width supported</Text>
            <Text style={styles.infoItem}>• Auto-cut feature recommended</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    backgroundColor: '#2563EB',
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