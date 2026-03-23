import React from 'react';
import ERPLayout from '@/components/erp/ERPLayout';
import { MasterFileProvider } from '@/contexts/MasterFileContext';

export default function LayoutScreen() {
  return (
    <MasterFileProvider>
      <ERPLayout />
    </MasterFileProvider>
  );
}
