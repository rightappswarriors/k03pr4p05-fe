import React from "react";
import { TouchableOpacity, View, Text } from "react-native";
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
    activeOpacity={0.8}
    className="flex-row items-center gap-2"
  >
    <View
      className="w-6 h-6 rounded-md border items-center justify-center"
      style={{
        borderColor: checked ? colors.primary : colors.border,
        backgroundColor: checked ? colors.primary : "transparent",
      }}
    >
      {checked && <Check size={16} color="#fff" strokeWidth={3} />}
    </View>
    {label && (
      <Text className="text-base" style={{ color: colors.text }}>
        {label}
      </Text>
    )}
  </TouchableOpacity>
);
