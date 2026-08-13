// components/pos/paymentMethod/CustomerDisplay.tsx
import React from "react";
import ExternalDisplay from "react-native-external-display";
import CustomerQRCodeScreen from "@/app/customer/QRCodeScreen";

export default function CustomerDisplay() {
  return (
    <ExternalDisplay
      fallbackInMainScreen={false}
      onDisplayConnected={() => console.log("✅ Second screen connected")}
      onDisplayDisconnected={() => console.log("❌ Second screen disconnected")}
    >
      <CustomerQRCodeScreen />
    </ExternalDisplay>
  );
}
