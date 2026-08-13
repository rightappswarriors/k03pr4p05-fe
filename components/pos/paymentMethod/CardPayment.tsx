// CardPayment.js
import { useTheme } from '@/contexts/ThemeContext';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';

export default function CardPayment() {
  const [useManualInput, setUseManualInput] = useState(false); // Toggle between terminal and manual

  // Manual Input State (for demonstration, **DO NOT USE THIS IN PRODUCTION WITHOUT TOKENIZATION**)
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');

  const handleTerminalPayment = () => {
    // --- IMPORTANT ---
    // This is where you would integrate with your hardware terminal SDK.
    // Example (Stripe Terminal):
    // const { discoverReaders, connectReader, collectPaymentMethod, processPayment } = useStripeTerminal();
    // await discoverReaders();
    // await connectReader(selectedReader);
    // const paymentIntent = await collectPaymentMethod(orderAmount);
    // await processPayment(paymentIntent);
    Alert.alert('Terminal Ready', 'Please swipe, tap, or insert card on the terminal.');
    // In a real app: Call the terminal SDK's functions
  };

  const handleManualPayment = () => {
    // --- IMPORTANT ---
    // In a real production app, you would use a secure tokenization library/SDK
    // (e.g., VGS Collect, Stripe Elements, Adyen Drop-in) here.
    // NEVER send raw card details directly to your backend or store them.
    if (!cardNumber || !expiryDate || !cvv || !cardHolderName) {
      Alert.alert('Input Required', 'Please fill in all card details.');
      return;
    }
    Alert.alert('Processing', 'Manually processing card payment. (In production, use secure tokenization!)');
    // In a real app: Tokenize card data and send the token to your backend
    // Your backend then uses the token to charge the card via your payment gateway
    //console.log({ cardNumber, expiryDate, cvv, cardHolderName });
  };
  const { colors} = useTheme()

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.toggleContainer, {backgroundColor: colors.card}]}>
        <TouchableOpacity
          style={[styles.toggleButton, !useManualInput && styles.toggleButtonActive]}
          onPress={() => setUseManualInput(false)}
        >
          <Text style={[styles.toggleButtonText, { color: colors.text}, !useManualInput && styles.toggleButtonTextActive]}>
            Use Payment Terminal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, useManualInput && styles.toggleButtonActive]}
          onPress={() => setUseManualInput(true)}
        >
          <Text style={[styles.toggleButtonText, { color: colors.text}, useManualInput && styles.toggleButtonTextActive]}>
            Manual Card Input
          </Text>
        </TouchableOpacity>
      </View>

      {!useManualInput ? (
        <View style={styles.terminalSection}>
          <Text style={[styles.terminalDescription, {color: colors.text}]}>
            Connect to a payment terminal via Bluetooth or USB to process card payments.
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleTerminalPayment}>
            <Text style={styles.buttonText}>Initiate Terminal Payment</Text>
          </TouchableOpacity>
          <Text style={[styles.disclaimer, {color: colors.textSecondary}]}>
            (Requires compatible hardware terminal and SDK integration)
          </Text>
        </View>
      ) : (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Card Number:</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            placeholder="XXXX XXXX XXXX XXXX"
            value={cardNumber}
            onChangeText={setCardNumber}
            maxLength={19} // Max length for card numbers including spaces
          />

          <View style={styles.rowInputs}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Expiry Date (MM/YY):</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="MM/YY"
                value={expiryDate}
                onChangeText={setExpiryDate}
                maxLength={5}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>CVV:</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="XXX"
                value={cvv}
                onChangeText={setCvv}
                maxLength={4}
                secureTextEntry // Hide CVV input
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Cardholder Name:</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Cardholder Name"
            value={cardHolderName}
            onChangeText={setCardHolderName}
          />

          <TouchableOpacity style={styles.actionButton} onPress={handleManualPayment}>
            <Text style={styles.buttonText}>Process Manual Payment</Text>
          </TouchableOpacity>
          <Text style={styles.securityWarning}>
            WARNING: Manual input requires strict PCI DSS compliance. Use a secure tokenization solution in production.
          </Text>
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
  toggleContainer: {
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
    color: '#555555',
  },
  toggleButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  terminalSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  terminalDescription: {
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
    marginBottom: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginTop: 10,
  },
  inputSection: {
    paddingVertical: 10,
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
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  halfInput: {
    width: '48%',
  },
  securityWarning: {
    fontSize: 13,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 15,
    fontWeight: 'bold',
  },
});
