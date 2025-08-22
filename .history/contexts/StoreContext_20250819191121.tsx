import React, { createContext, useState,useEffect, useContext } from 'react';
import { useTheme } from '@/contexts/ThemeContext'
const LoadingContext = createContext({
  isLoading: false,
  setLoading: (_: boolean) => {},
});
import AppLoader from '@/components/AppLoader'
export const StoreProvider = ({ children } : { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { colors } =useTheme()

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading: setIsLoading }}> 
      {children}
      {isLoading && (
            <AppLoader />
        )}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
