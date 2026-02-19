import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Shield, Smartphone, Activity, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
//import { useWiFiAuth } from '@/hooks/useWiFiAuth';
import { DeviceService } from '@/services/deviceService';
import { StorageService } from '@/services/storageService';
import { SyncLog } from '@/types';

export default function DashboardScreen() {
    const { user, isDeviceBound } = useAuth();
    //  const { wifiInfo, isWiFiAuthorized, getRequiredSSID } = useWiFiAuth();
    const [deviceInfo, setDeviceInfo] = useState<any>(null);
    const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const info = await DeviceService.getDeviceInfo();
            const logs = await StorageService.getSyncLogs();
            setDeviceInfo(info);
            setSyncLogs(logs.slice(0, 10)); // Show last 10 sync attempts
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const clearDeviceBinding = () => {
        Alert.alert(
            'Clear Device Binding',
            'This will unbind this device from the current store. You will need admin approval to bind again. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        await DeviceService.clearDeviceId();
                        Alert.alert('Success', 'Device binding cleared. Please restart the app.');
                    }
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loading}>
                    <Text>Loading dashboard...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Store Dashboard</Text>

                {/* Store Info */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Shield size={24} color="#2563EB" />
                        <Text style={styles.cardTitle}>Store Information</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Store:</Text>
                        <Text style={styles.infoValue}>{ 'Not assigned'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Role:</Text>
                        <Text style={styles.infoValue}>{user?.role || 'Unknown'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Device Status:</Text>
                        <Text style={[styles.infoValue, { color: isDeviceBound ? '#059669' : '#DC2626' }]}>
                            {isDeviceBound ? 'Bound' : 'Not Bound'}
                        </Text>
                    </View>
                </View>

                {/* Device Info */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Smartphone size={24} color="#059669" />
                        <Text style={styles.cardTitle}>Device Information</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Device ID:</Text>
                        <Text style={styles.infoValue}>{deviceInfo?.deviceId.slice(-12) || 'Unknown'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Platform:</Text>
                        <Text style={styles.infoValue}>{deviceInfo?.platform || 'Unknown'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>App Version:</Text>
                        <Text style={styles.infoValue}>{deviceInfo?.appVersion || 'Unknown'}</Text>
                    </View>
                    {/**<View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Network:</Text>
            <Text style={[styles.infoValue, { color: wifiInfo.hasInternet ? '#059669' : '#DC2626' }]}>
              {wifiInfo.hasInternet ? 'Online' : 'Offline'}
            </Text>
          </View> 
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>WiFi SSID:</Text>
            <Text style={styles.infoValue}>{wifiInfo.ssid || 'Not connected'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>WiFi Status:</Text>
            <Text style={[styles.infoValue, { color: isWiFiAuthorized ? '#059669' : '#DC2626' }]}>
              {isWiFiAuthorized ? 'Authorized' : 'Unauthorized'}
            </Text>
          </View>
          */}
                </View>

                {/* Sync Logs */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Activity size={24} color="#D97706" />
                        <Text style={styles.cardTitle}>Recent Sync Activity</Text>
                    </View>
                    {syncLogs.length === 0 ? (
                        <Text style={styles.noLogsText}>No sync activity yet</Text>
                    ) : (
                        syncLogs.map((log, index) => (
                            <View key={log.id || index} style={styles.logEntry}>
                                <View style={styles.logHeader}>
                                    <View style={styles.logStatus}>
                                        {log.status === 'SYNCED' ? (
                                            <View style={[styles.statusDot, styles.successDot]} />
                                        ) : (
                                            <View style={[styles.statusDot, styles.failedDot]} />
                                        )}
                                        <Text style={[styles.logStatusText, {
                                            color: log.status === 'FAILED' ? '#059669' : '#DC2626'
                                        }]}>
                                            {log.status}
                                        </Text>
                                    </View>
                                    <Text style={styles.logTime}>
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </Text>
                                </View>
                                <Text style={styles.logDetails}>
                                    {log.ordersCount} orders • {log.duration}ms
                                </Text>
                                {log.errorMessage && (
                                    <Text style={styles.errorMessage}>{log.errorMessage}</Text>
                                )}
                            </View>
                        ))
                    )}
                </View>

                {/* Admin Actions */}
                {user?.role === 'OWNER' || user?.role === 'MANAGER' && (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <AlertTriangle size={24} color="#DC2626" />
                            <Text style={styles.cardTitle}>Admin Actions</Text>
                        </View>
                        <TouchableOpacity style={styles.dangerButton} onPress={clearDeviceBinding}>
                            <Text style={styles.dangerButtonText}>Clear Device Binding</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 24,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 16,
        color: '#6B7280',
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
    },
    noLogsText: {
        color: '#6B7280',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    logEntry: {
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    logStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    successDot: {
        backgroundColor: '#059669',
    },
    failedDot: {
        backgroundColor: '#DC2626',
    },
    logStatusText: {
        fontSize: 14,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    logTime: {
        fontSize: 12,
        color: '#6B7280',
    },
    logDetails: {
        fontSize: 14,
        color: '#4B5563',
    },
    errorMessage: {
        fontSize: 12,
        color: '#DC2626',
        marginTop: 4,
        fontStyle: 'italic',
    },
    dangerButton: {
        backgroundColor: '#DC2626',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    dangerButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});