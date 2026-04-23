// components/pos/ReceiptModal.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
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
import { calculateTotal } from '@/hooks/calculateTotal';
import DiscountModal from './DiscountModal';
import PaymentBottomSheet from '@/components/pos/paymentMethod/PaymentBottomSheet';
import RootView from '@/components/ui/RootView';
import { useAuth } from '@/contexts/AuthContext';
import { ReceiptService } from '@/services/paymentService';
import useNetworkStatus from '@/hooks/useNetworkStatus';
import { useResponsive } from '@/hooks/useResponsive';

const WEIGHT_UNITS = ['kg', 'gram', 'g', 'grams', 'kilo', 'kilos'];

interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  onPrintReceipt: (receiptData: any) => void;
  onOrderPlaced?: () => void;
}

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
  const isWide = isDesktop || isTablet;
  const [vatExemptRefNo, setVatExemptRefNo] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountOption, setDiscountOption] = useState<DiscountType>('NONE');
  const [isDiscounted, setIsDiscounted] = useState(false);
  const [applyVatExempt, setApplyVatExempt] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedPromoId, setSelectedPromoId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!isDiscounted) {
      setDiscountOption('NONE');
      setSelectedPromoId(undefined);
      setApplyVatExempt(false);
    }
  }, [isDiscounted]);

  useEffect(() => {
    if (discountOption === 'NONE') {
      setSelectedPromoId(undefined);
    }
    if (!/SENIOR|PWD/.test(discountOption)) {
      setApplyVatExempt(false);
    }
  }, [discountOption]);
  if (!outlet) return null;

  const isVatExemptOption = /SENIOR|PWD/.test(discountOption);
  const isVatExemptActive = isVatExemptOption && applyVatExempt && isDiscounted;
  const vatExemptType = discountOption.includes('PWD')
    ? 'PWD'
    : discountOption.includes('SENIOR')
    ? 'SENIOR_CITIZEN'
    : undefined;

  const { total, subtotal, vatAmount, discount, discountRate, vatExemptAmount } =
    calculateTotal(items, outlet, {
      type: discountOption,
      applyVatExempt: isVatExemptActive,
    });

  const { user } = useAuth();
  const cashAmount = parseFloat(cashReceived) || 0;
  const change = cashAmount - total;

  if (!outlet || !user) return null;

  const handlePrintReceipt = async () => {
    setIsProcessing(true);
    try {
      await ReceiptService.processAndPrintReceipt({
        items,
        cashReceived: parseFloat(cashReceived) || 0,
        paymentMethod: 'CASH',
        discountOption,
        outlet,
        user,
        isVatExempt: isVatExemptActive,
        vatExemptType: isVatExemptActive ? vatExemptType : undefined,
        vatExemptRefNo: isVatExemptActive ? vatExemptRefNo : undefined,
        vatExemptAmount: isVatExemptActive ? vatExemptAmount : undefined,
        outletPromoId: selectedPromoId ?? undefined,
        promoDiscountAmt: discount,
        onSuccess: () => {
          setIsProcessing(false);
          onOrderPlaced?.();
          clearCart();
          handleClose();
        },
        onFail: () => {
          setIsProcessing(false);
        },
      });
    } catch {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setCashReceived('');
    setIsProcessing(false);
    onClose();
  };

  // ── Item row ────────────────────────────────────────────────────────────────
  const ItemRow = ({ data }: { data: any }) => {
    const isWeight =
      data.unitName && WEIGHT_UNITS.includes(data.unitName.toLowerCase());
    const unitPrice = data.priceAtSale ?? data.price;
    const lineTotal = unitPrice * data.quantity;

    return (
      <View style={[rs.itemRow, { borderBottomColor: colors.border }]}>
        <View style={rs.itemLeft}>
          {/* Image or placeholder */}
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
            <Text style={[rs.itemName, { color: colors.text }]}>
              {data.name}
            </Text>
            <Text style={[rs.itemMeta, { color: colors.textSecondary }]}>
              {isWeight
                ? `${data.quantity.toFixed(3)} ${data.unitName} × ₱${unitPrice.toFixed(2)}/${data.unitName}`
                : `${data.quantity} ${data.unitLabel ?? 'pc'} × ₱${unitPrice.toFixed(2)}`}
            </Text>
          </View>
        </View>
        <Text style={[rs.itemTotal, { color: colors.text }]}>
          ₱{lineTotal.toFixed(2)}
        </Text>
      </View>
    );
  };

  // ── Totals block ────────────────────────────────────────────────────────────
  const TotalsBlock = () => {
    const isSeniorOrPwd =
      discountOption === 'SENIOR' || discountOption === 'PWD';
    return (
      <View style={[rs.totalsBlock, { borderColor: colors.border }]}>
        <View style={rs.totalRow}>
          <Text style={[rs.totalLabel, { color: colors.textSecondary }]}>
            Subtotal
          </Text>
          <Text style={[rs.totalValue, { color: colors.text }]}>
            ₱{subtotal.toFixed(2)}
          </Text>
        </View>

        {/* VAT line — hidden when SC/PWD (exempt) */}
{outlet.isVatRegistered && !(isVatExemptOption && applyVatExempt) && (
          <View style={rs.totalRow}>
            <Text style={[rs.totalLabel, { color: colors.textSecondary }]}> 
              VAT (
              {outlet.vatType?.rate
                ? outlet.vatType.rate * 100
                : outlet.VatPercent
                  ? outlet.VatPercent * 100
                  : 0}
              %)
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

        {/* Discount line */}
        {isDiscounted && discount > 0 && (
          <View style={rs.totalRow}>
            <Text style={[rs.totalLabel, { color: colors.textSecondary }]}> 
              Discount {discountOption} ({discountRate.toFixed(0)}%)
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
    );
  };

  // ── Payment block ───────────────────────────────────────────────────────────
  const PaymentBlock = () => (
    <View style={rs.paymentBlock}>
      {/* Discount + payment method row */}
      <View style={rs.paymentTopRow}>
        <View style={rs.paymentTopLeft}>
          <CustomCheckbox
            label="Apply Discount"
            checked={isDiscounted}
            onPress={() => {
              if (!isDiscounted) setIsDiscounted(true);
              setIsVisible(!isVisible);
            }}
            colors={colors}
          />
          {isVatExemptOption && isDiscounted && (
            <View style={rs.vatExemptCheckbox}>
              <CustomCheckbox
                label="VAT Exempt"
                checked={applyVatExempt}
                onPress={() => setApplyVatExempt((prev) => !prev)}
                colors={colors}
              />
            </View>
          )}
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
      <DiscountModal
        isVisible={isVisible}
        onClose={() => setIsVisible(false)}
        isDiscounted={isDiscounted}
        setIsDiscounted={() => setIsDiscounted(!isDiscounted)}
        discountOption={discountOption}
        setDiscountOption={setDiscountOption}
        setSelectedPromoId={setSelectedPromoId}
        subtotal={subtotal} // ← add
        vatAmount={vatAmount} // ← add
        vatExemptRefNo={vatExemptRefNo} // ← move from PaymentBlock
        setVatExemptRefNo={setVatExemptRefNo} // ← move from PaymentBlock
      />
      {isVatExemptOption && (
        <View
          style={[
            rs.cashRow,
            { backgroundColor: colors.background, borderColor: applyVatExempt ? '#10B981' : colors.border },
          ]}
        >
          <Text style={{ fontSize: 13, color: applyVatExempt ? '#10B981' : colors.textSecondary, fontWeight: '600' }}>
            {discountOption.includes('PWD') ? 'PWD' : 'SC'} ID
          </Text>
          <TextInput
            style={[rs.cashInput, { color: colors.text }]}
            placeholder={`Enter ${discountOption.includes('PWD') ? 'PWD' : 'Senior Citizen'} ID No.`}
            placeholderTextColor={colors.textSecondary}
            value={vatExemptRefNo}
            onChangeText={setVatExemptRefNo}
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
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
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
                  <Image source={{ uri: outlet.bannerImage }} style={rs.logo} />
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

            {/* Body — single column on mobile, two column on desktop */}
            {isWide ? (
              <View style={rs.wideBody}>
                {/* Left: items */}
                <View
                  style={[rs.wideLeft, { borderRightColor: colors.border }]}
                >
                  <Text style={[rs.sectionTitle, { color: colors.text }]}>
                    Items ({items.length})
                  </Text>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {items.map((data) => (
                      <ItemRow key={data.id} data={data} />
                    ))}
                  </ScrollView>
                  <TotalsBlock />
                </View>
                {/* Right: payment */}
                <View style={rs.wideRight}>
                  <Text style={[rs.sectionTitle, { color: colors.text }]}>
                    Payment
                  </Text>
                  <PaymentBlock />
                </View>
              </View>
            ) : (
              <ScrollView
                style={[rs.mobileBody, { backgroundColor: colors.background }]}
              >
                <Text
                  style={[
                    rs.sectionTitle,
                    { color: colors.text, marginBottom: 8 },
                  ]}
                >
                  Items ({items.length})
                </Text>
                {items.map((data) => (
                  <ItemRow key={data.id} data={data} />
                ))}
                <TotalsBlock />
                <Text
                  style={[
                    rs.sectionTitle,
                    { color: colors.text, marginTop: 16, marginBottom: 8 },
                  ]}
                >
                  Payment
                </Text>
                <PaymentBlock />
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
      </Modal>
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
    maxWidth: 820, // two-column on desktop
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

  // Wide two-column body
  wideBody: { flex: 1, flexDirection: 'row' },
  wideLeft: {
    flex: 1,
    padding: 20,
    borderRightWidth: 1,
  },
  wideRight: {
    width: 300,
    padding: 20,
  },

  // Mobile single column body
  mobileBody: { flex: 1, padding: 16 },

  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },

  // Item row
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
  itemMeta: { fontSize: 11 },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'right',
  },

  // Totals
  totalsBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 6,
  },
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

  // Payment
  paymentBlock: { gap: 12 },
  paymentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentTopLeft: {
    flex: 1,
    gap: 8,
  },
  vatExemptCheckbox: {
    marginTop: 8,
  },
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
  changeBlock: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
  },
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
