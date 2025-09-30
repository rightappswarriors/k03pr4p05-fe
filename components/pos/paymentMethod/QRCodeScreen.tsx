// QRCodeScreen.js
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useLocalSearchParams, useRouter } from "expo-router";


export default function QRCodeScreen() {

  const router = useRouter();
  const {
    qrString,
    walletName } = useLocalSearchParams();
  //const qrString = null
  const handleDone = () => {
    // ✅ Go back to previous screen
    router.back();
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {qrString &&
          (<>
            <Text style={styles.title}>Scan to Pay with {walletName || 'E-Wallet'}</Text>
            <Text style={styles.subtitle}>Please instruct the customer to scan the QR code using their E-Wallet app.</Text>
          </>
          )
        }
        <View style={styles.qrCodeWrapper}>
          {qrString ? (
            <QRCode
              value={Array.isArray(qrString) ? qrString[0] : qrString || ""}
              size={280}
              backgroundColor="white"
              color="black"
            />
          ) :
            <>
              <Text style={styles.title}>QR Code Unavailable</Text>
              <Text style={styles.errorText}>
                We couldn’t generate a QR code for this payment. Please try again or use another payment method.
              </Text>
            </>
          }
        </View>

        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
  },
  qrCodeWrapper: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
    marginBottom: 50,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
