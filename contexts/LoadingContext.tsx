import React, { createContext, useState, useContext } from 'react';
const LoadingContext = createContext({
  isLoading: false,
  setLoading: (_: boolean) => {},
});

export const LoadingProvider = ({ children } : { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);

  const AppLoader = React.lazy(() => import('@/components/AppLoader'));

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading: setIsLoading }}> 
      {children}
      {isLoading && (
            <React.Suspense fallback={null}>
              <AppLoader />
            </React.Suspense>
        )}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
