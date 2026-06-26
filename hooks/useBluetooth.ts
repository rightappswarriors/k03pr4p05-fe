import { Receipt } from '@/types';
import Constants from 'expo-constants'
import { useState, useEffect } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';
import { Platform } from "react-native";

let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;

if (Platform.OS === "android") {
  const bluetoothModule = require("react-native-bluetooth-escpos-printer");
  BluetoothManager = bluetoothModule.BluetoothManager;
  BluetoothEscposPrinter = bluetoothModule.BluetoothEscposPrinter;
}


const appVersion = Constants.expoConfig?.version || "unknown";

useEffect(() => {
  if (__DEV__) console.log('BluetoothManager:', BluetoothManager);
}, []);
// Safely fetch constants (avoid calling on null)
const constants = BluetoothManager?.getConstants
  ? BluetoothManager.getConstants()
  : {};

// Destructure safely
const {
  EVENT_DEVICE_ALREADY_PAIRED,
  EVENT_DEVICE_FOUND,
  EVENT_CONNECTED,
  EVENT_CONNECTION_LOST,
  EVENT_UNABLE_CONNECT,
  EVENT_BLUETOOTH_NOT_SUPPORT,
} = constants;

export function useBluetooth() {
  const [devices, setDevices] = useState<any[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);

  // Handlers
  const handleDeviceFound = (rsp: any) => {
    if (__DEV__) console.log('Device found:', rsp);
  };

  const handleDevicePaired = (rsp: any) => {
    if (__DEV__) console.log('Device already paired:', rsp);
  };

  useEffect(() => {
    const initBluetooth = async () => {
      try {
        const enabled = await BluetoothManager.isBluetoothEnabled();
        setIsBluetoothEnabled(enabled);
        if (!enabled) {
          await BluetoothManager.enableBluetooth();
          setIsBluetoothEnabled(true);
        }

        // Add listeners if constants exist
        let pairedListener: any, foundListener: any;
        if (EVENT_DEVICE_ALREADY_PAIRED) {
          pairedListener = DeviceEventEmitter.addListener(
            EVENT_DEVICE_ALREADY_PAIRED,
            handleDevicePaired
          );
        }
        if (EVENT_DEVICE_FOUND) {
          foundListener = DeviceEventEmitter.addListener(
            EVENT_DEVICE_FOUND,
            handleDeviceFound
          );
        }

        return () => {
          pairedListener?.remove();
          foundListener?.remove();
        };
      } catch (error: any) {
        Alert.alert('Error', 'Could not enable Bluetooth: ' + error.message);
      }
    };

    initBluetooth();
  }, []);

  // Scan for devices
  const scanForDevices = async () => {
    if (!isBluetoothEnabled) {
      Alert.alert('Error', 'Bluetooth is not enabled.');
      return;
    }
    try {
      const { found, paired } = JSON.parse(
        await BluetoothManager.scanDevices()
      );
      setDevices([...(paired || []), ...(found || [])]);
      Alert.alert(
        'Scan Complete',
        `Found ${found?.length || 0} new devices and ${paired?.length || 0
        } paired devices.`
      );
    } catch (e: any) {
      Alert.alert('Error', 'Error scanning for devices: ' + e.message);
    }
  };

  // Connect
  const connectToPrinter = async (address: string) => {
    try {
      await BluetoothManager.connect(address);
      setConnectedDevice(address);
      Alert.alert('Success', 'Connected successfully!');
    } catch (e: any) {
      Alert.alert('Connection Failed', 'Failed to connect: ' + e.message);
    }
  };

  // Print
  const printReceipt = async (receipt: Receipt) => {
    if (!connectedDevice) {
      Alert.alert('Error', 'Please connect to a printer first.');
      return;
    }

    try {
      await BluetoothEscposPrinter.printerInit();
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.CENTER
      );
      await BluetoothEscposPrinter.printText('Receipt\n\n', {
        widthtimes: 2,
        heigthtimes: 2,
      });

      // Store Name
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(`${receipt.store.name}\n`);

      // Store Address
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(`${receipt.store.address}\n`);
      // TIN
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(`Tin: ${receipt.store.tin}\n`);
      // Vat Registered
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(`Vat Registered\n`);
      // PTU
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(
        `PTU#: PTU-${receipt.outlet?.ptu ?? ''}\n`
      );
      // BIR Accreditation No: SASP-#####
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(
        `BIR Accredation No: SASP-${receipt.store.bir}\n`
      );
      // Terminal ID: ######       SN: ######
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(
        `Terminal ID: POS-${receipt.store.id}`
      );
      // SN: ######
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.RIGHT
      );
      await BluetoothEscposPrinter.printText(`SN: ${receipt.store.id}\n`);
      // OR No: 0005121          Date: 2025-09-04
      //Time: ######
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(
        `Order number: ${receipt.transaction.id}`
      );
      //DATE: ######
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.RIGHT
      );
      await BluetoothEscposPrinter.printText(
        `Date: ${receipt.transaction.date}\n`,
        {}
      );
      //Time: ######
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.RIGHT
      );
      await BluetoothEscposPrinter.printText(
        `Time ${receipt.transaction.timestamp}\n`,
        {}
      );
      await BluetoothEscposPrinter.printText(
        '--------------------------------\n',
        {}
      );
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(
        'Item\tQty\tX\tPrice\tAmount\n',
        {}
      );

      for (const item of receipt.items) {
        const qty = item.quantity ?? 0; // default to 0

        await BluetoothEscposPrinter.printColumn(
          [12, 2, 1, 6, 6], // widths of each column
          [
            BluetoothEscposPrinter.ALIGN.LEFT,
            BluetoothEscposPrinter.ALIGN.RIGHT,
            BluetoothEscposPrinter.ALIGN.CENTER,
            BluetoothEscposPrinter.ALIGN.RIGHT,
            BluetoothEscposPrinter.ALIGN.RIGHT,
          ],
          [
            item.name, // Item name
            String(item.quantity), // Quantity
            '*', // Separator
            String(item.price.toFixed(2)), // Price
            String((item.price * qty).toFixed(2)), // Total amount
          ],
          {}
        );
      }
      await BluetoothEscposPrinter.printText(
        '--------------------------------\n',
        {}
      );
      // SubTotal
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText('Subtotal:', {});
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.RIGHT
      );
      await BluetoothEscposPrinter.printText(
        `${receipt.totals.subtotal}\n`,
        {}
      );
      // Discount
      {
        receipt.totals.discountType &&
          (await BluetoothEscposPrinter.printerAlign(
            BluetoothEscposPrinter.ALIGN.LEFT
          ));
        await BluetoothEscposPrinter.printText(
          `Senior Discount(${receipt.totals.discountPercent})`,
          {}
        );
        await BluetoothEscposPrinter.printerAlign(
          BluetoothEscposPrinter.ALIGN.RIGHT
        );
        await BluetoothEscposPrinter.printText(
          `${receipt.totals.discountTotal}\n`,
          {}
        );
      }
      await BluetoothEscposPrinter.printText(
        '--------------------------------\n',
        {}
      );
      // Vat Sales
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(
        'Vat Sales:',
        {}
      );
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.RIGHT
      );

      // Vat (12%): ######
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(
        `Vat (${receipt.store.VatPercent}):`,
        {}
      );
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.RIGHT
      );
      await BluetoothEscposPrinter.printText(
        `${receipt.totals.vatAmount}\n`,
        {}
      );
      // Cash Payed
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(
        `CASH PAYED:`,
        {}
      );
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.RIGHT
      );
      await BluetoothEscposPrinter.printText(
        `${receipt.totals.cashReceived}\n`,
        {}
      );
      // Total Ammount
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(
        `TOTAL AMOUNT DUE:`,
        {}
      );
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.RIGHT
      );
      await BluetoothEscposPrinter.printText(
        `${receipt.totals.total}\n`,
        {}
      );

      await BluetoothEscposPrinter.printText(
        '--------------------------------\n',
        {}
      );
      // Change
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(
        `Change:`,
        {}
      );
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.RIGHT
      );
      await BluetoothEscposPrinter.printText(
        `${receipt.totals.change}\n`,
        {}
      );

      await BluetoothEscposPrinter.printText(
        '--------------------------------\n',
        {}
      );
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(`Cashier: ${receipt.user?.id ? receipt.user.id : 'Unknown'}\n`, {});
      await BluetoothEscposPrinter.printText(`POS VERSION: Right Apps POSVine ${appVersion}`, {});
      await BluetoothEscposPrinter.printText('THIS RECEIPT IS GENERATED BY:\nBIR-ACCREDITED POS SYSTEM')
      await BluetoothEscposPrinter.cutOnePoint();
      Alert.alert('Success', 'Print successful!');
    } catch (e: any) {
      Alert.alert('Print Failed', 'Print failed: ' + e.message);
    }
  };

  return {
    setDevices,
    devices,
    printReceipt,
    connectedDevice,
    connectToPrinter,
    scanForDevices,
  };
}
