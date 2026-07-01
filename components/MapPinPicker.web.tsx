import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { X, Navigation, LocateFixed, Check } from 'lucide-react-native';

const containerStyle = { width: '100%', height: '100%' };
const PH_CENTER = { lat: 10.7202, lng: 122.5621 };

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
    colors: any;
    initialLatitude?: number;
    initialLongitude?: number;
}) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_KEY!,
    });

    const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
    const [center, setCenter] = useState(PH_CENTER);
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState('');
    const mapInstance = useRef<google.maps.Map | null>(null);

    // Manual coordinate entry
    const [manualLat, setManualLat] = useState('');
    const [manualLng, setManualLng] = useState('');
    const [manualError, setManualError] = useState('');

    const goToUserLocation = useCallback((dropPin: boolean) => {
        if (!('geolocation' in navigator)) {
            setLocationError('Geolocation is not supported by this browser.');
            return;
        }
        setLocating(true);
        setLocationError('');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setCenter(next);
                if (dropPin) {
                    setMarker(next);
                    setManualLat(next.lat.toFixed(6));
                    setManualLng(next.lng.toFixed(6));
                }
                mapInstance.current?.panTo(next);
                mapInstance.current?.setZoom(16);
                setLocating(false);
            },
            (err) => {
                setLocationError(
                    err.code === 1
                        ? 'Location permission denied. Click the map, or enter coordinates below.'
                        : 'Could not get your location (common on desktops without GPS/Wi-Fi positioning). Click the map, or enter coordinates below.',
                );
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 8000 },
        );
    }, []);
    useEffect(() => {
        if (visible) {
            const hasInitial =
                typeof initialLatitude === 'number' &&
                typeof initialLongitude === 'number' &&
                !isNaN(initialLatitude) &&
                !isNaN(initialLongitude);

            if (hasInitial) {
                const next = { lat: initialLatitude, lng: initialLongitude };
                setCenter(next);
                setMarker(next);
                setManualLat(initialLatitude.toFixed(6));
                setManualLng(initialLongitude.toFixed(6));
                mapInstance.current?.panTo(next);
                mapInstance.current?.setZoom(16);
            } else {
                goToUserLocation(false);
            }
        } else {
            setMarker(null);
            setLocationError('');
            setManualLat('');
            setManualLng('');
            setManualError('');
        }
    }, [visible, initialLatitude, initialLongitude, goToUserLocation]);

    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const next = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setMarker(next);
        setManualLat(next.lat.toFixed(6));
        setManualLng(next.lng.toFixed(6));
        setManualError('');
    }, []);

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
        const next = { lat, lng };
        setMarker(next);
        setCenter(next);
        mapInstance.current?.panTo(next);
        mapInstance.current?.setZoom(16);
    };

    const handleConfirm = () => {
        if (!marker) return;
        onConfirm(marker.lat, marker.lng);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1 }}>
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={center}
                        zoom={marker ? 16 : 13}
                        onClick={handleMapClick}
                        onLoad={(map) => {
                            mapInstance.current = map;
                            if (marker) {
                                map.panTo(marker);
                                map.setZoom(16);
                            }
                        }}
                    >
                        {marker && <Marker position={marker} />}
                    </GoogleMap>
                ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={{ marginTop: 12 }}>Loading map…</Text>
                    </View>
                )}

                <View style={[styles.header, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity
                        style={[styles.closeBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={onClose}
                    >
                        <X size={18} color={colors.text} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: colors.text }]}>Pin Outlet Location</Text>
                        <Text style={[styles.hint, { color: colors.textSecondary }]}>
                            {locationError
                                ? locationError
                                : marker
                                    ? `${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}`
                                    : 'Click the map, or enter coordinates below'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.locateBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() => goToUserLocation(true)}
                        disabled={locating}
                    >
                        {locating ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <LocateFixed size={18} color={colors.primary} strokeWidth={2} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Bottom-left manual coordinate entry */}
                <View style={[styles.manualCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.manualLabel, { color: colors.textSecondary }]}>LATITUDE</Text>
                    <TextInput
                        style={[styles.manualInput, {
                            color: colors.text,
                            backgroundColor: colors.background,
                            borderColor: manualError ? colors.error : colors.border,
                        }]}
                        placeholder="-90 to 90"
                        placeholderTextColor={colors.textSecondary}
                        value={manualLat}
                        onChangeText={(v) => { setManualLat(sanitizeCoordInput(v)); setManualError(''); }}
                    />
                    <Text style={[styles.manualLabel, { color: colors.textSecondary, marginTop: 8 }]}>LONGITUDE</Text>
                    <TextInput
                        style={[styles.manualInput, {
                            color: colors.text,
                            backgroundColor: colors.background,
                            borderColor: manualError ? colors.error : colors.border,
                        }]}
                        placeholder="-180 to 180"
                        placeholderTextColor={colors.textSecondary}
                        value={manualLng}
                        onChangeText={(v) => { setManualLng(sanitizeCoordInput(v)); setManualError(''); }}
                    />
                    {manualError ? (
                        <Text style={{ color: colors.error, fontSize: 10, marginTop: 6, maxWidth: 150 }}>{manualError}</Text>
                    ) : null}
                    <TouchableOpacity
                        style={[styles.manualApplyBtn, { backgroundColor: colors.primary }]}
                        onPress={applyManualCoords}
                    >
                        <Check size={13} color="#fff" strokeWidth={2.5} />
                        <Text style={styles.manualApplyTxt}>Set Pin</Text>
                    </TouchableOpacity>
                </View>

                {marker && (
                    <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                        <TouchableOpacity style={[styles.clearBtn, { borderColor: colors.border }]} onPress={() => setMarker(null)}>
                            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleConfirm}>
                            <Navigation size={15} color="#fff" strokeWidth={2} />
                            <Text style={styles.confirmTxt}>Use This Location</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    locateBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    title: { fontSize: 15, fontWeight: '700' },
    hint: { fontSize: 12, marginTop: 1 },
    manualCard: {
        position: 'absolute',
        left: 16,
        bottom: 90,
        width: '30%',
        maxWidth: 320,
        minWidth: 220,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)' as any,
    },
    manualLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginBottom: 4 },
    manualInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, fontSize: 12 },
    manualApplyBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
        borderRadius: 8, paddingVertical: 8, marginTop: 10,
    },
    manualApplyTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1 },
    clearBtn: { borderRadius: 10, paddingVertical: 13, paddingHorizontal: 20, borderWidth: 1, alignItems: 'center' },
    confirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 10, paddingVertical: 13 },
    confirmTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});