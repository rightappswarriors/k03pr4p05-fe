// types/mapPinPicker.d.ts
declare module '@/components/MapPinPicker' {
    import { ComponentType } from 'react';

    export interface MapPinPickerProps {
        visible: boolean;
        onClose: () => void;
        onConfirm: (lat: number, lng: number) => void;
        colors: any;
        initialLatitude?: number;
        initialLongitude?: number;
    }

    export const MapPinPicker: ComponentType<MapPinPickerProps>;
}
// types/mapPinPicker.d.ts  (or split into its own file if you prefer)
declare module '@/components/LocationMapPreview' {
    import { ComponentType } from 'react';
    import { useTheme } from '@/contexts/ThemeContext';

    export interface LocationMapPreviewProps {
        lat?: number;
        lng?: number;
        address?: string;
        colors: ReturnType<typeof useTheme>['colors'];
    }

    export const LocationMapPreview: ComponentType<LocationMapPreviewProps>;
}