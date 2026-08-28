// @/components/admin/AdminStatusBadge.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
const palette: Record<string, [string, string]> = { VERIFIED: ['#166534','#DCFCE7'], APPROVED: ['#166534','#DCFCE7'], ACTIVE: ['#1D4ED8','#DBEAFE'], PENDING: ['#92400E','#FEF3C7'], UNVERIFIED: ['#475569','#E2E8F0'], EXPIRED: ['#9A3412','#FFEDD5'], REJECTED: ['#B91C1C','#FEE2E2'], SUSPENDED: ['#9A3412','#FFEDD5'], BANNED: ['#B91C1C','#FEE2E2'], REGISTERED: ['#475569','#E2E8F0'] };
export function AdminStatusBadge({ value }: { value: string }) { const [color, backgroundColor] = palette[value] ?? ['#475569','#E2E8F0']; return <View style={[styles.badge, { backgroundColor }]}><Text style={[styles.text, { color }]}>{value.replace(/_/g, ' ')}</Text></View>; }
const styles = StyleSheet.create({ badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }, text: { fontSize: 10, fontWeight: '800' } });
