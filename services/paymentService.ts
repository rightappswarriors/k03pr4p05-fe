import { Alert, Platform } from 'react-native';
import { PrinterService } from '@/services/printerService';
import { TransactionService } from '@/services/orderService';
import { SalesService } from '@/services/salesService';
import type { Outlet, Receipt, User, DEFAULT_VAT_RATE } from '@/types';
import { DEFAULT_VAT_RATE as VAT_RATE } from '@/types';
import { calculateTotal, calculateItemVat } from '@/hooks/calculateTotal';
import { formatGraphQLError } from '@/utils/errorFormatter';

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
    customerType = 'REGULAR',
    scPwdCustomerInput,
    totalPax,
    scPwdPax,
    outletPromoId,
    promoDiscountAmt,
    printWindow,
  }: {
    items: any[];
    paymentMethod?: 'CASH' | 'CARD' | 'DIGITAL';
    cashReceived?: number;
    user: User;
    outlet: Outlet;
    discountOption?: string;
    onSuccess?: () => void;
    onFail?: (message?: string) => void;
    isVatExempt?: boolean;
    vatExemptType?: 'SENIOR_CITIZEN' | 'PWD' | 'DIPLOMAT' | 'GOVERNMENT';
    vatExemptRefNo?: string;
    vatExemptAmount?: number;
    customerType?: string;
    scPwdCustomerInput?: any;
    totalPax?: number;
    scPwdPax?: number;
    outletPromoId?: number;
    promoDiscountAmt?: number;
    printWindow?: Window | null;
  }) {
    try {
      let activePrintWindow: Window | null = printWindow ?? null;
      if (Platform.OS === 'web') {
        activePrintWindow = activePrintWindow ?? window.open('', '_blank', 'width=500,height=800');
        if (!activePrintWindow) {
          window.alert('Unable to open print window. Please allow popups for this site.');
          onFail?.();
          return;
        }
      }

      const { total, subtotal, vatAmount, discount, discountRate, vatExemptSale, itemBreakdown } =
        calculateTotal(items, outlet, {
          type: discountOption as any,
          applyVatExempt: Boolean(isVatExempt),
        },
          Boolean(isVatExempt));

      if (paymentMethod === 'CASH') {
        if (!cashReceived || cashReceived < total) {
          Alert.alert('Insufficient Cash', 'Cash received is less than the total amount.');
          onFail?.();
          return;
        }
      }

      const change = cashReceived - total;

      // Calculate per-item VAT
      const itemsWithVat = items.map((data, index) => {
        const computedLine = itemBreakdown?.[index] ?? {};
        let itemVat = 0;
        if (outlet.isVatRegistered && data.vatExempt !== true && !isVatExempt) {
          const itemPrice = data.priceAtSale ?? data.price;
          const discountQty = (data as any).discountQuantity ?? 0;
          const discountRate = (data as any).discountRate ?? 0;

          const discountedPrice = itemPrice * (1 - discountRate);
          const discountedTotal = discountedPrice * discountQty;
          const regularTotal = itemPrice * (data.quantity - discountQty);
          const lineTotal = discountedTotal + regularTotal;

          itemVat = lineTotal - lineTotal / (1 + VAT_RATE);
        }

        return {
          id: data.id,
          name: data.name,
          price: data.price,
          priceAtSale: data.priceAtSale ?? data.price,
          quantity: data.quantity,
          unitId: data.unitId,
          unitName: data.unitName,
          unitLabel: data.unitLabel,
          subtotal: (data.priceAtSale ?? data.price) * data.quantity,
          discountAmount: computedLine.discountAmount ?? data.discountAmount ?? 0,
          vatExempt: data.vatExempt,
          barcode: data.barcode,
          itemVatAmount: itemVat, // ← per-item VAT
          discountType: computedLine.discountType,
          discountRate: computedLine.discountRate ?? data.discountRate,
          originalPrice: computedLine.originalPrice ?? (data.priceAtSale ?? data.price),
          vatExclusivePrice: computedLine.vatExclusivePrice,
          finalPrice: computedLine.finalPrice ?? (data.priceAtSale ?? data.price),
        };
      });

      const receiptData: Receipt = {
        outlet,
        user,
        transaction: {
          id: `TXN-${Date.now()}`,
          date: new Date().toISOString(),
          timestamp: new Date().toLocaleString(),
          cashier: 'POS System',
        },
        items: itemsWithVat,
        totals: {
          subtotal: parseFloat(subtotal.toFixed(2)),
          vatAmount: parseFloat(vatAmount.toFixed(2)),
          vatExemptSale: parseFloat((vatExemptSale ?? 0).toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          discountType:
            discount > 0 || isVatExempt
              ? discountOption !== 'NONE'
                ? discountOption
                : 'CUSTOM'
              : undefined,
          discountPercent:
            discount > 0 || isVatExempt
              ? discountOption !== 'NONE'
                ? discountRate * 100
                : undefined
              : undefined,
          discountTotal:
            discount > 0 || isVatExempt
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
        scPwdCustomer: scPwdCustomerInput,
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
        discountAmount: itemBreakdown?.find((line: any) => line.id === data.id)?.discountAmount ?? data.discountAmount ?? 0,
        discountType: itemBreakdown?.find((line: any) => line.id === data.id)?.discountType ?? data.discountType,
        discountRate: itemBreakdown?.find((line: any) => line.id === data.id)?.discountRate ?? data.discountRate,
        originalPrice: itemBreakdown?.find((line: any) => line.id === data.id)?.originalPrice,
        vatExclusivePrice: itemBreakdown?.find((line: any) => line.id === data.id)?.vatExclusivePrice,
        finalPrice: itemBreakdown?.find((line: any) => line.id === data.id)?.finalPrice,
      }));

      // Print first, then save the transaction only after successful printing.
      const printed = await PrinterService.printOrderReceipt(receiptData, activePrintWindow);
      if (!printed) {
        throw new Error('Unable to print receipt.');
      }

      const createdTransaction = await SalesService.createTransaction({
        outletId,
        cashierId: userId,
        total: parseFloat(total.toFixed(2)),
        subtotal: parseFloat(subtotal.toFixed(2)),
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        vatExemptSale: parseFloat((vatExemptSale ?? 0).toFixed(2)),
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
        customerType,
        scPwdCustomerInput,
        discountRate,
        totalPax,
        scPwdPax,
        outletPromoId,
        promoDiscountAmt,
        isVatExempt: Boolean(isVatExempt),
        vatExemptType: isVatExempt ? vatExemptType : undefined,
        vatExemptRefNo: isVatExempt ? vatExemptRefNo : undefined,
        vatExemptAmount: isVatExempt ? vatExemptAmount : undefined,
      });

      await TransactionService.createOrder(
        items as any,
        userId,
        outletId,
        paymentMethod,
        paymentMethod === 'CASH' ? parseFloat(cashReceived.toFixed(2)) : 0,
        parseFloat(vatAmount.toFixed(2)),
        parseFloat(total.toFixed(2)),
        parseFloat(subtotal.toFixed(2)),
        paymentMethod === 'CASH' ? parseFloat(change.toFixed(2)) : 0,
        'SYNCED',
        createdTransaction?.id,
      );

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
      const errorMessage = formatGraphQLError(error) ?? 'Failed to process the receipt.';

      if (__DEV__) console.error('Error printing receipt:', errorMessage);
      onFail?.(errorMessage);
    }
  }
}



