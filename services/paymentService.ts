import { Alert, Platform } from 'react-native';
import { PrinterService } from '@/services/printerService';
import { TransactionService } from '@/services/orderService';
import { SalesService } from '@/services/salesService';
import type { Outlet, Receipt, User } from '@/types';
import { calculateTotal } from '@/hooks/calculateTotal';

export class ReceiptService {
  static async processAndPrintReceipt({
  items,
  paymentMethod = 'CASH',
  cashReceived = 0,
  discountOption = 'NONE',
  onSuccess,
  onFail,
  outlet,
  user,
  isVatExempt,
  vatExemptType,
  vatExemptRefNo,
  vatExemptAmount,
  outletPromoId,
  promoDiscountAmt,
}: {
  items: any[];
  paymentMethod?: 'CASH' | 'CARD' | 'DIGITAL';
  cashReceived?: number;
  user: User;
  outlet: Outlet;
  discountOption?: string;
  onSuccess?: () => void;
  onFail?: () => void;
  isVatExempt?: boolean;
  vatExemptType?: 'SENIOR_CITIZEN' | 'PWD' | 'DIPLOMAT' | 'GOVERNMENT';
  vatExemptRefNo?: string;
  vatExemptAmount?: number;
  outletPromoId?: number;
  promoDiscountAmt?: number;
}) {
  try {
    const { total, subtotal, vatAmount, discount, discountRate } =
      calculateTotal(items, outlet, {
        type: discountOption as any,
        applyVatExempt: Boolean(isVatExempt),
      });

    if (paymentMethod === 'CASH') {
      if (!cashReceived || cashReceived < total) {
        Alert.alert('Insufficient Cash', 'Cash received is less than the total amount.');
        onFail?.();
        return;
      }
    }

    const change = cashReceived - total;

    const receiptData: Receipt = {
      outlet,
      transaction: {
        id: `TXN-${Date.now()}`,
        date: new Date().toISOString(),
        timestamp: new Date().toLocaleString(),
        cashier: 'POS System',
      },
      items: items.map((data) => ({
        id: data.id,
        name: data.name,
        price: data.price,
        priceAtSale: data.priceAtSale ?? data.price,
        quantity: data.quantity,
        unitId: data.unitId,
        unitName: data.unitName,
        unitLabel: data.unitLabel,
        subtotal: (data.priceAtSale ?? data.price) * data.quantity,
        vatable: data.vatable,
        barcode: data.barcode,
      })),
      totals: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        discountType:
          discountOption !== 'NONE' && (discount !== 0 || isVatExempt)
            ? discountOption
            : undefined,
        discountPercent:
          discountOption !== 'NONE' && (discount !== 0 || isVatExempt)
            ? discountRate * 100
            : undefined,
        discountTotal:
          discountOption !== 'NONE' && (discount !== 0 || isVatExempt)
            ? discount
            : undefined,
        isVatExempt: Boolean(isVatExempt),
        vatExemptType: isVatExempt ? vatExemptType : undefined,
        vatExemptRefNo: isVatExempt ? vatExemptRefNo : undefined,
        vatExemptAmount: isVatExempt ? vatExemptAmount : undefined,
        cashReceived:
          paymentMethod === 'CASH' ? parseFloat(cashReceived.toFixed(2)) : 0,
        change:
          paymentMethod === 'CASH' ? parseFloat(change.toFixed(2)) : 0,
      },
      payment: {
        method: paymentMethod,
        status: 'Completed',
      },
    };

    const outletId = Number(outlet?.id);
    if (!outletId) throw new Error('Unable to get outlet id');
    const userId = Number(user?.id);
    if (!userId) throw new Error('Unable to get user id');

    const itemsSold = items.map((data: any) => ({
      itemId: Number(data.item?.id || data.id.split('_')[0]), // handle cartKey
      quantity: data.quantity,
      price: data.price,
      priceAtSale: data.priceAtSale ?? data.price,
      unitId: data.unitId ? Number(data.unitId) : undefined,
      unitName: data.unitName,
    }));

    await SalesService.createTransaction({
      outletId,
      cashierId: userId,
      total: parseFloat(total.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      vatAmount: parseFloat(vatAmount.toFixed(2)),
      paymentMethod,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      itemsSold,
      cashReceived: paymentMethod === 'CASH' ? parseFloat(cashReceived.toFixed(2)) : undefined,
      change: paymentMethod === 'CASH' ? parseFloat(change.toFixed(2)) : undefined,
      discountType:
        discountOption !== 'NONE' && (discount !== 0 || isVatExempt)
          ? discountOption
          : undefined,
      discountAmount:
        discountOption !== 'NONE' && (discount !== 0 || isVatExempt)
          ? discount
          : undefined,
      outletPromoId,
      promoDiscountAmt,
      isVatExempt: Boolean(isVatExempt),
      vatExemptType: isVatExempt ? vatExemptType : undefined,
      vatExemptRefNo: isVatExempt ? vatExemptRefNo : undefined,
      vatExemptAmount: isVatExempt ? vatExemptAmount : undefined,
    });

    // ← await print, no setTimeout
    await PrinterService.printOrderReceipt(receiptData);

    if (Platform.OS === 'web') {
      alert('Transaction completed successfully!');
      onSuccess?.();  // ← web: call directly, no Alert
      return;
    }

    // Native: wait for user to dismiss alert, then call onSuccess
    Alert.alert('Receipt Printed', 'Transaction completed successfully!', [
      { text: 'OK', onPress: () => onSuccess?.() },
    ]);
  } catch (error: any) {
    console.error('Error printing receipt:', error);
    Alert.alert('Error', error?.message ?? 'Failed to process the receipt.');
    onFail?.();
  }
}
}
