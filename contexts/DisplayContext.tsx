// contexts/DisplayContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import ExternalDisplay from "react-native-external-display";
import CustomerDisplay from "@/components/pos/paymentMethod/CustomerDisplay"

type DisplayContextType = {
  hasSecondScreen: boolean;
  setHasSecondScreen: (val: boolean) => void;
};

const DisplayContext = createContext<DisplayContextType>({
  hasSecondScreen: false,
  setHasSecondScreen: () => { },
});

export const DisplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasSecondScreen, setHasSecondScreen] = useState(false);
  useEffect(() => {
    const checkDisplays = async () => {
      const displays = await ExternalDisplay.getDisplays();

      setHasSecondScreen(displays.length > 0);
    };

    checkDisplays(); // Initial check

    // Optional: Poll every few seconds
    const interval = setInterval(checkDisplays, 2000);

    return () => clearInterval(interval);
  }, []);


  return (
    <DisplayContext.Provider value={{ hasSecondScreen, setHasSecondScreen }}>
      {children}
      {hasSecondScreen && <CustomerDisplay />}
    </DisplayContext.Provider>
  );
};

export const useDisplay = () => useContext(DisplayContext);
