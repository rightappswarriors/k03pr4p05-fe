import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
} from 'react-native';
import { Minus, Plus, X } from 'lucide-react-native';
import type { Item } from '@/types';
import { useTheme } from '@/contexts/ThemeContext'
import { useResponsive } from '@/hooks/useResponsive';
interface QuantityModalProps {
  visible: boolean;
  item: Item | null;
  onAddToCart: (quantity: number) => void;
  onClose: () => void;
}

export function QuantityModal({ visible, item, onAddToCart, onClose }: QuantityModalProps) {
  const [quantity, setQuantity] = useState(1);
  const { colors } = useTheme()
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(quantity);
    setQuantity(1);
  };
  const { isDesktop, isTablet} = useResponsive()
  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, {backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.header, { borderColor: colors.border}]}>
            <Text style={[styles.title, {color: colors.text}]}>Add to Cart</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.content, { backgroundColor: colors.background}]}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={[styles.itemName, { color: colors.text}]}>{item.name}</Text>
            <Text style={[styles.itemPrice, { color: colors.text}]}>₱{item.price.toFixed(2)}</Text>
            
            <View style={styles.quantitySection}>
              <Text style={[styles.quantityLabel, { color: colors.textSecondary}]}>Quantity</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  onPress={() => handleQuantityChange(quantity - 1)}
                  style={[styles.quantityButton, { backgroundColor: colors.card}]}
                >
                  <Minus size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.quantityInput, { backgroundColor: colors.card, color: colors.textSecondary, borderColor: colors.border}, , isDesktop && {outline: 'none'}, , isTablet && {outline: 'none'}]}
                  value={quantity.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 1;
                    handleQuantityChange(num);
                  }}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  onPress={() => handleQuantityChange(quantity + 1)}
                  style={[styles.quantityButton, { backgroundColor: colors.card}]}
                >
                  <Plus size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.totalSection}>
              <Text style={[styles.totalLabel, { color: colors.text}]}>Total: </Text>
              <Text style={styles.totalAmount}>₱{(item.price * quantity).toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={[styles.cancelButton, { backgroundColor: colors.background}]}>
              <Text style={[styles.cancelButtonText, {color: colors.textSecondary}]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddToCart} style={styles.addButton}>
              <Text style={styles.addButtonText}>Add to Cart</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 24,
  },
  quantitySection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 44,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    width: 60,
    height: 44,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  addButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});