import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CustomCheckbox } from '@/components/pos/checkbox/CustomCheckbox';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  CustomerType,
  DiscountType,
  ScPwdCustomerInput,
} from '@/services/salesOrder.service';

export interface ScPwdCustomerFormRef {
  isValid: () => boolean;
}

export interface ScPwdCustomerFormProps {
  customerType: CustomerType;
  onCustomerTypeChange: (type: CustomerType) => void;
  scPwdData: ScPwdCustomerInput;
  onScPwdDataChange: (data: ScPwdCustomerInput) => void;
  discountType: DiscountType;
  onDiscountTypeChange: (type: DiscountType) => void;
  totalPax?: number;
  scPwdPax?: number;
  onPaxChange?: (totalPax: number, scPwdPax: number) => void;
  showPaxFields?: boolean;
  showDiscountSelector?: boolean;
}

const CUSTOMER_OPTIONS: { value: CustomerType; label: string }[] = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'SENIOR_CITIZEN', label: 'Senior Citizen' },
  { value: 'PWD', label: 'PWD' },
];


function defaultIdType(type: CustomerType) {
  return type === 'PWD' ? 'PWD-PDAO' : 'OSCA';
}

export const ScPwdCustomerForm = forwardRef<ScPwdCustomerFormRef, ScPwdCustomerFormProps>(
  (
    {
      customerType,
      onCustomerTypeChange,
      scPwdData,
      onScPwdDataChange,
      discountType,
      onDiscountTypeChange,
      totalPax = 1,
      scPwdPax = 1,
      onPaxChange,
      showPaxFields = true,
      showDiscountSelector = true,
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const [touched, setTouched] = useState(false);

    const idLabel = customerType === 'PWD' ? 'PWD ID No.' : 'OSCA ID No.';
    const idTypes = useMemo(
      () =>
        customerType === 'PWD'
          ? ['PWD-PDAO', 'PWD-NCDA', "Other Gov't ID"]
          : ['OSCA', "Other Gov't ID"],
      [customerType],
    );

    const updateData = (patch: Partial<ScPwdCustomerInput>) => {
      onScPwdDataChange({ ...scPwdData, ...patch });
    };

    const validate = () => {
      if (customerType === 'REGULAR') return true;
      if (!scPwdData.fullName?.trim() || !scPwdData.idNumber?.trim()) return false;
      if (scPwdData.isRepresentative) {
        return Boolean(
          scPwdData.representativeName?.trim() &&
            scPwdData.representativeIdNumber?.trim(),
        );
      }
      return true;
    };

    useImperativeHandle(ref, () => ({
      isValid: () => {
        setTouched(true);
        return validate();
      },
    }));

    useEffect(() => {
      if (customerType === 'REGULAR') {
        onDiscountTypeChange('NONE');
        return;
      }
      if (discountType === 'NONE') {
        onDiscountTypeChange(customerType);
      }
      if (!scPwdData.idType) {
        updateData({ idType: defaultIdType(customerType), customerType });
      } else {
        updateData({ customerType });
      }
    }, [customerType]);

    const fieldStyle = [
      styles.input,
      {
        color: colors.text,
        borderColor: colors.border,
        backgroundColor: colors.background,
      },
    ];

    return (
      <View style={styles.wrap}>
        <View style={styles.segmentRow}>
          {CUSTOMER_OPTIONS.map((option) => {
            const active = customerType === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.segment,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => onCustomerTypeChange(option.value)}
              >
                <Text style={[styles.segmentText, { color: active ? '#fff' : colors.text }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {customerType !== 'REGULAR' && (
          <View style={styles.fields}>
            <TextInput
              style={fieldStyle}
              placeholder="Full Name"
              placeholderTextColor={colors.textSecondary}
              value={scPwdData.fullName ?? ''}
              onChangeText={(fullName) => updateData({ fullName })}
              onBlur={() => setTouched(true)}
            />
            {touched && !scPwdData.fullName?.trim() ? (
              <Text style={styles.error}>Full name is required.</Text>
            ) : null}

            <TextInput
              style={fieldStyle}
              placeholder={idLabel}
              placeholderTextColor={colors.textSecondary}
              value={scPwdData.idNumber ?? ''}
              onChangeText={(idNumber) => updateData({ idNumber })}
              onBlur={() => setTouched(true)}
            />
            {touched && !scPwdData.idNumber?.trim() ? (
              <Text style={styles.error}>{idLabel} is required.</Text>
            ) : null}

            <View style={styles.segmentRow}>
              {idTypes.map((idType) => {
                const active = (scPwdData.idType ?? defaultIdType(customerType)) === idType;
                return (
                  <TouchableOpacity
                    key={idType}
                    style={[
                      styles.segment,
                      { borderColor: colors.border, backgroundColor: colors.background },
                      active && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => updateData({ idType })}
                  >
                    <Text style={[styles.segmentText, { color: active ? '#fff' : colors.text }]}>
                      {idType}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={fieldStyle}
              placeholder="Date of Birth (YYYY-MM-DD)"
              placeholderTextColor={colors.textSecondary}
              value={scPwdData.dateOfBirth ?? ''}
              onChangeText={(dateOfBirth) => updateData({ dateOfBirth })}
            />
            <TextInput
              style={fieldStyle}
              placeholder="Contact Number"
              placeholderTextColor={colors.textSecondary}
              value={scPwdData.contactNumber ?? ''}
              onChangeText={(contactNumber) => updateData({ contactNumber })}
              keyboardType="phone-pad"
            />

            <View style={styles.switchRow}>
              <Text style={[styles.switchText, { color: colors.text }]}>
                Is this a representative purchase?
              </Text>
              <Switch
                value={Boolean(scPwdData.isRepresentative)}
                onValueChange={(isRepresentative) =>
                  updateData({
                    isRepresentative,
                    representativeName: isRepresentative ? scPwdData.representativeName : undefined,
                    representativeIdNumber: isRepresentative
                      ? scPwdData.representativeIdNumber
                      : undefined,
                  })
                }
              />
            </View>

            {scPwdData.isRepresentative && (
              <>
                <TextInput
                  style={fieldStyle}
                  placeholder="Representative Name"
                  placeholderTextColor={colors.textSecondary}
                  value={scPwdData.representativeName ?? ''}
                  onChangeText={(representativeName) => updateData({ representativeName })}
                  onBlur={() => setTouched(true)}
                />
                <TextInput
                  style={fieldStyle}
                  placeholder="Representative ID Number"
                  placeholderTextColor={colors.textSecondary}
                  value={scPwdData.representativeIdNumber ?? ''}
                  onChangeText={(representativeIdNumber) =>
                    updateData({ representativeIdNumber })
                  }
                  onBlur={() => setTouched(true)}
                />
              </>
            )}


            {showPaxFields && (
              <View style={styles.fields}>
                <View style={styles.paxRow}>
                  <TextInput
                    style={[fieldStyle, { flex: 1 }]}
                    placeholder="Total customers"
                    placeholderTextColor={colors.textSecondary}
                    value={String(totalPax)}
                    onChangeText={(value) =>
                      onPaxChange?.(Math.max(1, Number(value) || 1), scPwdPax)
                    }
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[fieldStyle, { flex: 1 }]}
                    placeholder="SC/PWD customers"
                    placeholderTextColor={colors.textSecondary}
                    value={String(scPwdPax)}
                    onChangeText={(value) =>
                      onPaxChange?.(totalPax, Math.max(1, Number(value) || 1))
                    }
                    keyboardType="number-pad"
                  />
                </View>
                <Text style={[styles.help, { color: colors.textSecondary }]}>
                  Discount will be applied proportionally to {scPwdPax} out of {totalPax} customers
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  fields: { gap: 8 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  segmentText: { fontSize: 12, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
  },
  error: { color: '#EF4444', fontSize: 11, marginTop: -4 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchText: { fontSize: 13, fontWeight: '600', flex: 1 },
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  option: { borderWidth: 1, borderRadius: 8, padding: 10 },
  optionText: { fontSize: 12, fontWeight: '700' },
  paxRow: { flexDirection: 'row', gap: 8 },
  help: { fontSize: 11 },
});

export default ScPwdCustomerForm;
