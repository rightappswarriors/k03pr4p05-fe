import * as Print from 'expo-print';
import { useState } from 'react'
import { Platform, DeviceEventEmitter, NativeEventEmitter } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  request,
  requestMultiple,
} from 'react-native-permissions';

type PrinterEvent = 'paired' | 'found' | 'connectionLost' | 'notSupported';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Receipt } from '@/types';
//import {} from 'react-native-bluetooth-escpos-printer';
// Import real Bluetooth library
let BluetoothEscposPrinter: any = null;
let BluetoothPrinter: any = null;
let BluetoothManager: any = null;
let TcpSocket: any = null;

// Dynamically import native modules (only available on physical devices)
if (Platform.OS !== 'web') {
  try {
    const BluetoothModule = null
    BluetoothPrinter = BluetoothModule
    BluetoothManager = BluetoothModule

    TcpSocket = require('react-native-tcp-socket');
  } catch (error) {
    console.warn('Native printer modules not available:', error);
  }
}
const PRINTER_CONFIG_KEY = 'printer_config';

export interface BluetoothDevice {
  name: string;
  address: string;
  id: string;
}

interface PrinterConfig {
  isConnected: boolean;
  connectionType: 'bluetooth' | 'usb' | 'ethernet' | 'wifi' | 'cloud' | null;
  deviceName: string | null;
  deviceAddress: string | null;
  port?: number;
  ipAddress?: number;
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
    connectionType: null,
    isConnected: false,
    deviceName: null,
    deviceAddress: null,
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
    this.listeners[event] = this.listeners[event]?.filter(
      (cb) => cb !== callback
    );
  }

  private static emit(event: PrinterEvent, data?: any) {
    this.listeners[event]?.forEach((cb) => cb(data));
  }

  /**
   * Initialize listeners (like in App useEffect)
   */
  static initListeners(
    onDevicePaired?: (devices: BluetoothDevice[]) => void,
    onDeviceFound?: (device: BluetoothDevice) => void,
    onConnectionLost?: () => void
  ) {
    if (Platform.OS === 'ios') {
      const emitter = new NativeEventEmitter(BluetoothManager);
      emitter.addListener(
        BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED,
        (rsp) => {
          const devices = this.parseDeviceList(rsp.devices);
          if (onDevicePaired) onDevicePaired(devices);
        }
      );
      emitter.addListener(BluetoothManager.EVENT_DEVICE_FOUND, (rsp) => {
        const device = this.parseDevice(rsp.device);
        if (device && onDeviceFound) onDeviceFound(device);
      });
      emitter.addListener(BluetoothManager.EVENT_CONNECTION_LOST, () => {
        this.clearConfig();
        if (onConnectionLost) onConnectionLost();
      });
    } else {
      DeviceEventEmitter.addListener(
        BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED,
        (rsp) => {
          const devices = this.parseDeviceList(rsp.devices);
          if (onDevicePaired) onDevicePaired(devices);
        }
      );
      DeviceEventEmitter.addListener(
        BluetoothManager.EVENT_DEVICE_FOUND,
        (rsp) => {
          const device = this.parseDevice(rsp.device);
          if (device && onDeviceFound) onDeviceFound(device);
        }
      );
      DeviceEventEmitter.addListener(
        BluetoothManager.EVENT_CONNECTION_LOST,
        () => {
          this.clearConfig();
          if (onConnectionLost) onConnectionLost();
        }
      );
      DeviceEventEmitter.addListener(
        BluetoothManager.EVENT_BLUETOOTH_NOT_SUPPORT,
        () => {
          console.warn('Device does not support Bluetooth');
        }
      );
    }
  }
  /**
   * Scan devices (requests Android permissions first)
   */
  static async scanBTDevices (): Promise<BluetoothDevice[]> {
    BluetoothManager.scanDevices().then((s: any) => {
      var found = s.found
      try { 
        found = JSON.parse(found)
      } catch (e) {

      }
      var foundDevices = found
    })

    return []
  }
  static async scanDevices(): Promise<BluetoothDevice[]> {
    console.log('Start scanning');
    if (Platform.OS === 'android') {
      const request = await requestMultiple([
        PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
        PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      ]);
      console.log(
        'Bluetooth Connect Permission:',
        request[PERMISSIONS.ANDROID.BLUETOOTH_CONNECT]
      );
      console.log(
        'Bluetooth Scan Permission:',
        request[PERMISSIONS.ANDROID.BLUETOOTH_SCAN]
      );
      console.log(
        'Fine Location Permission:',
         request["android.permission.ACCESS_FINE_LOCATION"] 
      );
      if (
        request[PERMISSIONS.ANDROID.BLUETOOTH_CONNECT] !== RESULTS.GRANTED ||
        request[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] !== RESULTS.GRANTED
      ) {
        throw new Error('Bluetooth permissions not granted');
      }
    }
    
    // Check if Bluetooth is enabled and enable it if not.
    // This is the critical step to prevent the NOT_STARTED error.
    let enabled = await BluetoothManager.isBluetoothEnabled();
    console.log('Enabled bluetooth?', enabled);
    if (!enabled) {
      console.log('Bluetooth not enabled, enabling now...');
      await BluetoothManager.enableBluetooth();
      enabled = await BluetoothManager.isBluetoothEnabled(); // Re-check after enabling
      if (!enabled) {
        throw new Error('Failed to enable Bluetooth');
      }
      console.log('Bluetooth enabled successfully.');
    }

    let found: BluetoothDevice[] = [];
    try {
      console.log('Attempting to scan for devices...');
      const result = await BluetoothManager.scanDevices();
      console.log('Scan result:', result);
      found = this.parseDeviceList(result.found || '[]');
    } catch (e: any) {
      console.error('Error Scanning Bluetooth Devices:', e);
      throw e;
    }
    return found;
  }

  /**
   * Connect to a printer
   */
  static async connectBluetoothPrinter(
    device: BluetoothDevice
  ): Promise<boolean> {
    await BluetoothManager.connect(device.address);
    await BluetoothEscposPrinter.printerInit();

    this.config = {
      connectionType: 'bluetooth',
      isConnected: true,
      deviceName: device.name,
      deviceAddress: device.address,
    };

    return true;
  }

  /**
   * Disconnect printer
   */
  static async disconnect(): Promise<void> {
    if (this.config.deviceAddress) {
      await BluetoothManager.unpaire(this.config.deviceAddress);
    }
    this.clearConfig();
  }

  /**
   * Get current connection state
   */
  static getConfig(): PrinterConfig {
    return this.config;
  }

  // --- helpers ---
  private static parseDeviceList(devices: any): BluetoothDevice[] {
    if (typeof devices === 'string') {
      try {
        return JSON.parse(devices);
      } catch (e) {
        return [];
      }
    }
    return devices || [];
  }

  private static parseDevice(device: any): BluetoothDevice | null {
    if (!device) return null;
    if (typeof device === 'string') {
      try {
        return JSON.parse(device);
      } catch (e) {
        return null;
      }
    }
    return device;
  }

  private static clearConfig() {
    this.config = {
      connectionType: 'bluetooth',
      isConnected: false,
      deviceName: null,
      deviceAddress: null,
    };
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
        for (let i = 100; i <= 110; i++) {
          // Scan .100 to .110
          const ip = baseIP + i;

          for (const port of commonPorts) {
            try {
              const isReachable = await this.testNetworkConnection(
                ip,
                port,
                2000
              );
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

  private static async testNetworkConnection(
    ip: string,
    port: number,
    timeout: number
  ): Promise<boolean> {
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

  private static async getPrinterInfo(
    ip: string,
    port: number
  ): Promise<{ name?: string; model?: string }> {
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

  static async connectNetworkPrinter(
    ipAddress: string,
    port: number,
    name: string
  ): Promise<boolean> {
    return false;
  }

  // WiFi Direct Methods
  static async scanWiFiPrinters(): Promise<NetworkPrinter[]> {
    if (Platform.OS === 'web') {
      throw new Error('WiFi printer scanning not available on web platform');
    }
    return [];
  }

  // USB Methods (Android only)
  static async scanUSBDevices(): Promise<BluetoothDevice[]> {
    return [];
  }

  // Generic Connection Method
  static async connectToPrinter(
    deviceId: string,
    type: PrinterConfig['connectionType'],
    options?: any
  ): Promise<boolean> {
    switch (type) {
      case 'bluetooth':
        return this.connectBluetoothPrinter({
          address: deviceId,
          name: options?.name || 'Bluetooth Printer',
          id: deviceId, // if your type requires `id`
        });
      case 'usb':
        throw new Error('USB connection requires physical device testing');
      case 'ethernet':
        return this.connectNetworkPrinter(
          options?.ipAddress,
          options?.port || 9100,
          options?.name
        );
      case 'wifi':
        return this.connectNetworkPrinter(
          options?.ipAddress,
          options?.port || 9100,
          options?.name
        );
      default:
        return false;
    }
  }

  static async disconnectPrinter(): Promise<void> {
    try {
      // Close connections based on type
      switch (this.config.connectionType) {
        case 'bluetooth':
          this.disconnect();
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
        deviceAddress: null,
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

  private static async sendPrintJob(
    content: string,
    isTest: boolean = false
  ): Promise<boolean> {
    try {
      switch (this.config.connectionType) {
        case 'bluetooth':
          return await this.printViaBluetooth(content);
        case 'ethernet':
        case 'wifi':
          return await this.printViaNetwork(content);
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
