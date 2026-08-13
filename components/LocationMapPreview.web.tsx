import { useTheme } from "@/contexts/ThemeContext";
import React, { useState } from "react";
import { View, Text } from "react-native";

export function LocationMapPreview({
    lat,
    lng,
    address,
    colors,
}: {
    lat?: number;
    lng?: number;
    address?: string;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const [mapError, setMapError] = useState(false);
    const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    const validCoords =
        lat != null && lng != null && isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0;

    if (!validCoords) {
        return (
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{address ?? 'No location data available'}</Text>
            </View>
        );
    }

    const mapUrl = googleMapsApiKey
        ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${lat},${lng}&zoom=15`
        : null;

    return (
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
            {mapUrl && !mapError ? (
                <iframe
                    src={mapUrl}
                    width="100%"
                    height="160"
                    style={{ border: 0, display: 'block' }}
                    onError={() => setMapError(true)}
                    title="Delivery Location"
                />
            ) : (
                <View style={{ height: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        📍 {address ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
                    </Text>
                </View>
            )}
            {address ? (
                <View style={{ padding: 10 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{address}</Text>
                </View>
            ) : null}
        </View>
    );
}