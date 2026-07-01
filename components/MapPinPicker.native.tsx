import React, { useRef, useState } from "react";
import { useEffect } from "react";

import { ActivityIndicator, View, Text, Modal, Platform, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { aom } from "./AddOutletModal";
import { X, Navigation, LocateFixed, Check } from "lucide-react-native";

const PH_REGION = {
    latitude: 10.7202,
    longitude: 122.5621,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

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

// Allows digits, one leading minus, one decimal point while typing.
const sanitizeCoordInput = (v: string) => {
    let out = v.replace(/[^0-9.\-]/g, '');
    const neg = out.startsWith('-');
    out = out.replace(/-/g, '');
    if (neg) out = '-' + out;
    const parts = out.split('.');
    if (parts.length > 2) out = parts[0] + '.' + parts.slice(1).join('');
    return out;
};

const isValidLat = (n: number) => !isNaN(n) && n >= -90 && n <= 90;
const isValidLng = (n: number) => !isNaN(n) && n >= -180 && n <= 180;

export function MapPinPicker({
    visible,
    onClose,
    onConfirm,
    colors,

    initialLatitude,
    initialLongitude,
}: {
    visible: boolean;
    onClose: () => void;
    onConfirm: (lat: number, lng: number) => void;
    initialLatitude?: number;
    initialLongitude?: number;
    colors: any;
}) {
    const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
    const [componentReady, setComponentReady] = useState(false);
    const [region, setRegion] = useState(PH_REGION);
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState('');
    const mapRef = useRef<any>(null);

    // Manual coordinate entry
    const [manualLat, setManualLat] = useState('');
    const [manualLng, setManualLng] = useState('');
    const [manualError, setManualError] = useState('');

    const { MapViewComponent: MapView, MapMarkerComponent: Marker } = loadMapComponents();

    const goToUserLocation = async (dropPin: boolean) => {
        setLocating(true);
        setLocationError('');
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('Location permission denied. Tap the map or enter coordinates manually.');
                return;
            }
            const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const next = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            setRegion(next);
            if (dropPin) setMarker({ lat: next.latitude, lng: next.longitude });
            mapRef.current?.animateToRegion?.(next, 500);
        } catch (e) {
            setLocationError('Could not get your location. Tap the map or enter coordinates manually.');
        } finally {
            setLocating(false);
        }
    };
    useEffect(() => {
        if (visible) {
            loadMapComponents();
            setComponentReady(true);

            const hasInitial =
                typeof initialLatitude === 'number' &&
                typeof initialLongitude === 'number' &&
                !isNaN(initialLatitude) &&
                !isNaN(initialLongitude);

            if (hasInitial) {
                const next = {
                    latitude: initialLatitude,
                    longitude: initialLongitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                };
                setRegion(next);
                setMarker({ lat: initialLatitude, lng: initialLongitude });
                setManualLat(initialLatitude.toFixed(6));
                setManualLng(initialLongitude.toFixed(6));
                // Camera pan happens once the MapView mounts — see onMapReady below.
            } else {
                // No saved coordinates yet — fall back to asking for the user's GPS location.
                goToUserLocation(false);
            }
        } else {
            setMarker(null);
            setLocationError('');
            setManualLat('');
            setManualLng('');
            setManualError('');
        }
    }, [visible, initialLatitude, initialLongitude]);

    const handleMapPress = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setMarker({ lat: latitude, lng: longitude });
        setManualLat(latitude.toFixed(6));
        setManualLng(longitude.toFixed(6));
        setManualError('');
    };

    const applyManualCoords = () => {
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        if (manualLat.trim() === '' || manualLng.trim() === '') {
            setManualError('Enter both latitude and longitude.');
            return;
        }
        if (!isValidLat(lat)) {
            setManualError('Latitude must be between -90 and 90.');
            return;
        }
        if (!isValidLng(lng)) {
            setManualError('Longitude must be between -180 and 180.');
            return;
        }
        setManualError('');
        setMarker({ lat, lng });
        const next = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        setRegion(next);
        mapRef.current?.animateToRegion?.(next, 500);
    };

    const handleConfirm = () => {
        if (!marker) return;
        onConfirm(marker.lat, marker.lng);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1 }}>
                {componentReady && MapView ? (
                    <MapView
                        ref={mapRef}
                        style={{ flex: 1 }}
                        provider="google"
                        initialRegion={region}
                        onMapReady={() => {
                            if (marker) {
                                mapRef.current?.animateToRegion(
                                    { latitude: marker.lat, longitude: marker.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
                                    0,
                                );
                            }
                        }}
                        onPress={handleMapPress}
                        showsUserLocation
                        showsMyLocationButton={false}
                    >
                        {marker && Marker && (
                            <Marker
                                coordinate={{ latitude: marker.lat, longitude: marker.lng }}
                                pinColor={colors.primary ?? '#1B3A6B'}
                            />
                        )}
                    </MapView>
                ) : componentReady && !MapView ? (
                    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <Text style={{ color: colors.text, fontSize: 16, textAlign: 'center' }}>
                            Map is not available. Use the coordinate box below to set a location.
                        </Text>
                    </View>
                ) : (
                    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={{ color: colors.text, marginTop: 12 }}>Loading map...</Text>
                    </View>
                )}

                <View style={[mpp.header, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity style={[mpp.closeBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={onClose}>
                        <X size={18} color={colors.text} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[mpp.title, { color: colors.text }]}>Pin Outlet Location</Text>
                        <Text style={[mpp.hint, { color: colors.textSecondary }]}>
                            {locationError
                                ? locationError
                                : marker
                                    ? `${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}`
                                    : MapView
                                        ? 'Tap the map, or enter coordinates below'
                                        : 'Enter coordinates below'}
                        </Text>
                    </View>
                    {MapView && (
                        <TouchableOpacity
                            style={[mpp.locateBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                            onPress={() => goToUserLocation(true)}
                            disabled={locating}
                        >
                            {locating ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <LocateFixed size={18} color={colors.primary} strokeWidth={2} />
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Bottom-left manual coordinate entry */}
                <View style={[mpp.manualCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[mpp.manualLabel, { color: colors.textSecondary }]}>LATITUDE</Text>
                    <TextInput
                        style={[mpp.manualInput, {
                            color: colors.text,
                            backgroundColor: colors.background,
                            borderColor: manualError ? colors.error : colors.border,
                        }]}
                        placeholder="-90 to 90"
                        placeholderTextColor={colors.textSecondary}
                        value={manualLat}
                        onChangeText={(v) => { setManualLat(sanitizeCoordInput(v)); setManualError(''); }}
                        keyboardType="numbers-and-punctuation"
                    />
                    <Text style={[mpp.manualLabel, { color: colors.textSecondary, marginTop: 8 }]}>LONGITUDE</Text>
                    <TextInput
                        style={[mpp.manualInput, {
                            color: colors.text,
                            backgroundColor: colors.background,
                            borderColor: manualError ? colors.error : colors.border,
                        }]}
                        placeholder="-180 to 180"
                        placeholderTextColor={colors.textSecondary}
                        value={manualLng}
                        onChangeText={(v) => { setManualLng(sanitizeCoordInput(v)); setManualError(''); }}
                        keyboardType="numbers-and-punctuation"
                    />
                    {manualError ? (
                        <Text style={{ color: colors.error, fontSize: 10, marginTop: 6, maxWidth: 150 }}>{manualError}</Text>
                    ) : null}
                    <TouchableOpacity
                        style={[mpp.manualApplyBtn, { backgroundColor: colors.primary }]}
                        onPress={applyManualCoords}
                    >
                        <Check size={13} color="#fff" strokeWidth={2.5} />
                        <Text style={mpp.manualApplyTxt}>Set Pin</Text>
                    </TouchableOpacity>
                </View>

                {marker && (
                    <View style={[mpp.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                        <TouchableOpacity style={[mpp.clearBtn, { borderColor: colors.border }]} onPress={() => setMarker(null)} activeOpacity={0.8}>
                            <Text style={[mpp.clearTxt, { color: colors.textSecondary }]}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[mpp.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleConfirm} activeOpacity={0.85}>
                            <Navigation size={15} color="#fff" strokeWidth={2} />
                            <Text style={mpp.confirmTxt}>Use This Location</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const mpp = StyleSheet.create({
    header: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingTop: Platform.OS === 'ios' ? 52 : 16, paddingBottom: 14, paddingHorizontal: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
    },
    closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    locateBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    title: { fontSize: 15, fontWeight: '700' },
    hint: { fontSize: 12, marginTop: 1 },
    manualCard: {
        position: 'absolute',
        left: 16,
        bottom: Platform.OS === 'ios' ? 110 : 90,
        width: '70%',
        maxWidth: 260,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
    },
    manualLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 },
    manualInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, fontSize: 12 },
    manualApplyBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
        borderRadius: 8, paddingVertical: 8, marginTop: 10,
    },
    manualApplyTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 16, borderTopWidth: 1,
    },
    clearBtn: { borderRadius: 10, paddingVertical: 13, paddingHorizontal: 20, borderWidth: 1, alignItems: 'center' },
    clearTxt: { fontSize: 14, fontWeight: '600' },
    confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 10, paddingVertical: 13 },
    confirmTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});