import * as Print from 'expo-print';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const appVersion = Constants.expoConfig?.version || 'unknown';

type PrinterEvent = 'paired' | 'found' | 'connectionLost' | 'notSupported';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Receipt } from '@/types';
import type { SalesOrder } from '@/services/salesOrder.service';

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

  static async printOrderReceipt(receipt: Receipt, printWindow?: Window | null): Promise<boolean> {

    try {
      const receiptHTML = this.generateOrderReceiptHtml(receipt);

      return await this.sendPrintJob(receiptHTML, false, printWindow);
    } catch (error: any) {
      throw new Error(`Receipt printing failed: ${error.message}`);
    }
  }

  static async printSalesOrderReceipt(salesOrder: SalesOrder): Promise<void> {
    try {
      const printWindow =
        Platform.OS === 'web'
          ? window.open('', '_blank', 'width=500,height=800')
          : null;
      await this.sendPrintJob(this.generateSalesOrderHtml(salesOrder, 'receipt'), false, printWindow);
    } catch {
      throw new Error('Printer not connected. Please check printer and try again.');
    }
  }

  static async printSalesOrderInvoice(salesOrder: SalesOrder): Promise<void> {
    try {
      const printWindow =
        Platform.OS === 'web'
          ? window.open('', '_blank', 'width=500,height=800')
          : null;
      await this.sendPrintJob(this.generateSalesOrderHtml(salesOrder, 'invoice'), false, printWindow);
    } catch {
      throw new Error('Printer not connected. Please check printer and try again.');
    }
  }

  private static async sendPrintJob(
    content: string,
    isTest: boolean = false,
    printWindow?: Window | null,
  ): Promise<boolean> {
    try {
      const htmlContent = await this.convertContentToHtml(content);
      // In sendPrintJob, web path:
      if (Platform.OS === 'web') {
        const targetWindow = printWindow;
        if (!targetWindow) {
          window.alert('Print window could not be opened.');
          return false;
        }

        return new Promise<boolean>((resolve, reject) => {
          try {
            // ✅ Use Blob URL instead of document.write() — works reliably on desktop
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const blobUrl = URL.createObjectURL(blob);

            targetWindow.location.href = blobUrl;

            targetWindow.onload = () => {
              try {
                URL.revokeObjectURL(blobUrl); // clean up memory
                targetWindow.focus();
                targetWindow.print();
                resolve(true);
              } catch (err) {
                reject(err);
              }
            };

            // Fallback if onload doesn't fire
            setTimeout(() => {
              try {
                targetWindow.focus();
                targetWindow.print();
                resolve(true);
              } catch (err) {
                reject(err);
              }
            }, 1000);

          } catch (error) {
            reject(error);
          }
        });
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
    const scPwdCustomer = (receipt as any).scPwdCustomer;

    const itemsHtml = receipt.items
      .map((item: any) => {
        const isWeight = item.unitName &&
          WEIGHT_UNITS.includes(item.unitName.toLowerCase());
        const unitPrice = item.priceAtSale ?? item.price;
        const discountQty = (item as any).discountQuantity ?? 0;
        const discountRate = (item as any).discountRate ?? 0;
        const discountAmount = (item as any).discountAmount ?? 0;
        const itemVat = item.itemVatAmount ?? 0;
        const originalPrice = item.originalPrice ?? unitPrice;
        const finalPrice = item.finalPrice ?? unitPrice;

        // Calculate discounted and regular portions
        const discountedPrice = unitPrice * (1 - discountRate);
        const discountedTotal = discountedPrice * discountQty;
        const regularTotal = unitPrice * (item.quantity - discountQty);
        const lineTotal = discountedTotal + regularTotal;
        const lineTotalWithVat = lineTotal;

        const priceLabel = finalPrice < originalPrice
          ? `<s>Php ${originalPrice.toFixed(2)}</s> Php ${finalPrice.toFixed(2)}`
          : `Php ${unitPrice.toFixed(2)}`;
        const qtyLabel = isWeight
          ? `${item.quantity.toFixed(3)} ${item.unitName} x ${priceLabel}/${item.unitName}`
          : `${item.quantity} ${item.unitLabel ?? 'pc'} x ${priceLabel}`;

        let itemRow = `
        <tr>
          <td>${item.name}</td>
          <td>${qtyLabel}</td>
          <td class="right">Php ${lineTotalWithVat.toFixed(2)}</td>
        </tr>`;

        // Add discount details if there's a discount
        if (discountAmount > 0) {
          const discountDisplay = item.discountType
            ? this.discountLabel(item.discountType, discountRate)
            : `${discountQty || item.quantity} @ ${(discountRate * 100).toFixed(0)}% off`;
          itemRow += `
        <tr>
          <td style="padding-left: 10px; color: #666; font-size: 9px;">  ${discountDisplay}</td>
          <td style="color: #666; font-size: 9px;">-Php ${discountAmount.toFixed(2)}</td>
          <td></td>
        </tr>`;
        }

        // Add VAT details if there's VAT
        if (itemVat > 0) {
          itemRow += `
        <tr>
          <td style="padding-left: 10px; color: #666; font-size: 9px;">  VAT (12%)</td>
          <td style="color: #666; font-size: 9px;">Php ${itemVat.toFixed(2)}</td>
          <td></td>
        </tr>`;
        }

        return itemRow;
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
        ${scPwdCustomer
        ? `<div class="bold">Senior Citizen / PWD Information</div>
           <div>Name: ${scPwdCustomer.fullName ?? ''}</div>
           <div class="bold">ID No.: ${scPwdCustomer.idNumber ?? receipt.totals.vatExemptRefNo ?? ''}</div>
           <div>ID Type: ${scPwdCustomer.idType ?? ''}</div>
           ${scPwdCustomer.isRepresentative ? `<div>Purchased by representative: ${scPwdCustomer.representativeName ?? ''}</div>` : ''}
           <div class="line"></div>`
        : ''}
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
          <tr>
            <td>VAT Exempt Sale:</td>
            <td class="right">Php ${((receipt.totals as any).vatExemptSale ?? receipt.totals.vatExemptAmount ?? 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>VAT (12%):</td>
            <td class="right">Php ${(receipt.totals.vatAmount ?? 0).toFixed(2)}</td>
          </tr>
          ${receipt.totals.discountType
        ? `<tr>
                <td>Discount (${receipt.totals.discountType.toUpperCase()})
                  (${receipt.totals.discountPercent ?? 0}%):
                </td>
                <td class="right">-Php ${(receipt.totals.discountTotal ?? 0).toFixed(2)}</td>
               </tr>`
        : ''}
        </table>
        <div class="line"></div>

        <table>
          <tr class="bold">
            <td>NET AMOUNT DUE:</td>
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
        ${receipt.totals.isVatExempt
        ? `<div class="line"></div>
           <div class="center">This transaction is subject to SC/PWD discount per RA 9994 / RA 10754.</div>
           <div class="center bold">SC/PWD ID No.: ${receipt.totals.vatExemptRefNo ?? scPwdCustomer?.idNumber ?? ''}</div>`
        : ''}
      </body>
    </html>
  `;
  }

  private static money(value?: number | null): string {
    return `Php ${Number(value ?? 0).toFixed(2)}`;
  }

  private static salesOrderItemName(item: SalesOrder['items'][number]): string {
    return item.isCustomItem ? item.customItemName ?? 'Custom Item' : item.item?.name ?? `Item #${item.itemId}`;
  }

  private static discountLabel(type?: string | null, rate?: number | null): string {
    const labelByType: Record<string, string> = {
      BNPC_SENIOR_CITIZEN: 'BNPC 5%',
      BNPC_PWD: 'BNPC 5%',
      SENIOR_CITIZEN: 'Senior/PWD VAT-Exempt 20%',
      PWD: 'Senior/PWD VAT-Exempt 20%',
      CUSTOM: 'Automatic Item Discounts',
    };
    if (!type || type === 'NONE') return 'Discount';
    if (labelByType[type]) return labelByType[type];
    const percent = Number(rate ?? 0) > 0 ? ` ${(Number(rate) * 100).toFixed(0)}%` : '';
    return `${type}${percent}`;
  }

  private static salesOrderDiscountSummary(items: SalesOrder['items']): string {
    const labels = Array.from(
      new Set(
        items
          .filter((item) => Number(item.discountAmount ?? 0) > 0)
          .map((item) => this.discountLabel(item.discountType, item.discountRate)),
      ),
    );
    return labels.length > 0 ? labels.join(' + ') : 'Discount';
  }

  private static generateSalesOrderHtml(salesOrder: SalesOrder, kind: 'receipt' | 'invoice'): string {
    const isInvoice = kind === 'invoice';
    const date = new Date(salesOrder.date);
    const scPwdCustomer = salesOrder.scPwdCustomer;
    const isScPwd = salesOrder.customerType === 'SENIOR_CITIZEN' || salesOrder.customerType === 'PWD';
    const extraCharges = salesOrder.extraCharges ?? [];
    const vatableSale = Math.max(0, salesOrder.subtotal - salesOrder.vatExemptSale - salesOrder.vatAmount);
    const discountSummary = this.salesOrderDiscountSummary(salesOrder.items);
    const soldTo =
      salesOrder.customerName ||
      scPwdCustomer?.fullName ||
      salesOrder.customer ||
      'Walk-in';

    const itemsHtml = salesOrder.items
      .map((item) => {
        const name = this.salesOrderItemName(item);
        const lineTotal = item.totalPrice ?? item.unitPrice * item.quantity;
        const discountAmount = Number(item.discountAmount ?? 0);
        const discountRow = discountAmount > 0
          ? `
            <tr>
              <td class="muted">${this.discountLabel(item.discountType, item.discountRate)}</td>
              <td class="right muted">-${this.money(discountAmount)}</td>
            </tr>
          `
          : '';
        return `
          <tr><td colspan="2">${item.quantity}x ${name}</td></tr>
          <tr>
            <td class="muted">@ ${this.money(item.unitPrice)}</td>
            <td class="right">${this.money(lineTotal)}</td>
          </tr>
          ${discountRow}
        `;
      })
      .join('');

    const extraChargesHtml = extraCharges.length
      ? `
        <div class="line"></div>
        <div class="bold">EXTRA CHARGES</div>
        <table>
          ${extraCharges
            .map((charge) => `
              <tr>
                <td>${charge.label}</td>
                <td class="right">${this.money(charge.amount)}</td>
              </tr>
            `)
            .join('')}
          <tr class="bold">
            <td>Extra Charges Total:</td>
            <td class="right">${this.money(salesOrder.extraChargesTotal)}</td>
          </tr>
        </table>
      `
      : '';

    const customerBlock =
      salesOrder.orderMode === 'PICK_UP'
        ? `
          <div>Customer: ${salesOrder.customerName ?? ''}</div>
          <div>Contact: ${salesOrder.customerContact ?? ''}</div>
        `
        : salesOrder.orderMode === 'DELIVERY'
          ? `
            <div>Deliver to: ${salesOrder.deliveryAddress ?? ''}</div>
            <div>Contact: ${salesOrder.customerContact ?? ''}</div>
            ${salesOrder.deliveryNotes ? `<div>Notes: ${salesOrder.deliveryNotes}</div>` : ''}
          `
          : '';

    const scPwdBlock = isScPwd && scPwdCustomer
      ? `
        <div class="line"></div>
        <div class="bold">SC/PWD INFORMATION</div>
        <div>Name: ${scPwdCustomer.fullName}</div>
        <div>ID Type: ${scPwdCustomer.idType}</div>
        <div class="bold">${isInvoice ? 'SC/PWD ID No.:' : 'ID No.:'} ${scPwdCustomer.idNumber}</div>
        ${scPwdCustomer.isRepresentative ? `
          <div>Rep: ${scPwdCustomer.representativeName ?? ''}</div>
          <div>Rep ID: ${scPwdCustomer.representativeIdNumber ?? ''}</div>
        ` : ''}
        <div>Discount per RA 9994 / RA 10754</div>
      `
      : '';

    const invoiceOnly = isInvoice
      ? `
        <div>Sold To: ${soldTo}</div>
        <div>TIN: </div>
      `
      : '';

    const totalsHtml = isInvoice
      ? `
        <table>
          <tr><td>Gross Sales (VAT Included):</td><td class="right">${this.money(salesOrder.subtotal)}</td></tr>
          <tr><td>VATable Sale:</td><td class="right">${this.money(vatableSale)}</td></tr>
          <tr><td>VAT-Exempt Sale:</td><td class="right">${this.money(salesOrder.vatExemptSale)}</td></tr>
          <tr><td>Zero-Rated Sale:</td><td class="right">${this.money(0)}</td></tr>
          <tr><td>VAT Amount (12%):</td><td class="right">${this.money(salesOrder.vatAmount)}</td></tr>
          ${salesOrder.discountAmount > 0 ? `<tr><td>Discount (${discountSummary}):</td><td class="right">-${this.money(salesOrder.discountAmount)}</td></tr>` : ''}
          ${salesOrder.extraChargesTotal > 0 ? `<tr><td>Extra Charges:</td><td class="right">+${this.money(salesOrder.extraChargesTotal)}</td></tr>` : ''}
        </table>
        <div class="line"></div>
        <table><tr class="bold"><td>Total Amount Due:</td><td class="right">${this.money(salesOrder.grandTotal)}</td></tr></table>
      `
      : `
        <table>
          <tr><td>Gross Sales (VAT Included):</td><td class="right">${this.money(salesOrder.subtotal)}</td></tr>
          ${isScPwd ? `<tr><td>VAT Exempt Sale:</td><td class="right">${this.money(salesOrder.vatExemptSale)}</td></tr>` : ''}
          <tr><td>VATable Sale:</td><td class="right">${this.money(vatableSale)}</td></tr>
          <tr><td>VAT (12%):</td><td class="right">${this.money(salesOrder.vatAmount)}</td></tr>
          ${salesOrder.discountAmount > 0 ? `<tr><td>Discount (${discountSummary}):</td><td class="right">-${this.money(salesOrder.discountAmount)}</td></tr>` : ''}
          ${salesOrder.extraChargesTotal > 0 ? `<tr><td>Extra Charges:</td><td class="right">+${this.money(salesOrder.extraChargesTotal)}</td></tr>` : ''}
        </table>
        <div class="heavy"></div>
        <table><tr class="bold big"><td>GRAND TOTAL:</td><td class="right">${this.money(salesOrder.grandTotal)}</td></tr></table>
        <div class="heavy"></div>
      `;

    return `
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 10px; margin: 0; padding: 10px; width: 58mm; }
            table { width: 100%; border-collapse: collapse; }
            td { font-family: 'Courier New', monospace; font-size: 10px; padding: 2px 0; vertical-align: top; overflow-wrap: anywhere; }
            .center { text-align: center; }
            .right { text-align: right; white-space: nowrap; }
            .bold { font-weight: bold; }
            .big td { font-size: 12px; }
            .muted { color: #555; padding-left: 12px; }
            .line { border-bottom: 1px dashed #000; margin: 6px 0; }
            .heavy { border-bottom: 2px solid #000; margin: 6px 0; }
          </style>
        </head>
        <body>
          <div class="center bold">${salesOrder.outlet?.name ?? 'Business Name'}</div>
          <div class="center">${salesOrder.outlet?.address ?? ''}</div>
          <div class="center">TIN: ${salesOrder.outlet?.tin ?? ''}</div>
          <div class="line"></div>
          <div class="center bold">${isInvoice ? 'SALES INVOICE' : 'SALES RECEIPT'}</div>
          <div class="line"></div>
          ${invoiceOnly}
          <table>
            <tr><td>Order #: ${salesOrder.orderNumber}</td></tr>
            <tr><td>Date: ${date.toLocaleDateString('en-PH')}</td><td class="right">Time: ${date.toLocaleTimeString('en-PH')}</td></tr>
            <tr><td>Mode: ${salesOrder.orderMode.replace('_', '-')}</td></tr>
          </table>
          ${customerBlock}
          <div class="line"></div>
          <div class="bold">ITEMS</div>
          <table>${itemsHtml}</table>
          ${extraChargesHtml}
          <div class="line"></div>
          ${totalsHtml}
          ${scPwdBlock}
          <div class="line"></div>
          ${isInvoice ? `
            <div>Received by: _______________________</div>
            <div>Date: _______________________________</div>
            <div class="line"></div>
          ` : ''}
          <div class="center">Thank you for your purchase!</div>
          <div class="center">Right Apps KOMPRA POS ${appVersion}</div>
        </body>
      </html>
    `;
  }

  private static async saveConfig(): Promise<void> {
    await AsyncStorage.setItem(PRINTER_CONFIG_KEY, JSON.stringify(this.config));
  }
}
