// hooks/useResponsiveGrid.ts
// Returns grid column count based on current window width.
// Breakpoints:
//   ≥ 1280px  → 4 columns  (large desktop)
//   ≥ 900px   → 3 columns  (tablet landscape / small desktop)
//   ≥ 600px   → 2 columns  (tablet portrait)
//   < 600px   → 1 column   (phone)

import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

export type GridCols = 1 | 2 | 3 | 4;

export interface ResponsiveGrid {
    cols: GridCols;
    width: number;
    isPhone: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    /** Max content width — centres content on very wide screens */
    maxContentWidth: number;
    /** Horizontal padding for the screen container */
    screenPadding: number;
}

function getGrid(width: number): ResponsiveGrid {
    let cols: GridCols = 1;
    if (width >= 1280) cols = 4;
    else if (width >= 900) cols = 3;
    else if (width >= 600) cols = 2;

    return {
        cols,
        width,
        isPhone: width < 600,
        isTablet: width >= 600 && width < 1280,
        isDesktop: width >= 1280,
        maxContentWidth: width >= 1280 ? 1440 : width,
        screenPadding: width >= 900 ? 24 : 16,
    };
}

export function useResponsiveGrid(): ResponsiveGrid {
    const [grid, setGrid] = useState(() =>
        getGrid(Dimensions.get('window').width),
    );

    useEffect(() => {
        const sub = Dimensions.addEventListener('change', ({ window }) => {
            setGrid(getGrid(window.width));
        });
        return () => sub.remove();
    }, []);

    return grid;
}