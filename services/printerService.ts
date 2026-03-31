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
    //if (!this.config.isConnected) {
    //  console.warn('No printer connected, skipping receipt print');
    //  return false;
    //}
    try {
      //console.log('generating receipt HTML: ');
      const receiptHTML = this.generateOrderReceiptHtml(receipt);

     //console.log('seindin print job:');
      return await this.sendPrintJob(receiptHTML, false);
    } catch (error: any) {
      //console.error('Failed to print order receipt:', error);
      throw new Error(`Receipt printing failed: ${error.message}`);
    }
  }

  private static async sendPrintJob(
    content: string,
    isTest: boolean = false
  ): Promise<boolean> {
    try {
      const htmlContent = await this.convertContentToHtml(content);
      if (Platform.OS === 'web') {
        //console.log(Platform.OS);
        const printWindow = window.open('', '_blank', 'width=500,height=800');
        if (printWindow) {
          printWindow.document.write(content);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        } else {
          alert('Unable to open print window.');
        }
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
    const itemsHtml = receipt.items
      .map(
        (item: any) => `
      <tr>
        <td class="item" style="font-size: 10px; font-family: 'Courier New', monospace;">${
          item.name
        }</td>
        <td class="item" style="font-size: 10px; font-family: 'Courier New', monospace;">${
          item.quantity
        } x Php ${item.price}</td>
        <td class="item" style="font-size: 10px; font-family: 'Courier New', monospace;">Php ${(
          item.price * item.quantity
        ).toFixed(2)}</td>
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
            .left { text-align: left; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; }
            td, th { font-size: 10px; font-family: 'Courier New', monospace; }

          </style>
        </head>
        <body id="receipt">
          <div class="center bold">RECEIPT</div>
          <div class="line"></div>
          <div class="center">${receipt.outlet?.name}</div>
          <div class="center">${receipt.outlet?.address}</div>
          <div class="center">Tin: ${receipt.outlet?.tin}</div>
          <div class="center">${
            receipt.outlet?.isVatRegistered ? 'VAT-Registered' : 'Non-VAT'
          }</div>
          <div class="center">PTU#: ${receipt.outlet?.ptu}</div>
          <div class="center">BIR Accredation No: ${receipt.outlet?.bir}</div>
          <table>
            <tr>  
              <td style="font-size: 10px; font-family: 'Courier New', monospace;">Terminal ID: POS-${receipt.outlet?.id}</td>
              <td class="right" style="font-size: 10px; font-family: 'Courier New', monospace;">SN: ${receipt.outlet?.id}</td>
            </tr>
            <tr>  
              <td>Order number: ${receipt.transaction.id}</td>
              <td class="right">Date: ${new Date(
                receipt.transaction.date
              ).toLocaleDateString()}</td>
            </tr>
            <tr>  
              <td></td>
              <td class="right">Time: ${new Date(
                receipt.transaction.timestamp
              ).toLocaleTimeString()}</td>
            </tr>
          </table>
          <div class="line"></div>
          <div class="center">You just bought</div>
          <div class="line"></div>
          <table>
            <thead>
            <tr>
              <th>Item</th>
              <th style="font-size: 8px; font-family: 'Courier New', monospace;">Qty * Price</th>
              <th>Amount</th>
            </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="line"></div>
          <table>
            <tr>
              <td>Subtotal:</td>
              <td class="right">Php ${(receipt.totals.subtotal * 100)}</td>
            </tr>
            <tr>
              <td>VAT (${receipt.outlet?.VatPercent}%):</td>
              <td class="right">Php ${
                receipt.totals.vatAmount ? receipt.totals.vatAmount : 0
              }</td>
            </tr>
            ${
              receipt.totals.discountType ?
              `
              <tr>
                <td>${receipt.totals.discountType.toUpperCase()} Discount${
                receipt.totals.discountPercent
              }:</td>
                <td class="right">Php ${receipt.totals.discountTotal?.toFixed(
                  2
                )}</td>
              </tr>
              `: ''
            }
          </table>
          <div class="line"></div>
          <table>
            <!--<tr>
              <td>VAT ZeroSales:</td>
              <td class="right">Php ${
                receipt.outlet?.VATZeroSale ? receipt.outlet.VATZeroSale : 0
              }</td>
            </tr>
            <tr>
              <td>VAT Zero Rated:</td>
              <td class="right">Php ${
                receipt.outlet?.VATZeroSale ? receipt.outlet.VATZeroSale : 0
              }</td>
            </tr>-->
            <tr class="bold">
              <td>CASH PAYED:</td>
              <td class="right">Php ${receipt.totals.cashReceived}</td>
            </tr>
            
            <tr class="bold">
              <td>TOTAL AMOUNT DUE:</td>
              <td class="right">Php ${receipt.totals.total}</td>
            </tr>
          </table>
          <div class="left">Transaction #${receipt.transaction.id.slice(
            -8
          )}</div>
          <div class="line"></div>
            <table>
              <tr class="bold">
                <td>Change:</td>
                <td class="right">Php ${receipt.totals.change}</td>
              </tr>
            </table>
          <div class="line"></div>
          <div>Cashier: ${receipt.user?.id ? receipt.user.id : 'Unknown'}</div>
          <div>POS VERSION: Right Apps POSVine ${appVersion}</div>
          <div>THIS RECEIPT IS GENERATED BY:\nBIR-ACCREDITED POS SYSTEM</div>
          <div class="center">Thank you for your business!</div>
        </body>
      </html>
    `;
  }
  
  private static async saveConfig(): Promise<void> {
    await AsyncStorage.setItem(PRINTER_CONFIG_KEY, JSON.stringify(this.config));
  }
}
