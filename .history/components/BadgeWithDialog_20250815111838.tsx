import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

const BadgeWithDialog = () => {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <View style={styles.container}>
      {showDialog && (
        <View style={styles.dialogBox}>
          <Text style={styles.dialogText}>This badge will be visible when you publish the site.</Text>
          <Text style={styles.dialogText}>Upgrade to the <Text style={styles.link}>Pro plan</Text> to remove it.</Text>
        </View>
      )}
      <Pressable
        onPressIn={() => setShowDialog(true)}
        onPressOut={() => setShowDialog(false)}
        style={styles.badgePressable}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>b</Text>
          <Text style={styles.badgeText}>Made in Bolt</Text>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBox: {
    position: 'absolute', // Position the dialog above the badge
    bottom: 60, // Adjust this value to position it correctly
    width: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    // Add a shadow and border for a tooltip effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  dialogText: {
    fontSize: 12,
    marginBottom: 4,
  },
  link: {
    color: '#007AFF', // A standard blue for links
    textDecorationLine: 'underline',
  },
  badgePressable: {
    // This allows the pressable area to be the size of the badge
    // without taking up the whole screen.
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeText: {
    fontSize: 14,
    marginLeft: 4,
  },
});

export default BadgeWithDialog;