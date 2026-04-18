import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthService } from '@/services/authService';
import { useRouter } from 'expo-router';
import { OnboardingContext } from './_layout';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, User, Mail, Phone, Lock, Eye, EyeOff, MapPin, ChevronDown, FileUp } from 'lucide-react-native';
import Checkbox from 'expo-checkbox';

// UPDATED: Changed from Teal to Orange palette to match Store Seller registration
const BRAND_COLORS = {
  primary: '#F97316', // Bright Orange
  primaryDim: '#FFF7ED', // Light Orange background
  textTitle: '#1E293B', // Dark Blue/Black
  textSubtitle: '#64748B', // Secondary text
  inputBg: '#FBFCFE', 
  border: '#E2E8F0', 
  icon: '#A0B4C8', 
  placeholderText: '#A0B4C8',
  white: '#FFFFFF',
};

// Reusable styled components
const FormLabel = ({ children, required }: { children: string; required?: boolean }) => (
  <Text style={styles.label}>
    {children} {required && <Text style={{ color: '#EF4444' }}>*</Text>}
  </Text>
);

const FormInput = ({ icon: Icon, rightIcon: RightIcon, onRightIconPress, secureTextEntry, ...props }: any) => (
  <View style={styles.inputContainer}>
    {Icon && <Icon size={20} color={BRAND_COLORS.icon} style={styles.inputIcon} />}
    <TextInput
      style={[styles.input, Icon && { paddingLeft: 45 }, RightIcon && { paddingRight: 45 }]}
      placeholderTextColor={BRAND_COLORS.placeholderText}
      secureTextEntry={secureTextEntry}
      {...props}
    />
    {RightIcon && (
      <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconContainer}>
        <RightIcon size={20} color={BRAND_COLORS.icon} />
      </TouchableOpacity>
    )}
  </View>
);

const FormDropdown = ({ label }: { label: string }) => (
  <View style={styles.dropdownPlaceholder}>
    <Text style={styles.dropdownText}>{label}</Text>
    <ChevronDown size={18} color={BRAND_COLORS.icon} />
  </View>
);

const DocumentUploadBox = ({ title, fileInfo }: { title: string; fileInfo: string }) => (
  <View style={styles.uploadSection}>
    <FormLabel>{title}</FormLabel>
    <TouchableOpacity style={styles.uploadBox}>
      <FileUp size={28} color={BRAND_COLORS.placeholderText} />
      <Text style={styles.uploadTitle}>Click to upload or drag & drop</Text>
      <Text style={styles.uploadSubtitle}>{fileInfo}</Text>
    </TouchableOpacity>
  </View>
);

export default function SupplierOnboarding() {
  const router = useRouter();
  const onboarding = useContext(OnboardingContext);
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form States
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [deliveryAreas, setDeliveryAreas] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const navigateToStep = (newStep: number) => {
    setError('');
    if (step === 1 && newStep === 2) {
      if (!companyName.trim() || !contactPerson.trim() || !email.trim() || !password.trim()) {
        setError('Please fill in all required fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }
    setStep(newStep);
  };

  const handleFinalSubmit = async () => {
    if (!agreedToTerms) {
      setError('You must agree to the Supplier Agreement.');
      return;
    }
    setLoading(true);
    try {
      await AuthService.registerUser({ 
        fullname: contactPerson, 
        email, 
        password, 
        contactNumber: phone,
        role: 'SUPPLIER',
      });
      
      Alert.alert(
        "Application Submitted",
        "Your supplier application is under review.",
        [{ text: "Log In", onPress: () => router.replace('/') }]
      );
    } catch (err: any) {
      setError(err.message || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND_COLORS.white }}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Supplier Registration</Text>
          <Text style={styles.cardStep}>Step {step} of 3</Text>

          {/* Progression Bar (Orange) */}
          <View style={styles.progressionBar}>
            <View style={[styles.progressionLine, { backgroundColor: BRAND_COLORS.primary }]} />
            <View style={[styles.progressionLine, { backgroundColor: step >= 2 ? BRAND_COLORS.primary : BRAND_COLORS.border }]} />
            <View style={[styles.progressionLine, { backgroundColor: step === 3 ? BRAND_COLORS.primary : BRAND_COLORS.border }]} />
          </View>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          {step === 1 && (
            <View style={styles.formSection}>
              <FormLabel required>Company / Business Name</FormLabel>
              <FormInput icon={Building2} placeholder="Your business name" value={companyName} onChangeText={setCompanyName} />
              <FormLabel required>Contact Person</FormLabel>
              <FormInput icon={User} placeholder="Full name" value={contactPerson} onChangeText={setContactPerson} />
              <FormLabel required>Email Address</FormLabel>
              <FormInput icon={Mail} placeholder="company@email.com" value={email} onChangeText={setEmail} />
              <FormLabel required>Password</FormLabel>
            <FormInput 
            icon={Lock} 
            rightIcon={showPass1 ? Eye : EyeOff} 
            onRightIconPress={() => setShowPass1(!showPass1)} 
            secureTextEntry={!showPass1} 
            placeholder="••••••••" // This adds the dots/asterisks when the field is empty
            value={password} 
            onChangeText={setPassword} 
            />

            <FormLabel required>Confirm Password</FormLabel>
            <FormInput 
            icon={Lock} 
            rightIcon={showPass2 ? Eye : EyeOff} 
            onRightIconPress={() => setShowPass2(!showPass2)} 
            secureTextEntry={!showPass2} 
            placeholder="••••••••" // Added here as well for consistency
            value={confirmPassword} 
            onChangeText={setConfirmPassword} 
            />
              <TouchableOpacity style={styles.mainButton} onPress={() => navigateToStep(2)}>
                <Text style={styles.mainButtonText}>Continue →</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.formSection}>
              <FormLabel required>Company Address</FormLabel>
              <FormInput icon={MapPin} placeholder="Street address" value={companyAddress} onChangeText={setCompanyAddress} />
              <View style={styles.row}>
                <View style={styles.flexHalf}><FormLabel required>City</FormLabel><FormInput placeholder="City" value={city} onChangeText={setCity} /></View>
                <View style={styles.flexHalf}><FormLabel>Province</FormLabel><FormInput placeholder="Province" value={province} onChangeText={setProvince} /></View>
              </View>
              <FormLabel>Company Description</FormLabel>
              <TextInput style={[styles.input, styles.textArea]} placeholder="..." multiline numberOfLines={4} value={companyDescription} onChangeText={setCompanyDescription} />
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.whiteButton} onPress={() => navigateToStep(1)}><Text style={styles.whiteButtonText}>Back</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.mainButton, { flex: 1 }]} onPress={() => navigateToStep(3)}><Text style={styles.mainButtonText}>Continue</Text></TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.formSection}>
              <DocumentUploadBox title="SEC / DTI Registration" fileInfo="PDF up to 5MB" />
              <View style={styles.termsContainer}>
                <Checkbox value={agreedToTerms} onValueChange={setAgreedToTerms} color={agreedToTerms ? BRAND_COLORS.primary : BRAND_COLORS.icon} />
                <Text style={styles.termsText}>I agree to the <Text style={styles.termsLink}>Supplier Agreement</Text>.</Text>
              </View>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.whiteButton} onPress={() => navigateToStep(2)}><Text style={styles.whiteButtonText}>Back</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.mainButton, { flex: 1 }]} onPress={handleFinalSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainButtonText}>Submit Application</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.footerContainer}>
             <TouchableOpacity onPress={() => router.replace('/')}>
                <Text style={styles.footerText}>Already a supplier? <Text style={styles.footerLink}>Log In</Text></Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={() => router.push('/onboarding')}>
                <Text style={styles.footerText}>Want to be a Store Seller? <Text style={styles.footerLink}>Register as Store Seller</Text></Text>
             </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { padding: 20, alignItems: 'center', justifyContent: 'center', minHeight: '100%' },
  card: { backgroundColor: '#fff', width: '100%', maxWidth: 400, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: BRAND_COLORS.border },
  formSection: { width: '100%', gap: 15 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: BRAND_COLORS.textTitle, marginBottom: 4 },
  cardStep: { fontSize: 14, color: BRAND_COLORS.textSubtitle, marginBottom: 12 },
  errorBanner: { backgroundColor: '#FEF2F2', color: '#DC2626', padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: BRAND_COLORS.textTitle },
  progressionBar: { flexDirection: 'row', gap: 6, marginBottom: 25 },
  progressionLine: { flex: 1, height: 4, borderRadius: 2 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', height: 48, borderWidth: 1, borderColor: BRAND_COLORS.border, borderRadius: 8, backgroundColor: BRAND_COLORS.inputBg },
  inputIcon: { marginLeft: 15, position: 'absolute', left: 0 },
  input: { flex: 1, height: '100%', paddingHorizontal: 15, fontSize: 15, color: BRAND_COLORS.textTitle },
  rightIconContainer: { paddingHorizontal: 15 },
  row: { flexDirection: 'row', gap: 12 },
  flexHalf: { flex: 1, gap: 8 },
  textArea: { height: 100, paddingTop: 12, textAlignVertical: 'top', borderWidth: 1, borderColor: BRAND_COLORS.border, borderRadius: 8, paddingHorizontal: 12 },
  mainButton: { backgroundColor: BRAND_COLORS.primary, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mainButtonText: { color: BRAND_COLORS.white, fontWeight: '700', fontSize: 16 },
  whiteButton: { backgroundColor: BRAND_COLORS.white, height: 48, width: 80, borderRadius: 8, borderWidth: 1, borderColor: BRAND_COLORS.border, alignItems: 'center', justifyContent: 'center' },
  whiteButtonText: { color: BRAND_COLORS.textTitle, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  uploadBox: { height: 100, borderWidth: 1, borderColor: BRAND_COLORS.placeholderText, borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  uploadTitle: { fontSize: 13, fontWeight: '600', color: BRAND_COLORS.textTitle },
  uploadSubtitle: { fontSize: 11, color: BRAND_COLORS.placeholderText },
  termsContainer: { flexDirection: 'row', gap: 10, marginTop: 10 },
  termsText: { flex: 1, fontSize: 12, color: BRAND_COLORS.textSubtitle },
  termsLink: { color: BRAND_COLORS.primary, fontWeight: '700' },
  footerContainer: { marginTop: 25, alignItems: 'center', gap: 8 },
  footerText: { fontSize: 13, color: BRAND_COLORS.textSubtitle },
  footerLink: { color: BRAND_COLORS.primary, fontWeight: '700' },
});