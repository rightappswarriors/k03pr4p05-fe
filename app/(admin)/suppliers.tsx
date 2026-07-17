// app/(admin)/suppliers.tsx
// Admin panel for managing supplier registrations

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { gql } from 'graphql-request';
import { graphQLRequest } from '@/services/apiClient';

const PENDING_SUPPLIERS = gql`
  query PendingSuppliers {
    pendingSuppliers {
      id
      companyName
      contactPerson
      email
      phone
      productCategories
      taxId
      businessRegNumber
      status
      createdAt
      rejectionReason
    }
  }
`;

const APPROVE_SUPPLIER = gql`
  mutation ApproveSupplier($supplierId: Int!, $orgId: Int!) {
    approveSupplier(supplierId: $supplierId, orgId: $orgId) {
      id
      status
    }
  }
`;

const REJECT_SUPPLIER = gql`
  mutation RejectSupplier($supplierId: Int!, $reason: String) {
    rejectSupplier(supplierId: $supplierId, reason: $reason) {
      id
      status
      rejectionReason
    }
  }
`;

interface SupplierProfile {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  productCategories: string[];
  taxId?: string;
  businessRegNumber?: string;
  status: string;
  createdAt: string;
  rejectionReason?: string;
}

export default function AdminSuppliersScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await graphQLRequest<{ pendingSuppliers: SupplierProfile[] }>(PENDING_SUPPLIERS);
      setSuppliers(res.pendingSuppliers);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load pending suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleApprove = async (supplierId: number) => {
    // For now, orgId could be passed or fetched from context
    try {
      await graphQLRequest(APPROVE_SUPPLIER, { supplierId, orgId: 1 });
      loadSuppliers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve supplier');
    }
  };

  const handleReject = async (supplierId: number) => {
    if (width >= 1024) {
      // Web/desktop - text prompt
      const reason = window.prompt('Enter rejection reason (optional):');
      if (reason !== null) {
        try {
          await graphQLRequest(REJECT_SUPPLIER, { supplierId, reason: reason || undefined });
          loadSuppliers();
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to reject supplier');
        }
      }
    } else {
      Alert.prompt?.('Reject Supplier', 'Enter rejection reason:', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              await graphQLRequest(REJECT_SUPPLIER, { supplierId, reason: reason || undefined });
              loadSuppliers();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject supplier');
            }
          },
        },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: isTablet ? 24 : 16 }]}>
        <Text style={[styles.title, { color: colors.text, fontSize: isTablet ? 28 : 22 }]}>
          Supplier Registrations
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: isTablet ? 16 : 14 }]}>
          {suppliers.length} pending applications
        </Text>
      </View>

      {suppliers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>
            No pending registrations
          </Text>
        </View>
      ) : (
        suppliers.map((supplier) => (
          <View
            key={supplier.id}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.companyName, { color: colors.text }]}>
                {supplier.companyName}
              </Text>
              <View style={[styles.badge, { backgroundColor: colors.accent + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.accent }]}>
                  {supplier.status}
                </Text>
              </View>
            </View>

            <View style={styles.details}>
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                Contact: {supplier.contactPerson}
              </Text>
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                Email: {supplier.email}
              </Text>
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                Phone: {supplier.phone}
              </Text>
              {supplier.taxId && (
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  Tax ID: {supplier.taxId}
                </Text>
              )}
              {supplier.businessRegNumber && (
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  Reg. #: {supplier.businessRegNumber}
                </Text>
              )}
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                Categories: {supplier.productCategories.join(', ')}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.approveButton, { backgroundColor: colors.success }]}
                onPress={() => handleApprove(supplier.id)}
              >
                <Text style={styles.buttonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.rejectButton, { backgroundColor: colors.error }]}
                onPress={() => handleReject(supplier.id)}
              >
                <Text style={styles.buttonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingVertical: 24,
  },
  title: {
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 64,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  details: {
    gap: 4,
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  approveButton: {},
  rejectButton: {},
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});