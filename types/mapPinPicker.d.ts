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