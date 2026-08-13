// components/erp/ValidatedInput.tsx
// TextInput with inline error display and red border on invalid state.
// Use this everywhere instead of raw TextInput in modals.

import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';

interface Props extends TextInputProps {
  label:    string;
  error?:   string;
  colors:   any;
  required?: boolean;
}

export function ValidatedInput({ label, error, colors, required, style, ...rest }: Props) {
  const hasError = !!error;
  return (
    <View style={{ marginBottom: hasError ? 4 : 14 }}>
      <Text style={{
        fontSize: 11, fontWeight: '700', color: colors.textSecondary,
        letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase',
      }}>
        {label}{required ? ' *' : ''}
      </Text>
      <TextInput
        style={[{
          borderWidth: 1,
          borderColor: hasError ? colors.error : colors.border,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 11,
          fontSize: 14,
          color: colors.text,
          backgroundColor: colors.background,
        }, style]}
        placeholderTextColor={colors.textSecondary}
        {...rest}
      />
      {hasError && (
        <Text style={{ fontSize: 11, color: colors.error, marginTop: 4, marginBottom: 10 }}>
          {error}
        </Text>
      )}
    </View>
  );
}