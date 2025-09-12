import { useState, useEffect } from 'react'
import {CartItem, Receipt} from '@/types' 
import usePos from '@/contexts/POSContext'
import { TransactionService } from '@/services/orderService';
import { Alert, Platform } from 'react-native';
import { PrinterService } from '@/services/printerService';

interface ReceiptModalProps {
  visible: boolean;
  items: CartItem[];
  onClearCart: ()=> void;
  onClose: () => void;
  onPrintReceipt: (receiptData: any) => void;
  onOrderPlaced?: () => void; // ✅ New prop
}

export default function useReceipt(){
     const { items, onClose, clearCart } = usePos()
     const [cashReceived, setCashReceived] = useState('');
       const [isProcessing, setIsProcessing] = useState(false);
       const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
       const tax = subtotal * 0.08; // 8% tax
       const total = subtotal + tax;
       const cashAmount = parseFloat(cashReceived) || 0;
       const change = cashAmount - total;
     
       const handlePrintReceipt = async () => {
         if (cashAmount < total) {
           Alert.alert('Insufficient Cash', 'Cash received is less than the total amount.');
           return;
         }
     
         setIsProcessing(true);
         await TransactionService.createOrder(
           items,
           'cash', // payment method
           cashAmount // cash received
         );
         onOrderPlaced?.();
     
         const receiptData: Receipt = {
           store: {
             id: 1,
             name: 'POSVINE Pro',
             logo: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
             address: '123 Tech Street, Digital City, DC 12345',
             phone: '(555) 123-4567',
           },
           transaction: {
             id: `TXN-${Date.now()}`,
             date: new Date().toISOString(),
             timestamp: new Date().toLocaleString(),
             cashier: 'POS System',
           },
           items: items.map(data => ({
             id: data.id,
             name: data.name,
             price: data.price,
             quantity: data.quantity,
             subtotal: data.price * data.quantity,
             barcode: data.barcode,
           })),
           totals: {
             subtotal: parseFloat(subtotal.toFixed(2)),
             tax: parseFloat(tax.toFixed(2)),
             total: parseFloat(total.toFixed(2)),
             cashReceived: parseFloat(cashAmount.toFixed(2)),
             change: parseFloat(change.toFixed(2)),
           },
           payment: {
             method: 'Cash',
             status: 'Completed',
           },
         };
     
         // Simulate printing delay
         setTimeout(() => {
           setIsProcessing(false);
           //PrinterService.printTestReceipt()
           PrinterService.printOrderReceipt(receiptData)
           if (Platform.OS === 'web') {
             alert('Transaction completed successfully!')
           }
           Alert.alert(
             'Receipt Printed',
             'Transaction completed successfully!',
             [{ text: 'OK', onPress: onClose }]
           );
           items = []
           clearCart()
           handleClose()
         }, 2000);
       };

       const resetForm = () => {
        setCashReceived('');
        setIsProcessing(false);
      };
    
      const handleClose = () => {
        resetForm();
        onClose();
      };
    
}