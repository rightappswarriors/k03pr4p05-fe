import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { DiscountType } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { X, CheckCircle } from 'lucide-react-native';
import { usePOS } from '@/contexts/POSContext';

type DiscountModalType = {
  isVisible: boolean;
  onClose: () => void;
  isDiscounted: boolean;
  setIsDiscounted: () => void;
  discountOption: DiscountType;
  setDiscountOption: (value: DiscountType) => void;
  setSelectedPromoId: (id: number | undefined) => void;
  subtotal: number;
  vatAmount: number;
  vatExemptRefNo: string;
  setVatExemptRefNo: (v: string) => void;
};

export default function DiscountModal({
  isVisible,
  setIsDiscounted,
  onClose,
  isDiscounted,
  discountOption,
  setDiscountOption,
  setSelectedPromoId,
  subtotal,
  vatAmount,
  vatExemptRefNo,
  setVatExemptRefNo,
}: DiscountModalType) {
  const { colors } = useTheme();
  const { outlet } = usePOS();

  const options = [
    { label: 'None', value: 'NONE' as DiscountType, id: undefined },
    ...(outlet?.outletPromos
      ?.filter((p) => p.isActive)
      .map((p) => ({
        label: p.promoType.name,
        value: p.promoType.name
          .toUpperCase()
          .replace(/\s+/g, '_') as DiscountType,
        id: p.id,
        discount: p.discount / 100,
      })) || []),
  ];

  const computeSaving = (value: DiscountType, discount?: number) => {
    if (value === 'NONE' || !discount) return null;
    const isSC = value === 'SENIOR' || value === 'PWD';
    if (isSC) {
      const vatExcl = subtotal / 1.12;
      const vat = subtotal - vatExcl;
      const scDisc = vatExcl * 0.2;
      return {
        saving: scDisc + vat,
        isVatExempt: true,
        label: `₱${scDisc.toFixed(2)} off + ₱${vat.toFixed(2)} VAT exempt`,
      };
    }
    return {
      saving: subtotal * discount,
      isVatExempt: false,
      label: `₱${(subtotal * discount).toFixed(2)} off`,
    };
  };

  const handleClose = () => {
    onClose();
    if (!discountOption || discountOption === 'NONE') {
      setIsDiscounted();
      setSelectedPromoId(undefined);
    }
  };

  const handleSelect = (value: DiscountType, id: number | undefined) => {
    setDiscountOption(value);
    setSelectedPromoId(id);
    if (value !== 'NONE') {
      if (!isDiscounted) setIsDiscounted();
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                Apply discount
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Best benefit selected automatically
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.body}>
            {options.map((opt) => {
              const isSelected = discountOption === opt.value;
              const saving = computeSaving(opt.value, (opt as any).discount);

              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => handleSelect(opt.value, opt.id)}
                  activeOpacity={0.8}
                  style={[
                    styles.option,
                    {
                      borderColor: isSelected ? colors.accent : colors.border,
                      borderWidth: isSelected ? 1.5 : 0.5,
                      backgroundColor: isSelected
                        ? colors.accent + '12'
                        : colors.background,
                    },
                  ]}
                >
                  {/* Radio */}
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.radioDot,
                          { backgroundColor: colors.accent },
                        ]}
                      />
                    )}
                  </View>

                  {/* Label */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optLabel, { color: colors.text }]}>
                      {opt.label}
                    </Text>
                    {saving && (
                      <Text
                        style={[
                          styles.optMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {saving.label}
                        {saving.isVatExempt ? ' · VAT exempt' : ''}
                      </Text>
                    )}
                  </View>

                  {/* Saving badge */}
                  {saving && (
                    <View
                      style={[
                        styles.savingBadge,
                        { backgroundColor: '#10B98120' },
                      ]}
                    >
                      <Text style={styles.savingText}>
                        -₱{saving.saving.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelTxt, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.applyBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.applyTxt}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16, gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optLabel: { fontSize: 14, fontWeight: '500' },
  optMeta: { fontSize: 11, marginTop: 2 },
  savingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  savingText: { fontSize: 12, fontWeight: '600', color: '#059669' },
  vatCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    marginTop: 4,
  },
  vatTitle: { fontSize: 13, fontWeight: '600' },
  vatSub: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    marginTop: 4,
  },
  idLabel: { fontSize: 12, fontWeight: '700' },
  idInput: { flex: 1, fontSize: 14 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 0.5,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 14, fontWeight: '500' },
  applyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
