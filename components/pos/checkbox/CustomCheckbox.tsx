import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";

interface CustomCheckboxProps {
  label?: string;
  checked: boolean;
  onPress: () => void;
  colors: any;
}

export const CustomCheckbox = ({ label, checked, onPress, colors }: CustomCheckboxProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[styles.button, { borderColor: checked ? colors.primary : colors.border }]}
  >
    <View
      style={[
        styles.box,
        {
          borderColor: checked ? colors.primary : colors.border,
          backgroundColor: checked ? colors.primary : colors.card,
        },
      ]}
    >
      {checked && <Check size={16} color="#fff" strokeWidth={3} />}
    </View>
    {label ? (
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    ) : null}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  box: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
});
