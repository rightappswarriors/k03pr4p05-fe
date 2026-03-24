// contexts/SubscriptionContext.tsx
// Fixed: canAddBranch / canAddOutlet check >= not <
// Basic: 1 branch, 3 outlets. Gold: unlimited.

import React, { createContext, useContext, useState } from 'react';

export type SubscriptionPlan = 'basic' | 'gold';

interface SubscriptionLimits {
  maxBranches: number;
  maxOutlets: number;
  canAccessHR: boolean;
  canAccessFinance: boolean;
  canAccessAnalytics: boolean;
  canAccessMasterFile: boolean;
  canExport: boolean;
  canAccessExpenseSummary: boolean;
  canAccessItemNetSummary: boolean;
}

const PLAN_LIMITS: Record<SubscriptionPlan, SubscriptionLimits> = {
  basic: {
    maxBranches: 1,
    maxOutlets: 3,
    canAccessHR: false,
    canAccessFinance: false,
    canAccessAnalytics: false,
    canAccessMasterFile: false,
    canExport: false,
    canAccessExpenseSummary: false,
    canAccessItemNetSummary: true,
  },
  gold: {
    maxBranches: Infinity,
    maxOutlets: Infinity,
    canAccessHR: true,
    canAccessFinance: true,
    canAccessAnalytics: true,
    canAccessMasterFile: true,
    canExport: true,
    canAccessExpenseSummary: true,
    canAccessItemNetSummary: true,
  },
};

interface SubscriptionContextType {
  plan: SubscriptionPlan;
  limits: SubscriptionLimits;
  setPlan: (plan: SubscriptionPlan) => void;
  // FIX: returns true if user CAN add (currentCount < max)
  canAddBranch: (currentCount: number) => boolean;
  canAddOutlet: (currentCount: number) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined,
);

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default to 'basic' — set to 'gold' once backend confirms the user's plan.
  // In production: read from JWT payload or user profile API on login.
  // To test Gold features during dev: change 'basic' → 'gold' here temporarily.
  const [plan, setPlan] = useState<SubscriptionPlan>('basic');
  const limits = PLAN_LIMITS[plan];

  // FIX: was using < but maxBranches is 1, so 1 < 1 = false correctly
  // The real bug was that branches.length was stale. Now we pass the
  // *current* count explicitly so it's always fresh.
  const canAddBranch = (currentCount: number) =>
    limits.maxBranches === Infinity || currentCount < limits.maxBranches;

  const canAddOutlet = (currentCount: number) =>
    limits.maxOutlets === Infinity || currentCount < limits.maxOutlets;

  return (
    <SubscriptionContext.Provider
      value={{ plan, limits, setPlan, canAddBranch, canAddOutlet }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx)
    throw new Error('useSubscription must be inside SubscriptionProvider');
  return ctx;
}
