import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import { View, Text } from "react-native";

let MapViewComponent: any = null;
let MapMarkerComponent: any = null;

const loadMapComponents = () => {
  if (!MapViewComponent) {
    try {
      const mapModule = require('react-native-maps');
      MapViewComponent = mapModule.default || mapModule.MapView;
      MapMarkerComponent = mapModule.Marker;
    } catch (e) {
      if (__DEV__) console.warn('react-native-maps not available:', e);
    }
  }
  return { MapViewComponent, MapMarkerComponent };
};

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
  const validCoords =
    lat != null && lng != null && isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0;

  const { MapViewComponent: MapView, MapMarkerComponent: Marker } = loadMapComponents();

  if (!validCoords) {
    return (
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{address ?? 'No location data available'}</Text>
      </View>
    );
  }

  if (MapView && Marker) {
    return (
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, height: 180 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{ latitude: lat!, longitude: lng!, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={{ latitude: lat!, longitude: lng! }} />
        </MapView>
        {address ? (
          <View style={{ padding: 10 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{address}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // react-native-maps failed to load (e.g. dev client not built with it yet)
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Coordinates</Text>
      <Text style={{ color: colors.text, fontFamily: 'monospace', fontSize: 13 }}>{lat!.toFixed(6)}, {lng!.toFixed(6)}</Text>
      {address ? (
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6 }} numberOfLines={2}>{address}</Text>
      ) : null}
    </View>
  );
}