import { BleManager, Device } from "react-native-ble-plx";
import { PermissionsAndroid, Platform } from "react-native";
import { useEffect, useState } from "react";

const bleManager = new BleManager();

export function useBluetooth() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

  // Request runtime permissions
  async function requestPermissions() {
    if (Platform.OS === "android") {
      if ((Platform.Version ?? 0) < 31) {
        return await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
      } else {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
      }
    }
    return true;
  }

  // Scan for peripherals
  function scanForBTDevices() {
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
        return;
      }
      if (device?.name?.includes("Arduino")) { // change filter
        setDevices((prev) =>
          prev.find((d) => d.id === device.id) ? prev : [...prev, device]
        );
      }
    });
  }

  // Connect to a device
  async function connectToDevice(device: Device) {
    const connection = await bleManager.connectToDevice(device.id);
    await connection.discoverAllServicesAndCharacteristics();
    setConnectedDevice(connection);
    bleManager.stopDeviceScan();
  }

  return {
    devices,
    connectedDevice,
    requestPermissions,
    scanForBTDevices,
    connectToDevice,
  };
}
