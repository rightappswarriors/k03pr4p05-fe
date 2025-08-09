import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function useResponsive() {
  const getDimensions = () => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  };

  const [screenDimensions, setScreenDimensions] = useState(getDimensions());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const isMobile = screenDimensions.width < MOBILE_BREAKPOINT;
  const isTablet =
    screenDimensions.width >= MOBILE_BREAKPOINT &&
    screenDimensions.width < TABLET_BREAKPOINT;
  const isDesktop = screenDimensions.width >= TABLET_BREAKPOINT;

  return {
    ...screenDimensions,
    isMobile,
    isTablet,
    isDesktop,
  };
}
