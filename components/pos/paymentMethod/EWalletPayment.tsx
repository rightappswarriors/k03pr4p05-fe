// @/components/pos/paymentMethod/EWalletPayment.js
import React, { useState } from 'react';
import { View, Modal, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { usePOS } from "@/contexts/POSContext"
import { useRouter } from "expo-router";
import { ReceiptService } from '@/services/paymentService';
import { useDisplay } from '@/contexts/DisplayContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function EWalletPayment() {
  const router = useRouter();
  const {
    cartItems: items,
    clearCart,
    outlet
  } = usePOS()
  const { user } = useAuth();

  const { hasSecondScreen } = useDisplay();
  const [selectedWallet, setSelectedWallet] = useState('PH_GCASH'); // Default
  const [useQR, setUseQR] = useState(true); // Toggle between QR and Phone Number
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false)
  const { colors } = useTheme();
  // Function to simulate API call for QR generation
  const getQrStringFromXendit = async (channelCode: any) => {
    // --- IMPORTANT ---
    // In a real application, this API call should go to your *backend server*
    // Your backend would then call Xendit with your secret key.
    // Exposing Xendit secret keys in the frontend is a MAJOR security risk.
    // For this example, we'll simulate a delayed response.
    if (__DEV__) console.log(`Requesting QR for ${channelCode}`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
    // Simulate a successful QR string response
    return `https://qr.xendit.co/qr_code/dynamic?qr_id=some_generated_id_for_${channelCode}`;
  };

  const handleGenerateQR = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const qrString = await getQrStringFromXendit(selectedWallet);

      if (qrString) {
        if (hasSecondScreen) {
          // Send QR to customer screen
          router.push({
            pathname: "/customer/QRCodeScreen",
            params: {
              qrString,
              walletName: selectedWallet === "PH_GCASH" ? "GCash" : "PayMaya",
            },
          });
        } else {
          // Show QR on cashier screen
          router.push({
            pathname: "/payment/QRCodeScreen",
            params: {
              qrString,
              walletName: selectedWallet === "PH_GCASH" ? "GCash" : "PayMaya",
            },
          });
        }
      } else {
        Alert.alert("Error", "Failed to generate QR code. Please try again.");
      }
    } catch (error) {
      if (__DEV__) console.error("QR Generation Error:", error);
      Alert.alert("Error", "An error occurred during QR generation.");
    } finally {
      setIsLoading(false);
    }
  };


  const handleProcessPhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Input Required', 'Please enter the customer\'s phone number.');
      return;
    }
    // Logic to process payment via phone number (e.g., initiate a push payment to the e-wallet)
    Alert.alert('Payment Processed', `Initiating ${selectedWallet} payment for ${phoneNumber}`);
    if (!user || !outlet) return;

    const handlePrintReceipt = () => {
      setIsProcessing(true);
      ReceiptService.processAndPrintReceipt({
        items,
        user,
        outlet,
        paymentMethod: "DIGITAL",
        discountOption: "NONE",
        onSuccess: () => {
          setIsProcessing(false);
          clearCart();
        },
        onFail: () => setIsProcessing(false),
      });

      handlePrintReceipt()
    };
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Select E-Wallet:</Text>
      <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={[styles.selectorText, { color: colors.text }]}>
            {selectedWallet === "PH_GCASH" ? "GCash" : "PayMaya"}
          </Text>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.textSecondary }]}>Choose Wallet</Text>

              <TouchableOpacity

                style={[styles.option, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSelectedWallet("PH_GCASH");
                  setModalVisible(false);
                }}
              >
                <Text style={[styles.optionText, { color: colors.textSecondary }]}>GCash</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.option, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSelectedWallet("PH_PAYMAYA");
                  setModalVisible(false);
                }}
              >
                <Text style={[styles.optionText, { color: colors.textSecondary }]}>PayMaya</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.closeText, { color: colors.error }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>

      <View style={styles.qrToggleContainer}>
        <TouchableOpacity
          style={[{ backgroundColor: colors.card }, styles.toggleButton, useQR && styles.toggleButtonActive]}
          onPress={() => setUseQR(true)}
        >
          <Text style={[{ color: colors.text }, styles.toggleButtonText, useQR && styles.toggleButtonTextActive]}>Pay via QR Code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[{ backgroundColor: colors.card }, styles.toggleButton, !useQR && styles.toggleButtonActive]}
          onPress={() => setUseQR(false)}
        >
          <Text style={[{ color: colors.text }, styles.toggleButtonText, !useQR && styles.toggleButtonTextActive]}>Enter Phone Number</Text>
        </TouchableOpacity>
      </View>

      {useQR ? (
        <View style={styles.qrSection}>
          <Text style={[styles.qrDescription, { color: colors.textSecondary }]}>
            Tap "Generate QR" to create a dynamic QR code for the customer to scan.
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleGenerateQR}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Generate QR Code</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Customer Phone Number:</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="phone-pad"
            placeholder="e.g., 09171234567"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleProcessPhoneNumber}
          >
            <Text style={styles.buttonText}>Proceed with Payment</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
  },
  selectorButton: {
    padding: 12,
    alignItems: "center",
  },
  selectorText: {
    fontSize: 16,
    color: "#333",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  optionText: {
    fontSize: 16,
  },
  closeButton: {
    marginTop: 15,
    alignItems: "center",
  },
  closeText: {
    fontSize: 16,
    color: "red",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 20,
    height: 50,
    justifyContent: 'center'
  },
  qrToggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007bff',
  },
  toggleButtonText: {
    fontSize: 15,
  },
  toggleButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555555',
  },
  actionButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputSection: {
    paddingVertical: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
});
function onOrderPlaced() {
  throw new Error('Function not implemented.');
}

