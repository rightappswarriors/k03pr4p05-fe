import React from 'react';
import { Platform, View, ViewStyle } from 'react-native';

type RootViewProps = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
};

export default function RootView({ children, style }: RootViewProps) {
  // Using View in both web and native removes react-native-gesture-handler dependency
  return <View style={style}>{children}</View>;
}
