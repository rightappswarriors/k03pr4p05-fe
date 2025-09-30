import { Alert, Platform } from 'react-native';
import { PrinterService } from '@/services/printerService';
import { TransactionService } from '@/services/orderService';
import type { Receipt } from '@/types';
import { calculateTotal } from '@/hooks/calculateTotal';
import { storeData } from '@/data/mockData';

export class ReceiptService {
  static async processAndPrintReceipt({
    items,
    paymentMethod = 'cash',
    cashReceived = 0,
    discountOption = 'NONE',
    onSuccess,
    onFail,
  }: {
    items: any[];
    paymentMethod?: 'cash' | 'card' | 'digital';
    cashReceived?: number;
    discountOption?: string;
    onSuccess?: () => void;
    onFail?: () => void;
  }) {
    try {
      const { total, subtotal, vatAmount, discount, discountRate } =
        calculateTotal(items, storeData, { type: discountOption as any });
      // ✅ Only check when payment method is cash
      if (paymentMethod === 'cash') {
        if (!cashReceived || cashReceived < total) {
          Alert.alert(
            'Insufficient Cash',
            'Cash received is less than the total amount.'
          );
          onFail?.();
          return;
        }
      }

      await TransactionService.createOrder(items, paymentMethod, cashReceived);

      const change = cashReceived - total;

      const receiptData: Receipt = {
        store: storeData,
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
          vatable: data.vatable,
          quantity: data.quantity,
          subtotal: data.price * data.quantity,
          barcode: data.barcode,
        })),
        totals: {
          subtotal: parseFloat(subtotal.toFixed(2)),
          vatAmount: parseFloat(vatAmount.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          cashReceived:
            paymentMethod === 'cash' ? parseFloat(cashReceived!.toFixed(2)) : 0,
          change: paymentMethod === 'cash' ? parseFloat(change.toFixed(2)): 0,
        },
        payment: {
          method: paymentMethod,
          status: 'Completed',
        },
      };

      // Simulate printing delay
      setTimeout(() => {
        PrinterService.printOrderReceipt(receiptData);

        if (Platform.OS === 'web') {
          alert('Transaction completed successfully!');
        }

        Alert.alert('Receipt Printed', 'Transaction completed successfully!', [
          { text: 'OK', onPress: () => onSuccess?.() },
        ]);
      }, 2000);
    } catch (error) {
      console.error('Error printing receipt:', error);
      Alert.alert('Error', 'Failed to process the receipt.');
      onFail?.();
    }
  }
}
