import React, { createContext, useState, useContext } from 'react';
const LoadingContext = createContext({
  isLoading: false,
  setLoading: (_: boolean) => {},
});
import AppLoader from '@/components/AppLoader'
export const LoadingProvider = ({ children } : { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);

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
