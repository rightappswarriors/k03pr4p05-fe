import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';

// Mocked hooks for a self-contained example.
// Replace these with your actual `useTheme` and `useResponsive` hooks.
const useTheme = () => ({
  colors: {
    card: '#fff',
    text: '#000',
    primary: 'blue',
    background: '#f0f0f0',
  }
});

const useResponsive = () => ({ isMobile: true });

export default function FloatingBadge() {
  const [showDialog, setShowDialog] = useState(false);
  const [isPressing, setIsPressing] = useState(false);

  const { colors } = useTheme();
  const { isMobile } = useResponsive();

  useEffect(() => {
    console.log('showDialog state:', showDialog);
  }, [showDialog]);

  const handlePress = useCallback(() => {
    setShowDialog(prevShowDialog => !prevShowDialog);
  }, []);

  const handlePressIn = () => {
    setIsPressing(true);
  };
  
  const handlePressOut = () => {
    setIsPressing(false);
  };

  const shadowStyle = Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    android: {
      elevation: 5,
    },
  });

  return (
    // The main container now just takes up the space of its children.
    // We'll use absolute positioning directly on the child elements.
    <View style={styles.badgeContainer}>
      {/* Conditional rendering for the dialog box */}
      {showDialog && (
        <View style={[styles.dialogBox, { backgroundColor: colors.card }, isMobile && { bottom: 125 }, shadowStyle]}>
          <Text style={[styles.dialogText, { color: colors.text }]}>Contact rightapps@gmail.com</Text>
          <Text style={[styles.dialogText, { color: colors.text }]}>
            Upgrade to the <Text style={[styles.link, { color: colors.primary }]}>Pro plan</Text> to Activate pro features.
          </Text>
        </View>
      )}

      {/* The button that triggers the dialog box */}
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.6}
        style={[
          styles.floatingButton,
          { backgroundColor: colors.background, opacity: isPressing ? 0.8 : 1 },
          isMobile && { bottom: 105 },
          shadowStyle
        ]}
      >
        <Text style={[styles.badgeText, { color: colors.text }]}>Powered by Right Apps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // This container is now responsible for just holding the absolute elements.
  // It no longer fills the whole screen, which prevents it from blocking touches.
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 20,
    zIndex: 1000,
  },
  dialogBox: {
    position: 'absolute',
    right: 0,
    bottom: 60, // Position it relative to the button
    width: 250,
    borderRadius: 10,
    padding: 15,
    zIndex: 999, // Lower zIndex than the button, but still on top of other content
  },
  dialogText: {
    fontSize: 14,
    marginBottom: 5,
  },
  link: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  floatingButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    zIndex: 1000, // Make sure the button is on top
  },
  badgeText: {
    fontSize: 12,
  },
});
