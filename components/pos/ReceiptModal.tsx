// components/pos/ReceiptModal.tsx

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { CustomCheckbox } from '@/components/pos/checkbox/CustomCheckbox';
import { PaymentBottomSheetRef } from '@/types';
import {
  X,
  Printer,
  PhilippinePeso,
  CreditCard,
  Package,
  Store,
} from 'lucide-react-native';
import type { DiscountType } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { usePOS } from '@/contexts/POSContext';
import { calculateTotal, calculateItemVat } from '@/hooks/calculateTotal';
import PaymentBottomSheet from '@/components/pos/paymentMethod/PaymentBottomSheet';
import { ItemDiscountModal } from './ItemDiscountModal';
import RootView from '@/components/ui/RootView';
import { useAuth } from '@/contexts/AuthContext';
import { ReceiptService } from '@/services/paymentService';
import useNetworkStatus from '@/hooks/useNetworkStatus';
import { useResponsive } from '@/hooks/useResponsive';
import ScPwdCustomerForm from '@/components/ScPwdCustomerForm';
import type { ScPwdCustomerInput } from '@/services/salesOrder.service';

const WEIGHT_UNITS = ['kg', 'gram', 'g', 'grams', 'kilo', 'kilos'];

interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  onPrintReceipt: (receiptData: any) => void;
  onOrderPlaced?: () => void;
}

interface ItemDiscount {
  discountAmount: number;
  discountQuantity: number;
  discountRate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ItemRow — fully outside ReceiptModal so React never remounts it on re-render
// ─────────────────────────────────────────────────────────────────────────────
interface ItemRowProps {
  data: any;
  colors: any;
  onDiscountPress: (item: any) => void;
  outlet?: any;
  isVatExempt?: boolean;
}

const ItemRow = React.memo(
  ({ data, colors, onDiscountPress, outlet, isVatExempt }: ItemRowProps) => {
    const isWeight =
      data.unitName && WEIGHT_UNITS.includes(data.unitName.toLowerCase());
    const unitPrice = data.priceAtSale ?? data.price;
    const discountAmount = data.discountAmount ?? 0;
    const discountQty = data.discountQuantity ?? 0;
    const discountRate = data.discountRate ?? 0;

    const discountedPrice = unitPrice * (1 - discountRate);
    const discountedTotal = discountedPrice * discountQty;
    const regularTotal = unitPrice * (data.quantity - discountQty);
    const lineTotal = discountedTotal + regularTotal;

    // Use pre-calculated VAT amount
    const itemVat = data.itemVatAmount ?? 0;
    const lineTotalWithVat = lineTotal;

    return (
      <View style={[rs.itemRow, { borderBottomColor: colors.border }]}>
        <View style={rs.itemLeft}>
          {data.image ? (
            <Image source={{ uri: data.image }} style={rs.itemThumb} />
          ) : (
            <View
              style={[
                rs.itemThumb,
                {
                  backgroundColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
            >
              <Package
                size={16}
                color={colors.textSecondary}
                strokeWidth={1.5}
              />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={[rs.itemName, { color: colors.text }]}>
                {data.name}
              </Text>
              {itemVat > 0 && (
                <View style={rs.vatBadge}>
                  <Text style={rs.vatBadgeText}>VAT 12%</Text>
                </View>
              )}
            </View>
            <Text style={[rs.itemMeta, { color: colors.textSecondary }]}>
              {isWeight
                ? `${data.quantity.toFixed(3)} ${data.unitName} × ₱${unitPrice.toFixed(2)}/${data.unitName}`
                : `${data.quantity} ${data.unitLabel ?? 'pc'} × ₱${unitPrice.toFixed(2)}`}
            </Text>
            {discountAmount > 0 && (
              <Text style={[rs.itemMeta, { color: '#EF4444' }]}>
                {discountQty} @ {(discountRate * 100).toFixed(0)}% off: -₱
                {discountAmount.toFixed(2)}
              </Text>
            )}
            {itemVat > 0 && (
              <Text style={[rs.itemMeta, { color: colors.textSecondary }]}>
                VAT (12%): ₱{itemVat.toFixed(2)}
              </Text>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[rs.itemTotal, { color: colors.text }]}>
            ₱{lineTotalWithVat.toFixed(2)}
          </Text>
          <TouchableOpacity
            onPress={() => onDiscountPress(data)}
            style={{
              marginTop: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: discountAmount > 0 ? '#EF4444' : colors.primary,
              borderRadius: 4,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
              {discountAmount > 0 ? 'Edit Discount' : 'Discount'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// TotalsBlock — outside ReceiptModal, receives all values as props
// ─────────────────────────────────────────────────────────────────────────────
interface TotalsBlockProps {
  colors: any;
  outlet: any;
  subtotal: number;
  vatAmount: number;
  vatExemptAmount: number | undefined;
  discount: number;
  discountRate: number;
  discountOption: DiscountType;
  total: number;
  isDiscounted: boolean;
  isVatExemptOption: boolean;
  applyVatExempt: boolean;
  isVatExemptActive: boolean;
}

const TotalsBlock = React.memo(
  ({
    colors,
    outlet,
    subtotal,
    vatAmount,
    vatExemptAmount,
    discount,
    discountRate,
    discountOption,
    total,
    isDiscounted,
    isVatExemptOption,
    applyVatExempt,
    isVatExemptActive,
  }: TotalsBlockProps) => (
    <View style={[rs.totalsBlock, { borderColor: colors.border }]}>
      <View style={rs.totalRow}>
        <Text style={[rs.totalLabel, { color: colors.textSecondary }]}>
          Subtotal
        </Text>
        <Text style={[rs.totalValue, { color: colors.text }]}>
          ₱{subtotal.toFixed(2)}
        </Text>
      </View>

      {outlet.isVatRegistered && vatAmount > 0 && (
        <View style={rs.totalRow}>
          <Text style={[rs.totalLabel, { color: colors.textSecondary }]}>
            VAT
          </Text>
          <Text style={[rs.totalValue, { color: colors.text }]}>
            ₱{vatAmount.toFixed(2)}
          </Text>
        </View>
      )}

      {isVatExemptActive && vatExemptAmount !== undefined && (
        <View style={rs.totalRow}>
          <Text style={[rs.totalLabel, { color: '#10B981' }]}>
            VAT Exempted
          </Text>
          <Text style={[rs.totalValue, { color: '#10B981' }]}>
            -₱{vatExemptAmount.toFixed(2)}
          </Text>
        </View>
      )}

      {isDiscounted && discount > 0 && (
        <View style={rs.totalRow}>
          <Text style={[rs.totalLabel, { color: colors.textSecondary }]}>
            Discount {discountOption} ({(discountRate * 100).toFixed(0)}%)
          </Text>
          <Text style={[rs.totalValue, { color: '#EF4444' }]}>
            -₱{discount.toFixed(2)}
          </Text>
        </View>
      )}

      <View
        style={[rs.totalRow, rs.grandRow, { borderTopColor: colors.border }]}
      >
        <Text style={[rs.grandLabel, { color: colors.text }]}>Total</Text>
        <Text style={[rs.grandValue, { color: colors.accent }]}>
          ₱{total.toFixed(2)}
        </Text>
      </View>
    </View>
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// PaymentBlock — outside ReceiptModal, receives all state/setters as props
// ─────────────────────────────────────────────────────────────────────────────
interface PaymentBlockProps {
  colors: any;
  outlet: any;
  isConnected: boolean;
  isDiscounted: boolean;
  isVatExemptOption: boolean;
  applyVatExempt: boolean;
  onToggleVatExempt: () => void;
  discountOption: DiscountType;
  onOpenDiscountModal: () => void;
  setIsDiscounted: (val: boolean) => void;
  setDiscountOption: (val: DiscountType) => void;
  setSelectedPromoId: (val: number | undefined) => void;
  subtotal: number;
  vatAmount: number;
  vatExemptRefNo: string;
  setVatExemptRefNo: (val: string) => void;
  cashReceived: string;
  setCashReceived: (val: string) => void;
  cashAmount: number;
  change: number;
  total: number;
  paymentSheetRef: React.RefObject<PaymentBottomSheetRef | null>;
}

const PaymentBlock = React.memo(
  ({
    colors,
    outlet,
    isConnected,
    isDiscounted,
    isVatExemptOption,
    applyVatExempt,
    onToggleVatExempt,
    discountOption,
    onOpenDiscountModal,
    setIsDiscounted,
    setDiscountOption,
    setSelectedPromoId,
    subtotal,
    vatAmount,
    vatExemptRefNo,
    setVatExemptRefNo,
    cashReceived,
    setCashReceived,
    cashAmount,
    change,
    total,
    paymentSheetRef,
  }: PaymentBlockProps) => (
    <View style={rs.paymentBlock}>
      {/* Discount + payment method row */}
      <View style={rs.paymentTopRow}>
        <View style={rs.paymentTopLeft}>
          <View style={rs.vatExemptCheckbox}>
            <CustomCheckbox
              label="VAT Exempt"
              checked={applyVatExempt}
              onPress={onToggleVatExempt}
              colors={colors}
            />
          </View>
        </View>
        <TouchableOpacity
          style={rs.payMethodBtn}
          disabled={!isConnected || !outlet.hasKey}
          onPress={() => paymentSheetRef.current?.open()}
        >
          <CreditCard
            size={18}
            color={
              isConnected && outlet.hasKey
                ? colors.primary
                : colors.textSecondary
            }
          />
          <Text
            style={[
              rs.payMethodTxt,
              {
                color:
                  isConnected && outlet.hasKey
                    ? colors.primary
                    : colors.textSecondary,
              },
            ]}
          >
            {isConnected && outlet.hasKey
              ? 'Payment Method'
              : !isConnected
                ? 'Offline'
                : 'Unavailable'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* SC/PWD ID Input */}
      {applyVatExempt && (
        <View
          style={[
            rs.cashRow,
            {
              backgroundColor: colors.background,
              borderColor: applyVatExempt ? '#10B981' : colors.border,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 13,
              color: applyVatExempt ? '#10B981' : colors.textSecondary,
              fontWeight: '600',
            }}
          >
            SC/PWD ID
          </Text>
          <TextInput
            style={[rs.cashInput, { color: colors.text }]}
            placeholder="Enter Senior Citizen or PWD ID No."
            placeholderTextColor={colors.textSecondary}
            value={vatExemptRefNo}
            onChangeText={setVatExemptRefNo}
            editable={true}
            selectTextOnFocus={false}
          />
        </View>
      )}

      {/* Cash input */}
      <View
        style={[
          rs.cashRow,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <PhilippinePeso size={18} color={colors.textSecondary} />
        <TextInput
          style={[rs.cashInput, { color: colors.text }]}
          placeholder="Enter cash received"
          placeholderTextColor={colors.textSecondary}
          value={cashReceived}
          onChangeText={setCashReceived}
          keyboardType="numeric"
          editable={true}
          selectTextOnFocus={false}
        />
      </View>

      {/* Change */}
      {cashAmount > 0 && (
        <View
          style={[
            rs.changeBlock,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={rs.totalRow}>
            <Text style={[rs.totalLabel, { color: colors.textSecondary }]}>
              Cash Received
            </Text>
            <Text style={[rs.totalValue, { color: colors.text }]}>
              ₱{cashAmount.toFixed(2)}
            </Text>
          </View>
          <View style={[rs.totalRow, { marginTop: 6 }]}>
            <Text style={[rs.grandLabel, { color: colors.text }]}>Change</Text>
            <Text
              style={[
                rs.grandValue,
                { color: change >= 0 ? '#10B981' : '#EF4444' },
              ]}
            >
              {change < 0 ? 'Insufficient' : `₱${change.toFixed(2)}`}
            </Text>
          </View>
        </View>
      )}
    </View>
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// ReceiptModal — only state and coordination logic lives here
// ─────────────────────────────────────────────────────────────────────────────
export function ReceiptModal({
  visible,
  onClose,
  onOrderPlaced,
}: ReceiptModalProps) {
  const paymentSheetRef = useRef<PaymentBottomSheetRef>(null);
  const isConnected = useNetworkStatus();
  const { cartItems: items, clearCart, outlet } = usePOS();
  const { colors } = useTheme();
  const { isDesktop, isTablet } = useResponsive();
  const { user } = useAuth();
  const isWide = isDesktop || isTablet;

  const [vatExemptRefNo, setVatExemptRefNo] = useState('');
  const [customerType, setCustomerType] = useState<'REGULAR' | 'SENIOR_CITIZEN' | 'PWD'>('REGULAR');
  const [scPwdFullName, setScPwdFullName] = useState('');
  const [scPwdIdType, setScPwdIdType] = useState('OSCA');
  const [scPwdDateOfBirth, setScPwdDateOfBirth] = useState('');
  const [scPwdContactNumber, setScPwdContactNumber] = useState('');
  const [isRepresentative, setIsRepresentative] = useState(false);
  const [representativeName, setRepresentativeName] = useState('');
  const [representativeIdNumber, setRepresentativeIdNumber] = useState('');
  const [totalPax, setTotalPax] = useState('1');
  const [scPwdPax, setScPwdPax] = useState('1');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountOption, setDiscountOption] = useState<DiscountType>('NONE');
  const [isDiscounted, setIsDiscounted] = useState(false);
  const [applyVatExempt, setApplyVatExempt] = useState(false);
  const [selectedPromoId, setSelectedPromoId] = useState<number | undefined>(
    undefined,
  );
  const [itemDiscounts, setItemDiscounts] = useState<
    Record<string, ItemDiscount>
  >({});
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [selectedDiscountItem, setSelectedDiscountItem] = useState<any>(null);

  useEffect(() => {
    if (!isDiscounted) {
      setDiscountOption('NONE');
      setSelectedPromoId(undefined);
    }
  }, [isDiscounted]);

  useEffect(() => {
    if (discountOption === 'NONE') {
      setSelectedPromoId(undefined);
    }
  }, [discountOption]);

  useEffect(() => {
    if (customerType === 'REGULAR') {
      setApplyVatExempt(false);
      setDiscountOption('NONE');
      return;
    }
    setApplyVatExempt(true);
    setIsDiscounted(true);
    setDiscountOption(customerType === 'PWD' ? 'PWD' : 'SENIOR_CITIZEN');
    setScPwdIdType(customerType === 'PWD' ? 'PWD-PDAO' : 'OSCA');
  }, [customerType]);

  // ── All hooks must come before any early return ──────────────────────────
  const handleClose = useCallback(() => {
    setCashReceived('');
    setIsProcessing(false);
    onClose();
  }, [onClose]);

  const handleItemDiscountPress = useCallback((item: any) => {
    setSelectedDiscountItem(item);
    setDiscountModalVisible(true);
  }, []);

  const handleToggleVatExempt = useCallback(() => {
    setApplyVatExempt((prev) => !prev);
  }, []);

  // Placeholder for future discount modal — wire up your own modal here
  const handleOpenDiscountModal = useCallback(() => {
    // TODO: open your discount selection modal
  }, []);

  // ── Early return after all hooks ─────────────────────────────────────────
  if (!outlet || !user) return null;

  // ── Derived values (not hooks, safe after early return) ──────────────────
  const isVatExemptOption = /SENIOR|PWD/.test(discountOption);
  const isVatExemptActive = applyVatExempt; // Just use applyVatExempt directly
  const vatExemptType = 'SENIOR_CITIZEN'; // Default to senior citizen for VAT exempt

  const itemsWithDiscounts = items.map((item) => ({
    ...item,
    discountAmount: itemDiscounts[item.id]?.discountAmount || 0,
    discountQuantity: itemDiscounts[item.id]?.discountQuantity || 0,
    discountRate: itemDiscounts[item.id]?.discountRate || 0,
  }));

  // First, calculate totals - this will determine VAT amounts based on isVatExemptActive
  const {
    total,
    subtotal,
    vatAmount,
    discount,
    discountRate,
    vatExemptAmount,
  } = calculateTotal(
    itemsWithDiscounts,
    outlet,
    {
      type: discountOption,
      applyVatExempt: isVatExemptActive,
    },
    isVatExemptActive,
    {
      customerType,
      discountType: discountOption,
      totalPax: parseInt(totalPax) || 1,
      scPwdPax: parseInt(scPwdPax) || 1,
      isVatRegistered: outlet?.isVatRegistered,
    },
  );

  // Then calculate itemVatAmount for display purposes AFTER getting the calculation
  const itemsWithVat = itemsWithDiscounts.map((item) => {
    const itemVat = outlet?.isVatRegistered && item.vatExempt !== true && !isVatExemptActive
      ? calculateItemVat(item, outlet.isVatRegistered, isVatExemptActive)
      : 0;

    return {
      ...item,
      itemVatAmount: itemVat,
    };
  });

  console.log('ReceiptModal totals:', {
    total,
    subtotal,
    vatAmount,
    discount,
    discountRate,
    vatExemptAmount,
    isVatExemptActive,
  });

  const cashAmount = parseFloat(cashReceived) || 0;
  const change = cashAmount - total;

  const applyItemDiscount = (discountData: ItemDiscount) => {
    if (selectedDiscountItem) {
      setItemDiscounts((prev) => ({
        ...prev,
        [selectedDiscountItem.id]: discountData,
      }));
    }
  };

  const handlePrintReceipt = async () => {
    if (customerType !== 'REGULAR') {
      if (!scPwdFullName.trim() || !vatExemptRefNo.trim()) {
        Alert.alert('SC/PWD details required', 'Please enter the customer full name and SC/PWD ID number before checkout.');
        return;
      }
      if ((parseInt(scPwdPax) || 0) > (parseInt(totalPax) || 0)) {
        Alert.alert('Invalid pax count', 'SC/PWD pax must be less than or equal to total pax.');
        return;
      }
    }
    setIsProcessing(true);

    // ✅ Open synchronously inside the click handler, BEFORE any await
    const printWindow =
      Platform.OS === 'web'
        ? window.open('', '_blank', 'width=500,height=800')
        : null;

    try {
      await ReceiptService.processAndPrintReceipt({
        items: itemsWithVat,
        cashReceived: parseFloat(cashReceived) || 0,
        paymentMethod: 'CASH',
        discountOption,
        outlet,
        user,
        isVatExempt: isVatExemptActive,
        vatExemptType: isVatExemptActive ? vatExemptType : undefined,
        vatExemptRefNo: isVatExemptActive ? vatExemptRefNo : undefined,
        vatExemptAmount: isVatExemptActive ? vatExemptAmount : undefined,
        customerType,
        scPwdCustomerInput: customerType !== 'REGULAR'
          ? {
            fullName: scPwdFullName.trim(),
            idNumber: vatExemptRefNo.trim(),
            idType: scPwdIdType,
            customerType,
            dateOfBirth: scPwdDateOfBirth.trim() || undefined,
            contactNumber: scPwdContactNumber.trim() || undefined,
            isRepresentative,
            representativeName: isRepresentative ? representativeName.trim() : undefined,
            representativeIdNumber: isRepresentative ? representativeIdNumber.trim() : undefined,
          }
          : undefined,
        totalPax: parseInt(totalPax) || undefined,
        scPwdPax: parseInt(scPwdPax) || undefined,
        outletPromoId: selectedPromoId ?? undefined,
        promoDiscountAmt: discount,
        printWindow, // ✅ pass it in
        onSuccess: () => {
          setIsProcessing(false);
          onOrderPlaced?.();
          clearCart();
          handleClose();
        },
        onFail: () => {
          setIsProcessing(false);
          printWindow?.close(); // ✅ clean up on failure
        },
      });
    } catch {
      setIsProcessing(false);
      printWindow?.close(); // ✅ clean up on error
    }
  };

  // Shared props passed down to avoid re-creating objects inline
  const totalsProps: TotalsBlockProps = {
    colors,
    outlet,
    subtotal,
    vatAmount,
    vatExemptAmount,
    discount,
    discountRate,
    discountOption,
    total,
    isDiscounted,
    isVatExemptOption,
    applyVatExempt,
    isVatExemptActive,
  };

  const paymentProps: PaymentBlockProps = {
    colors,
    outlet,
    isConnected,
    isDiscounted,
    isVatExemptOption,
    applyVatExempt,
    onToggleVatExempt: handleToggleVatExempt,
    discountOption,
    onOpenDiscountModal: handleOpenDiscountModal,
    setIsDiscounted,
    setDiscountOption,
    setSelectedPromoId,
    subtotal,
    vatAmount,
    vatExemptRefNo,
    setVatExemptRefNo,
    cashReceived,
    setCashReceived,
    cashAmount,
    change,
    total,
    paymentSheetRef,
  };

  const scPwdData: ScPwdCustomerInput = {
    fullName: scPwdFullName,
    idNumber: vatExemptRefNo,
    idType: scPwdIdType,
    customerType,
    dateOfBirth: scPwdDateOfBirth,
    contactNumber: scPwdContactNumber,
    isRepresentative,
    representativeName,
    representativeIdNumber,
  };

  const updateScPwdData = (data: ScPwdCustomerInput) => {
    setScPwdFullName(data.fullName ?? '');
    setVatExemptRefNo(data.idNumber ?? '');
    setScPwdIdType(data.idType ?? (customerType === 'PWD' ? 'PWD-PDAO' : 'OSCA'));
    setScPwdDateOfBirth(data.dateOfBirth ?? '');
    setScPwdContactNumber(data.contactNumber ?? '');
    setIsRepresentative(Boolean(data.isRepresentative));
    setRepresentativeName(data.representativeName ?? '');
    setRepresentativeIdNumber(data.representativeIdNumber ?? '');
  };

  const customerCaptureBlock = (
    <View style={rs.customerBlock}>
      <Text style={[rs.sectionTitle, { color: colors.text }]}>Customer Type</Text>
      <ScPwdCustomerForm
        customerType={customerType}
        onCustomerTypeChange={setCustomerType}
        scPwdData={scPwdData}
        onScPwdDataChange={updateScPwdData}
        discountType={discountOption as any}
        onDiscountTypeChange={(type) => {
          setDiscountOption(type as DiscountType);
          setIsDiscounted(type !== 'NONE');
          setApplyVatExempt(type === 'SENIOR_CITIZEN' || type === 'PWD');
        }}
        totalPax={parseInt(totalPax) || 1}
        scPwdPax={parseInt(scPwdPax) || 1}
        onPaxChange={(nextTotalPax, nextScPwdPax) => {
          setTotalPax(String(nextTotalPax));
          setScPwdPax(String(Math.min(nextScPwdPax, nextTotalPax)));
        }}
      />
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <RootView style={rs.overlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={onClose}
            />

            <View
              style={[
                rs.modal,
                isWide && rs.wideModal,
                { backgroundColor: colors.card },
              ]}
            >
              {/* Header */}
              <View style={[rs.header, { borderBottomColor: colors.border }]}>
                <View style={rs.headerLeft}>
                  {outlet.bannerImage ? (
                    <Image
                      source={{ uri: outlet.bannerImage }}
                      style={rs.logo}
                    />
                  ) : (
                    <View
                      style={[
                        rs.logo,
                        {
                          backgroundColor: colors.border,
                          borderRadius: 25,
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      ]}
                    >
                      <Store size={20} color={colors.textSecondary} />
                    </View>
                  )}
                  <View>
                    <Text style={[rs.outletName, { color: colors.text }]}>
                      {outlet.name}
                    </Text>
                    <Text
                      style={[rs.receiptSub, { color: colors.textSecondary }]}
                    >
                      Receipt ·{' '}
                      {outlet.isVatRegistered ? 'VAT Registered' : 'Non-VAT'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleClose} style={rs.closeBtn}>
                  <X size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Body */}
              {isWide ? (
                <View style={rs.wideBody}>
                  <View
                    style={[rs.wideLeft, { borderRightColor: colors.border }]}
                  >
                    <Text style={[rs.sectionTitle, { color: colors.text }]}>
                      Items ({items.length})
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {itemsWithVat.map((data) => (
                        <ItemRow
                          key={data.id}
                          data={data}
                          colors={colors}
                          onDiscountPress={handleItemDiscountPress}
                          outlet={outlet}
                          isVatExempt={isVatExemptActive}
                        />
                      ))}
                    </ScrollView>
                    <TotalsBlock {...totalsProps} />
                  </View>
                  <View style={rs.wideRight}>
                    <Text style={[rs.sectionTitle, { color: colors.text }]}>
                      Payment
                    </Text>
                    {customerCaptureBlock}
                    <PaymentBlock {...paymentProps} />
                  </View>
                </View>
              ) : (
                <ScrollView
                  style={[
                    rs.mobileBody,
                    { backgroundColor: colors.background },
                  ]}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text
                    style={[
                      rs.sectionTitle,
                      { color: colors.text, marginBottom: 8 },
                    ]}
                  >
                    Items ({items.length})
                  </Text>
                  {itemsWithVat.map((data) => (
                    <ItemRow
                      key={data.id}
                      data={data}
                      colors={colors}
                      onDiscountPress={handleItemDiscountPress}
                      outlet={outlet}
                      isVatExempt={isVatExemptActive}
                    />
                  ))}
                  <TotalsBlock {...totalsProps} />
                  <Text
                    style={[
                      rs.sectionTitle,
                      { color: colors.text, marginTop: 16, marginBottom: 8 },
                    ]}
                  >
                    Payment
                  </Text>
                  {customerCaptureBlock}
                  <PaymentBlock {...paymentProps} />
                </ScrollView>
              )}

              {/* Footer */}
              <View style={[rs.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={[rs.cancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={[rs.cancelTxt, { color: colors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePrintReceipt}
                  style={[
                    rs.printBtn,
                    { backgroundColor: colors.accent },
                    (cashAmount < total || isProcessing) && rs.disabledBtn,
                  ]}
                  disabled={cashAmount < total || isProcessing}
                >
                  <Printer size={18} color="white" />
                  <Text style={rs.printTxt}>
                    {isProcessing ? 'Processing…' : 'Print Receipt'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <PaymentBottomSheet ref={paymentSheetRef} />
          </RootView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Item Discount Modal */}
      {selectedDiscountItem && (
        <ItemDiscountModal
          visible={discountModalVisible}
          onClose={() => {
            setDiscountModalVisible(false);
            setSelectedDiscountItem(null);
          }}
          item={selectedDiscountItem}
          outlet={outlet}
          onApply={applyItemDiscount}
        />
      )}
    </>
  );
}

const rs = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  wideModal: {
    maxWidth: 820,
    height: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 22 },
  outletName: { fontSize: 16, fontWeight: '800' },
  receiptSub: { fontSize: 12, marginTop: 1 },
  closeBtn: { padding: 6 },
  wideBody: { flex: 1, flexDirection: 'row' },
  wideLeft: { flex: 1, padding: 20, borderRightWidth: 1 },
  wideRight: { width: 300, padding: 20 },
  mobileBody: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  itemThumb: { width: 36, height: 36, borderRadius: 8 },
  itemName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  vatBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vatBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  itemMeta: { fontSize: 11 },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'right',
  },
  totalsBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 6 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 13, fontWeight: '600' },
  grandRow: { paddingTop: 10, marginTop: 6, borderTopWidth: 1 },
  grandLabel: { fontSize: 16, fontWeight: '800' },
  grandValue: { fontSize: 20, fontWeight: '800' },
  paymentBlock: { gap: 12 },
  customerBlock: { gap: 10, marginBottom: 14 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segmentBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  segmentText: { fontSize: 12, fontWeight: '700' },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
  },
  paymentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentTopLeft: { flex: 1, gap: 8 },
  vatExemptCheckbox: { marginTop: 8 },
  discountBtn: { paddingVertical: 4 },
  discountBtnTxt: { fontSize: 13, fontWeight: '600' },
  payMethodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  payMethodTxt: { fontSize: 13, fontWeight: '600' },
  cashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  cashInput: { flex: 1, fontSize: 16 },
  changeBlock: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 4 },
  footer: { flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelTxt: { fontSize: 15, fontWeight: '600' },
  printBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
  },
  disabledBtn: { backgroundColor: '#9CA3AF' },
  printTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
