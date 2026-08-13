// app/(public)/supplier/register.tsx
// Public supplier registration screen - no authentication required
// Accessed via /supplier/register

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { graphQLRequest } from '@/services/apiClient';
import { gql } from 'graphql-request';
import { useRouter } from 'expo-router';

const REGISTER_SUPPLIER = gql`
  mutation RegisterSupplier(
    $companyName: String!
    $contactPerson: String!
    $email: String!
    $phone: String!
    $productCategories: [String!]!
    $taxId: String
    $businessRegNumber: String
    $businessDocuments: [String!]
    $address: String
    $city: String
    $province: String
    $zipCode: String
  ) {
    registerSupplier(
      companyName: $companyName
      contactPerson: $contactPerson
      email: $email
      phone: $phone
      productCategories: $productCategories
      taxId: $taxId
      businessRegNumber: $businessRegNumber
      businessDocuments: $businessDocuments
      address: $address
      city: $city
      province: $province
      zipCode: $zipCode
    ) {
      id
      companyName
      contactPerson
      email
      status
    }
  }
`;

interface FormData {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  taxId: string;
  businessRegNumber: string;
  address: string;
  city: string;
  province: string;
  zipCode: string;
  productCategories: string;
}

export default function SupplierRegistrationScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    taxId: '',
    businessRegNumber: '',
    address: '',
    city: '',
    province: '',
    zipCode: '',
    productCategories: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.companyName || !formData.contactPerson || !formData.email || !formData.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const categories = formData.productCategories
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      await graphQLRequest(REGISTER_SUPPLIER, {
        ...formData,
        productCategories: categories.length > 0 ? categories : ['General'],
      });
      setSuccess(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
        <Text style={{ fontSize: isTablet ? 28 : 22, fontWeight: '800', color: colors.text, marginBottom: 12, textAlign: 'center' }}>
          Registration Submitted!
        </Text>
        <Text style={{ fontSize: isTablet ? 16 : 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 400, lineHeight: 22 }}>
          Your application is pending review. You will receive an email notification once your registration has been approved.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.formContainer, { maxWidth: isTablet ? 600 : '100%' }]}>
          <Text style={[styles.title, { color: colors.text, fontSize: isTablet ? 32 : 28 }]}>
            Supplier Registration
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: isTablet ? 16 : 14 }]}>
            Register your business to become a supplier on Kompra
          </Text>

          {/* Company Name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Company Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter your business name"
              placeholderTextColor={colors.textSecondary}
              value={formData.companyName}
              onChangeText={(v) => handleChange('companyName', v)}
            />
          </View>

          {/* Contact Person */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Contact Person *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Full name of contact person"
              placeholderTextColor={colors.textSecondary}
              value={formData.contactPerson}
              onChangeText={(v) => handleChange('contactPerson', v)}
            />
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Email *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="contact@company.com"
              placeholderTextColor={colors.textSecondary}
              value={formData.email}
              onChangeText={(v) => handleChange('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Phone */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Phone *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="+63 XXX XXX XXXX"
              placeholderTextColor={colors.textSecondary}
              value={formData.phone}
              onChangeText={(v) => handleChange('phone', v)}
              keyboardType="phone-pad"
            />
          </View>

          {/* Product Categories */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Product Categories</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Electronics, Clothing, Food (comma separated)"
              placeholderTextColor={colors.textSecondary}
              value={formData.productCategories}
              onChangeText={(v) => handleChange('productCategories', v)}
            />
          </View>

          {/* Tax ID */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Tax ID</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="TIN / VAT number"
              placeholderTextColor={colors.textSecondary}
              value={formData.taxId}
              onChangeText={(v) => handleChange('taxId', v)}
            />
          </View>

          {/* Business Reg Number */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Business Reg. Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="DTI / SEC registration number"
              placeholderTextColor={colors.textSecondary}
              value={formData.businessRegNumber}
              onChangeText={(v) => handleChange('businessRegNumber', v)}
            />
          </View>

          {/* Address */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Street address"
              placeholderTextColor={colors.textSecondary}
              value={formData.address}
              onChangeText={(v) => handleChange('address', v)}
            />
          </View>

          {/* City, Province, Zip Code - inline on tablet */}
          <View style={isTablet ? styles.inlineFields : undefined}>
            <View style={[styles.field, isTablet ? { flex: 1, marginRight: 8 } : undefined]}>
              <Text style={[styles.label, { color: colors.text }]}>City</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="City"
                placeholderTextColor={colors.textSecondary}
                value={formData.city}
                onChangeText={(v) => handleChange('city', v)}
              />
            </View>
            <View style={[styles.field, isTablet ? { flex: 1, marginHorizontal: 4 } : undefined]}>
              <Text style={[styles.label, { color: colors.text }]}>Province</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="Province"
                placeholderTextColor={colors.textSecondary}
                value={formData.province}
                onChangeText={(v) => handleChange('province', v)}
              />
            </View>
            <View style={[styles.field, isTablet ? { flex: 1, marginLeft: 8 } : undefined]}>
              <Text style={[styles.label, { color: colors.text }]}>Zip Code</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="Zip Code"
                placeholderTextColor={colors.textSecondary}
                value={formData.zipCode}
                onChangeText={(v) => handleChange('zipCode', v)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: loading ? colors.border : colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Application</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.note, { color: colors.textSecondary, fontSize: isTablet ? 13 : 12 }]}>
            * Required fields. You'll receive an email within 1-2 business days after review.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  formContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  inlineFields: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  note: {
    marginTop: 16,
    textAlign: 'center',
  },
});