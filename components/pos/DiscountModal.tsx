import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DiscountType } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { X } from 'lucide-react-native';
import { usePOS } from '@/contexts/POSContext';

type DiscountModalType = {
  isVisible: boolean;
  onClose: () => void;
  isDiscounted: boolean;
  setIsDiscounted: () => void;
  discountOption: DiscountType;
  setDiscountOption: (value: DiscountType) => void;
  setSelectedPromoId: (id: number | null) => void;
};
// Custom modern radio component
const DiscountRadio = ({
  label,
  value,
  selected,
  disabled,
  onPress,
  colors,
  id,
}: {
  label: string;
  value: DiscountType;
  selected: boolean;
  disabled?: boolean;
  onPress: (value: DiscountType, id?: number) => void;
  colors: any;
  id?: number;
}) => (
  <TouchableOpacity
    onPress={() => !disabled && onPress(value, id)}
    activeOpacity={0.8}
    className={`flex-row items-center gap-2 px-3 py-2 rounded-full border ${
      disabled ? 'opacity-50' : ''
    }`}
    style={{
      borderColor: selected ? colors.primary : colors.border,
    }}
  >
    <View
      className="w-5 h-5 rounded-full border-2 items-center justify-center"
      style={{
        borderColor: selected ? colors.primary : colors.border,
      }}
    >
      {selected && (
        <View
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: colors.primary }}
        />
      )}
    </View>
    <Text
      className="text-sm"
      style={{ color: disabled ? colors.textSecondary : colors.text }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// Group component
const DiscountRadioGroup = ({
  value,
  isDiscounted,
  setDiscountOption,
  setSelectedPromoId,
  colors,
}: {
  value: DiscountType;
  isDiscounted: boolean;
  setDiscountOption: (value: DiscountType) => void;
  setSelectedPromoId: (id: number | null) => void;
  colors: any;
}) => {
  const { outlet } = usePOS();

  const options = [
    { label: 'None', value: 'NONE' as DiscountType },
    ...(outlet?.outletPromos?.filter(p => p.isActive).map((p) => ({
      label: p.promoType.name,
      value: p.promoType.name.toUpperCase().replace(/\s+/g, '_') as DiscountType,
      id: p.id,
    })) || []),
  ];

  return (
    <View className="flex-row justify-evenly mt-2 mb-4">
      {options.map((opt) => (
        <DiscountRadio
          key={opt.value}
          label={opt.label}
          value={opt.value}
          selected={value === opt.value}
          disabled={!isDiscounted}
          onPress={(val, id) => {
            setDiscountOption(val);
            setSelectedPromoId(id || null);
          }}
          colors={colors}
          id={opt.id}
        />
      ))}
    </View>
  );
};

// Main Modal Component
export default function DiscountModal({
  isVisible,
  setIsDiscounted,
  onClose,
  isDiscounted,
  discountOption,
  setDiscountOption,
  setSelectedPromoId,
}: DiscountModalType) {
  const { colors } = useTheme();
  const handleClose = () => {
    onClose();
    if (!discountOption || discountOption === 'NONE') {
      setIsDiscounted();
      setSelectedPromoId(null);
    }
  };
  // Please make this look nice, it's the most important part of the UI
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
          <View
            className="flex-row justify-between items-center p-3 border-b"
            style={{ borderColor: colors.border }}
          >
            <Text
              className="text-base font-medium"
              style={{ color: colors.text }}
            >
              Choose Discount
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <DiscountRadioGroup
            value={isDiscounted ? discountOption : 'NONE'}
            isDiscounted={isDiscounted}
            setDiscountOption={setDiscountOption}
            setSelectedPromoId={setSelectedPromoId}
            colors={colors}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
