// DiscountRadio.tsx
import React from "react";
import { View, Text } from "react-native";
import { RadioButton } from "react-native-paper";
import { useTheme } from "@/contexts/ThemeContext";
import { DiscountType } from "@/types";

interface DiscountRadioProps {
  label: string;
  value: DiscountType;
  disabled: boolean;
}

export const DiscountRadio: React.FC<DiscountRadioProps> = ({ label, value, disabled }) => {
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center flex">
      <RadioButton value={value} disabled={disabled} />
      <Text style={{ color: disabled ? colors.textSecondary : colors.text }}>{label}</Text>
    </View>
  );
};
