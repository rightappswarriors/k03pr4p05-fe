import * as Print from 'expo-print';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const appVersion = Constants.expoConfig?.version || 'unknown';

type PrinterEvent = 'paired' | 'found' | 'connectionLost' | 'notSupported';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Receipt } from '@/types';

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

export class PrinterService {
  private static config: PrinterConfig = {
    connectionType: null,
    isConnected: true,
    deviceName: null,
    deviceAddress: null,
  };
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

    try {
      const receiptHTML = this.generateOrderReceiptHtml(receipt);

      return await this.sendPrintJob(receiptHTML, false);
    } catch (error: any) {
      throw new Error(`Receipt printing failed: ${error.message}`);
    }
  }

  private static async sendPrintJob(
    content: string,
    isTest: boolean = false
  ): Promise<boolean> {
    try {
      const htmlContent = await this.convertContentToHtml(content);
      // In sendPrintJob, web path:
      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank', 'width=500,height=800');
        if (printWindow) {
          printWindow.document.write(content);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
          return true;  // ← was returning false before
        }
        alert('Unable to open print window.');
        return false;
      } else {
        await Print.printAsync({
          html: htmlContent,
          width: 226, // 58mm in points
          height: 600,
        });
        return true;
      }

      return false;
    } catch (error) {
      //console.error('Print job failed:', error);
      throw error;
    }
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
            table { width: 100%; border-collapse: collapse; }           
            td, th { font-size: 10px; font-family: 'Courier New', monospace; }
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
    const WEIGHT_UNITS = ['kg', 'gram', 'g', 'grams', 'kilo', 'kilos'];

    const itemsHtml = receipt.items
      .map((item: any) => {
        const isWeight = item.unitName &&
          WEIGHT_UNITS.includes(item.unitName.toLowerCase());
        const unitPrice = item.priceAtSale ?? item.price;
        const lineTotal = unitPrice * item.quantity;

        const qtyLabel = isWeight
          ? `${item.quantity.toFixed(3)} ${item.unitName} x Php ${unitPrice.toFixed(2)}/${item.unitName}`
          : `${item.quantity} ${item.unitLabel ?? 'pc'} x Php ${unitPrice.toFixed(2)}`;

        return `
        <tr>
          <td>${item.name}</td>
          <td>${qtyLabel}</td>
          <td class="right">Php ${lineTotal.toFixed(2)}</td>
        </tr>
      `;
      })
      .join('');

    return `
    <html>
      <head>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            margin: 0;
            padding: 10px;
            width: 58mm;
          }
          td {
            font-family: 'Courier New', monospace;
            font-size: 10px;
            padding: 2px 0;
          }
          .center { text-align: center; }
          .right  { text-align: right; }
          .bold   { font-weight: bold; }
          .line   { border-bottom: 1px dashed #000; margin: 5px 0; }
          table   { width: 100%; border-collapse: collapse; }
        </style>
      </head>
      <body>
        <div class="center bold">${receipt.outlet?.name ?? 'RECEIPT'}</div>
        <div class="center">${receipt.outlet?.address ?? ''}</div>
        ${receipt.outlet?.tin
        ? `<div class="center">TIN: ${receipt.outlet.tin}</div>`
        : ''}
        <div class="center">
          ${receipt.outlet?.isVatRegistered ? 'VAT-Registered' : 'Non-VAT'}
        </div>
        ${receipt.outlet?.ptu
        ? `<div class="center">PTU#: ${receipt.outlet.ptu}</div>`
        : ''}
        ${receipt.outlet?.bir
        ? `<div class="center">BIR Accreditation No: ${receipt.outlet.bir}</div>`
        : ''}

        <div class="line"></div>
        <table>
          <tr>
            <td>Terminal: POS-${receipt.outlet?.id}</td>
            <td class="right">SN: ${receipt.outlet?.id}</td>
          </tr>
          <tr>
            <td>Order#: ${receipt.transaction.id}</td>
            <td class="right">
              ${new Date(receipt.transaction.date).toLocaleDateString()}
            </td>
          </tr>
          <tr>
            <td>Cashier: ${receipt.user?.fullname ?? receipt.user?.id ?? 'Unknown'}</td>
            <td class="right">
              ${new Date(receipt.transaction.timestamp).toLocaleTimeString()}
            </td>
          </tr>
        </table>
        <div class="line"></div>

        <table>
          <thead>
            <tr>
              <th class="left">Item</th>
              <th class="left">Qty/Wt × Price</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="line"></div>

        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="right">Php ${receipt.totals.subtotal.toFixed(2)}</td>
          </tr>
          ${receipt.outlet?.isVatRegistered
        ? `<tr>
                <td>VAT (${(receipt.outlet.VatPercent ?? 0) * 100}%):</td>
                <td class="right">Php ${(receipt.totals.vatAmount ?? 0).toFixed(2)}</td>
               </tr>`
        : ''}
          ${receipt.totals.discountType
        ? `<tr>
                <td>${receipt.totals.discountType.toUpperCase()} Discount
                  (${receipt.totals.discountPercent ?? 0}%):
                </td>
                <td class="right">-Php ${(receipt.totals.discountTotal ?? 0).toFixed(2)}</td>
               </tr>`
        : ''}
        </table>
        <div class="line"></div>

        <table>
          <tr class="bold">
            <td>TOTAL AMOUNT DUE:</td>
            <td class="right">Php ${receipt.totals.total.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Cash Received:</td>
            <td class="right">Php ${receipt.totals.cashReceived.toFixed(2)}</td>
          </tr>
          <tr class="bold">
            <td>Change:</td>
            <td class="right">Php ${receipt.totals.change.toFixed(2)}</td>
          </tr>
        </table>
        <div class="line"></div>

        <div>Transaction #${receipt.transaction.id.slice(-8)}</div>
        <div>POS VERSION: Right Apps KOMPRA POS ${appVersion}</div>
        <div class="center">THIS RECEIPT IS GENERATED BY:</div>
        <div class="center">BIR-ACCREDITED POS SYSTEM</div>
        <div class="line"></div>
        <div class="center bold">Thank you for your business!</div>
      </body>
    </html>
  `;
  }

  private static async saveConfig(): Promise<void> {
    await AsyncStorage.setItem(PRINTER_CONFIG_KEY, JSON.stringify(this.config));
  }
}
