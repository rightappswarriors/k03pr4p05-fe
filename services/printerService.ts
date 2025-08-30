import * as Print from 'expo-print';
import { Platform, DeviceEventEmitter, NativeEventEmitter } from 'react-native';


type PrinterEvent = 'paired' | 'found' | 'connectionLost' | 'notSupported';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Receipt } from '@/types';
//import {} from 'react-native-bluetooth-escpos-printer'
// Import real Bluetooth library
let BluetoothEscposPrinter: any = null;
let BluetoothPrinter: any = null;
let BluetoothManager: any = null;
let TcpSocket: any = null;

// Dynamically import native modules (only available on physical devices)
if (Platform.OS !== 'web') {
  try {
    const BluetoothModule = require('react-native-bluetooth-escpos-printer');
    BluetoothPrinter = BluetoothModule.BluetoothEscposPrinter;
    BluetoothManager = BluetoothModule.BluetoothManager;
    
    TcpSocket = require('react-native-tcp-socket');
  } catch (error) {
    console.warn('Native printer modules not available:', error);
  }
}

const PRINTER_CONFIG_KEY = 'printer_config';

interface PrinterConfig {
  isConnected: boolean;
  connectionType: 'bluetooth' | 'usb' | 'ethernet' | 'wifi' | 'cloud' | null;
  deviceId: string | null;
  deviceName: string | null;
  ipAddress?: string;
  port?: number;
  cloudApiKey?: string;
  cloudPrinterId?: string;
}

interface BluetoothDevice {
  id: string;
  name: string;
  address?: string;
}

interface NetworkPrinter {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  model?: string;
}

interface CloudPrinter {
  id: string;
  name: string;
  model: string;
  status: 'online' | 'offline';
}

export class PrinterService {
  private static config: PrinterConfig = {
    isConnected: false,
    connectionType: null,
    deviceId: null,
    deviceName: null,
  };

  static async initializePrinter(): Promise<void> {
    try {
      const configJson = await AsyncStorage.getItem(PRINTER_CONFIG_KEY);
      if (configJson) {
        this.config = JSON.parse(configJson);
      }

      // Initialize Bluetooth if available
      if (BluetoothManager && Platform.OS !== 'web') {
        await BluetoothManager.enableBluetooth();
      }
    } catch (error) {
      console.error('Failed to initialize printer config:', error);
    }
  }

  static async getPrinterStatus(): Promise<PrinterConfig> {
    await this.initializePrinter();
    return this.config;
  }

  private static listeners: { [key in PrinterEvent]?: Function[] } = {};

  static subscribe(event: PrinterEvent, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(callback);
  }

  static unsubscribe(event: PrinterEvent, callback: Function) {
    this.listeners[event] = this.listeners[event]?.filter(cb => cb !== callback);
  }

  private static emit(event: PrinterEvent, data?: any) {
    this.listeners[event]?.forEach(cb => cb(data));
  }

  static initializeListeners() {
    if (Platform.OS === 'ios') {
      const emitter = new NativeEventEmitter(BluetoothManager);
      emitter.addListener(BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED, rsp => {
        this.emit('paired', rsp);
      });
      emitter.addListener(BluetoothManager.EVENT_DEVICE_FOUND, rsp => {
        this.emit('found', rsp);
      });
      emitter.addListener(BluetoothManager.EVENT_CONNECTION_LOST, () => {
        this.emit('connectionLost');
      });
    } else {
      DeviceEventEmitter.addListener(BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED, rsp => {
        this.emit('paired', rsp);
      });
      DeviceEventEmitter.addListener(BluetoothManager.EVENT_DEVICE_FOUND, rsp => {
        this.emit('found', rsp);
      });
      DeviceEventEmitter.addListener(BluetoothManager.EVENT_CONNECTION_LOST, () => {
        this.emit('connectionLost');
      });
      DeviceEventEmitter.addListener(BluetoothManager.EVENT_BLUETOOTH_NOT_SUPPORT, () => {
        this.emit('notSupported');
      });
    }
  }

  // Real Bluetooth Implementation
  static async scanBluetoothDevices(): Promise<BluetoothDevice[]> {
    if (Platform.OS === 'web' || !BluetoothManager) {
      throw new Error('Bluetooth not available');
    }
  
    if (Platform.OS === 'android') {
      const request = await requestMultiple([
        PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
        PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      ]);
      if (
        request[PERMISSIONS.ANDROID.BLUETOOTH_CONNECT] !== RESULTS.GRANTED ||
        request[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] !== RESULTS.GRANTED
      ) {
        throw new Error('Bluetooth permissions not granted');
      }
    }
  
    const result = await BluetoothManager.scanDevices();
    let found = [];
    try {
      found = JSON.parse(result.found || '[]');
    } catch {}
  
    return found.map((d: any) => ({
      id: d.address,
      name: d.name,
      address: d.address,
    }));
  }

  static async connectBluetoothPrinter(deviceId: string, deviceName: string): Promise<boolean> {
    try {
      await BluetoothManager.connect(deviceId);
      await BluetoothEscposPrinter.printerInit();
      this.config = {
        isConnected: true,
        connectionType: 'bluetooth',
        deviceId,
        deviceName,
      };
      await this.saveConfig();
      return true;
    } catch (error) {
      console.error('Failed to connect:', error);
      return false;
    }
  }
  static async disconnectBluetooth(): Promise<void> {
    if (!this.config.deviceId) return;
    try {
      await BluetoothManager.unpaire(this.config.deviceId);
      this.config = {
        isConnected: false,
        connectionType: null,
        deviceId: null,
        deviceName: null,
      };
      await this.saveConfig();
    } catch (e) {
      console.error('Failed to unpair:', e);
    }
  }

  // Real Network Printer Scanning
  static async scanNetworkPrinters(): Promise<NetworkPrinter[]> {
    if (Platform.OS === 'web') {
      throw new Error('Network printer scanning not available on web platform');
    }

    try {
      const discoveredPrinters: NetworkPrinter[] = [];
      
      // Common printer IP ranges and ports
      const baseIPs = ['192.168.1.', '192.168.0.', '10.0.0.', '172.16.0.'];
      const commonPorts = [9100, 515, 631]; // RAW, LPR, IPP
      
      // Scan common IP ranges (limited scan for performance)
      for (const baseIP of baseIPs) {
        for (let i = 100; i <= 110; i++) { // Scan .100 to .110
          const ip = baseIP + i;
          
          for (const port of commonPorts) {
            try {
              const isReachable = await this.testNetworkConnection(ip, port, 2000);
              if (isReachable) {
                // Try to get printer info via SNMP or HTTP (simplified)
                const printerInfo = await this.getPrinterInfo(ip, port);
                discoveredPrinters.push({
                  id: `${ip}:${port}`,
                  name: printerInfo.name || `Network Printer (${ip})`,
                  ipAddress: ip,
                  port,
                  model: printerInfo.model,
                });
              }
            } catch (error) {
              // Continue scanning other IPs
            }
          }
        }
      }

      return discoveredPrinters;
    } catch (error) {
      console.error('Network scan failed:', error);
      throw new Error('Failed to scan for network printers');
    }
  }

  private static async testNetworkConnection(ip: string, port: number, timeout: number): Promise<boolean> {
    if (!TcpSocket) {
      return false;
    }

    return new Promise((resolve) => {
      const socket = TcpSocket.createConnection({
        port,
        host: ip,
        timeout,
      });

      const timeoutId = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, timeout);

      socket.on('connect', () => {
        clearTimeout(timeoutId);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeoutId);
        resolve(false);
      });
    });
  }

  private static async getPrinterInfo(ip: string, port: number): Promise<{ name?: string; model?: string }> {
    try {
      // Try to get printer info via HTTP (many modern printers have web interfaces)
      const response = await fetch(`http://${ip}`, { 
        method: 'GET',
      });
      
      if (response.ok) {
        const html = await response.text();
        // Parse printer name/model from HTML (simplified)
        const nameMatch = html.match(/<title>(.*?)<\/title>/i);
        const modelMatch = html.match(/model[:\s]+([^<\n]+)/i);
        
        return {
          name: nameMatch?.[1]?.trim(),
          model: modelMatch?.[1]?.trim(),
        };
      }
    } catch (error) {
      // Fallback to generic info
    }
    
    return {
      name: `Printer ${ip}`,
      model: 'Unknown Model',
    };
  }

  static async connectNetworkPrinter(ipAddress: string, port: number, name: string): Promise<boolean> {
    if (Platform.OS === 'web' || !TcpSocket) {
      throw new Error('Network printing not available on this platform');
    }

    try {
      // Test connection first
      const isReachable = await this.testNetworkConnection(ipAddress, port, 5000);
      if (!isReachable) {
        throw new Error(`Cannot reach printer at ${ipAddress}:${port}`);
      }

      this.config = {
        isConnected: true,
        connectionType: 'ethernet',
        deviceId: `${ipAddress}:${port}`,
        deviceName: name,
        ipAddress,
        port,
      };
      await this.saveConfig();
      
      return true;
    } catch (error: any) {
      console.error('Network connection failed:', error);
      throw new Error(`Failed to connect to network printer: ${error.message}`);
    }
  }

  // WiFi Direct Methods
  static async scanWiFiPrinters(): Promise<NetworkPrinter[]> {
    if (Platform.OS === 'web') {
      throw new Error('WiFi printer scanning not available on web platform');
    }

    try {
      // WiFi Direct printers typically use 192.168.4.x range
      const wifiDirectIPs = ['192.168.4.'];
      const discoveredPrinters: NetworkPrinter[] = [];
      
      for (const baseIP of wifiDirectIPs) {
        for (let i = 1; i <= 10; i++) {
          const ip = baseIP + i;
          
          try {
            const isReachable = await this.testNetworkConnection(ip, 9100, 3000);
            if (isReachable) {
              const printerInfo = await this.getPrinterInfo(ip, 9100);
              discoveredPrinters.push({
                id: `wifi_${ip}:9100`,
                name: printerInfo.name || `WiFi Printer (${ip})`,
                ipAddress: ip,
                port: 9100,
                model: printerInfo.model,
              });
            }
          } catch (error) {
            // Continue scanning
          }
        }
      }

      return discoveredPrinters;
    } catch (error) {
      console.error('WiFi scan failed:', error);
      throw new Error('Failed to scan for WiFi printers');
    }
  }

  // Cloud API Methods (Epson ePOS SDK)
  static async scanCloudPrinters(apiKey: string): Promise<CloudPrinter[]> {
    try {
      // Real Epson ePOS API call
      const response = await fetch('https://api.epsonconnect.com/api/1/printing/printers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Invalid API key or service unavailable');
      }

      const data = await response.json();
      
      return data.printers?.map((printer: any) => ({
        id: printer.id,
        name: printer.device_name || printer.printer_name,
        model: printer.device_type || 'Unknown Model',
        status: printer.status === 'ready' ? 'online' : 'offline',
      })) || [];
    } catch (error) {
      console.error('Cloud printer scan failed:', error);
      throw new Error('Failed to load cloud printers. Please check your API key.');
    }
  }

  static async connectCloudPrinter(printerId: string, printerName: string, apiKey: string): Promise<boolean> {
    try {
      // Verify printer is accessible
      const response = await fetch(`https://api.epsonconnect.com/api/1/printing/printers/${printerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Printer not accessible or API key invalid');
      }

      this.config = {
        isConnected: true,
        connectionType: 'cloud',
        deviceId: printerId,
        deviceName: printerName,
        cloudApiKey: apiKey,
        cloudPrinterId: printerId,
      };
      await this.saveConfig();
      
      return true;
    } catch (error: any) {
      console.error('Cloud connection failed:', error);
      throw new Error(`Failed to connect to cloud printer: ${error.message}`);
    }
  }

  // USB Methods (Android only)
  static async scanUSBDevices(): Promise<BluetoothDevice[]> {
    if (Platform.OS !== 'android') {
      throw new Error('USB printing only available on Android devices');
    }

    try {
      // For real USB implementation, you would use:
      // const UsbSerial = require('react-native-usb-serialport-for-android');
      // const devices = await UsbSerial.list();
      
      // For now, return empty array since USB requires physical testing
      console.log('USB scanning requires physical device with OTG adapter');
      return [];
    } catch (error) {
      console.error('USB scan failed:', error);
      throw new Error('Failed to scan for USB devices');
    }
  }

  // Generic Connection Method
  static async connectToPrinter(deviceId: string, type: PrinterConfig['connectionType'], options?: any): Promise<boolean> {
    switch (type) {
      case 'bluetooth':
        return this.connectBluetoothPrinter(deviceId, options?.name || 'Bluetooth Printer');
      case 'usb':
        throw new Error('USB connection requires physical device testing');
      case 'ethernet':
        return this.connectNetworkPrinter(options?.ipAddress, options?.port || 9100, options?.name);
      case 'wifi':
        return this.connectNetworkPrinter(options?.ipAddress, options?.port || 9100, options?.name);
      case 'cloud':
        return this.connectCloudPrinter(deviceId, options?.name, options?.apiKey);
      default:
        return false;
    }
  }
  
  static async disconnectPrinter(): Promise<void> {
    try {
      // Close connections based on type
      switch (this.config.connectionType) {
        case 'bluetooth':
          this.disconnectBluetooth()
          break;
        case 'ethernet':
        case 'wifi':
          // TCP connections are typically closed after each print job
          break;
        case 'cloud':
          // No persistent connection to close
          break;
      }

      this.config = {
        isConnected: false,
        connectionType: null,
        deviceId: null,
        deviceName: null,
      };
      
      await this.saveConfig();
    } catch (error) {
      console.error('Disconnect failed:', error);
      throw new Error('Failed to disconnect printer');
    }
  }

  static async printTestReceipt(): Promise<boolean> {
    if (!this.config.isConnected) {
      throw new Error('No printer connected');
    }

    try {
      const testReceiptContent = this.generateTestReceiptContent();
      return await this.sendPrintJob(testReceiptContent, true);
    } catch (error: any) {
      console.error('Failed to print test receipt:', error);
      throw new Error(`Print test failed: ${error.message}`);
    }
  }

  static async printOrderReceipt(receipt: Receipt): Promise<boolean> {
    if (!this.config.isConnected) {
      console.warn('No printer connected, skipping receipt print');
      return false;
    }

    try {
      const receiptContent = await this.generateOrderReceiptHtml(receipt);
      return await this.sendPrintJob(receiptContent, false);
    } catch (error: any) {
      console.error('Failed to print order receipt:', error);
      throw new Error(`Receipt printing failed: ${error.message}`);
    }
  }

  private static async sendPrintJob(content: string, isTest: boolean = false): Promise<boolean> {
    try {
      switch (this.config.connectionType) {
        case 'bluetooth':
          return await this.printViaBluetooth(content);
        case 'ethernet':
        case 'wifi':
          return await this.printViaNetwork(content);
        case 'cloud':
          return await this.printViaCloud(content);
        default:
          // Fallback to expo-print for web/demo
          const htmlContent = this.convertContentToHtml(content);
          await Print.printAsync({
            html: htmlContent,
            width: 226, // 58mm in points
            height: 600,
          });
          return true;
      }
    } catch (error) {
      console.error('Print job failed:', error);
      throw error;
    }
  }

  private static async printViaBluetooth(content: string): Promise<boolean> {
    if (!BluetoothEscposPrinter || Platform.OS === 'web') {
      throw new Error('Bluetooth printing not available');
    }

    try {
      // Send ESC/POS commands to Bluetooth printer
      await BluetoothEscposPrinter.printerInit();
      await BluetoothEscposPrinter.printText(content, {});
      await BluetoothEscposPrinter.printText('\n\n\n', {}); // Add spacing
      await BluetoothManager.printerCut();
      
      return true;
    } catch (error) {
      console.error('Bluetooth print failed:', error);
      throw new Error('Bluetooth printing failed. Check printer connection.');
    }
  }

  private static async printViaNetwork(content: string): Promise<boolean> {
    if (!TcpSocket || Platform.OS === 'web') {
      throw new Error('Network printing not available');
    }

    return new Promise((resolve, reject) => {
      const socket = TcpSocket.createConnection({
        port: this.config.port || 9100,
        host: this.config.ipAddress,
        timeout: 10000,
      });

      socket.on('connect', () => {
        // Send ESC/POS commands
        const escPosData = this.convertToEscPos(content);
        socket.write(escPosData);
        socket.end();
        resolve(true);
      });

      socket.on('error', (error: any) => {
        reject(new Error(`Network print failed: ${error.message}`));
      });

      socket.on('close', () => {
        resolve(true);
      });
    });
  }

  private static async printViaCloud(content: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.epsonconnect.com/api/1/printing/printers/${this.config.cloudPrinterId}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.cloudApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_name: `Receipt_${Date.now()}`,
          print_mode: 'document',
          print_setting: {
            media_size: 'ms_a4',
            media_type: 'mt_plainpaper',
            borderless: false,
            print_quality: 'normal',
            source: 'auto',
            color_mode: 'mono',
          },
          file_name: 'receipt.txt',
          file: Buffer.from(content).toString('base64'),
        }),
      });

      if (!response.ok) {
        throw new Error('Cloud print job failed');
      }

      return true;
    } catch (error: any) {
      console.error('Cloud print failed:', error);
      throw new Error(`Cloud printing failed: ${error.message}`);
    }
  }

  private static convertToEscPos(content: string): string {
    // ESC/POS commands
    const ESC = '\x1B';
    const INIT = ESC + '@';
    const CENTER = ESC + 'a1';
    const LEFT = ESC + 'a0';
    const BOLD_ON = ESC + 'E1';
    const BOLD_OFF = ESC + 'E0';
    const CUT = ESC + 'i';
    const LF = '\n';
    
    // Convert content to ESC/POS format
    let escPosData = INIT; // Initialize printer
    escPosData += content;
    escPosData += LF + LF + LF; // Add spacing
    escPosData += CUT; // Cut paper
    
    return escPosData;
  }

  private static convertContentToHtml(content: string): string {
    return `
      <html>
        <head>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              margin: 0;
              padding: 10px;
              width: 200px;
              white-space: pre-line;
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `;
  }

  private static generateTestReceiptContent(): string {
    return `
================================
        TEST RECEIPT
================================
Store POS System
Printer Connection Test

Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
Connection: ${this.config.connectionType?.toUpperCase()}
Printer: ${this.config.deviceName}

================================
✓ Printer Connected Successfully
✓ Print Test Completed
================================

Thank you for testing!
    `;
  }

  private static generateOrderReceiptHtml(receipt: Receipt): string {
    const itemsHtml = receipt.items
      .map(
        (item: any) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}x</td>
        <td>$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <html>
        <head>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              margin: 0;
              padding: 10px;
              width: 58mm;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; }
            .right { text-align: right; }
          </style>
        </head>
        <body id="receipt">
          <div class="center bold">RECEIPT</div>
          <div class="line"></div>
          <div class="center">${receipt.store.name}</div>
          <div class="line"></div>
          <div>Date: ${new Date(
            receipt.transaction.date
          ).toLocaleDateString()}</div>
          <div>Time: ${new Date(
            receipt.transaction.timestamp
          ).toLocaleTimeString()}</div>
          <div>Cashier: ${receipt.transaction.cashier}</div>
          <div class="line"></div>
          <div class="center">You just bought</div>
          <div class="line"></div>
          <table>
            ${itemsHtml}
          </table>
          <div class="line"></div>
          <table>
            <tr>
              <td>Subtotal:</td>
              <td class="right">$${receipt.totals.subtotal.toFixed(2)}</td>
            </tr>
            <tr class="bold">
              <td>Total:</td>
              <td class="right">$${receipt.totals.total.toFixed(2)}</td>
            </tr>
            <tr class="bold">
              <td>Change:</td>
              <td class="right">$${receipt.totals.total.toFixed(2)}</td>
            </tr>
          </table>
          <div class="line"></div>
          <table>
            <tr>
              <td>VAT Exempt Sales:</td>
              <td class="right">₱${
                receipt.store.VATExempSales ? receipt.store.VATExempSales : 0
              }</td>
            </tr>
            <tr class="bold">
              <td>VATable Sales:</td>
              <td class="right">₱${
                receipt.store.VATableSales ? receipt.store.VATableSales : 0
              }</td>
            </tr>
            <tr class="bold">
              <td>VAT Zero Rated:</td>
              <td class="right">₱${
                receipt.store.VATZeroSale ? receipt.store.VATZeroSale : 0
              }</td>
            </tr>
            <tr class="bold">
              <td>VAT (12%):</td>
              <td class="right">₱${
                receipt.store.VAT ? receipt.store.VAT : 0
              }</td>
            </tr>
          </table>
          <div class="left">Transaction #${receipt.transaction.id.slice(
            -8
          )}</div>
          <div class="line"></div>
          <table>
            <tr>
              <td>SOLD TO:</td>
              <td class="right">₱400.99</td>
            </tr>
            <tr class="bold">
              <td>ADDRESS:</td>
              <td class="right">${receipt.store.address}</td>
            </tr>
            <tr class="bold">
              <td>Business Type:</td>
              <td class="right">${receipt.store.businessType}</td>
            </tr>
            <tr class="bold">
              <td>Signature:</td>
              <td class="right"></td>
            </tr>
          </table>
          <div class="line"></div>
          <div class="center">Payment: ${receipt.payment.method.toUpperCase()}</div>
          <div class="line"></div>
          <div class="center">Thank you for your business!</div>
        </body>
      </html>
    `;
  }
  private static async saveConfig(): Promise<void> {
    await AsyncStorage.setItem(PRINTER_CONFIG_KEY, JSON.stringify(this.config));
  }
}