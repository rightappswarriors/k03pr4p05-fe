// contexts/SubscriptionContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
  canAccessRestockScheduling: boolean;
}

// ─── PRODUCTION NOTE ─────────────────────────────────────────────────────────
// All features are currently unlocked (open beta / single-tier launch).
// Finance and RestockScheduling are hidden in the UI via ERPLayout (not here).
//
// TO RESTORE GATING when subscription tiers go live:
//   1. Replace PLAN_LIMITS below with the commented-out version underneath it.
//   2. In ERPLayout.tsx, restore Finance and RestockScheduling inside GATED_NAV.
//   3. Remove PlanToggleFAB from the header in ERPLayout.tsx.
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<SubscriptionPlan, SubscriptionLimits> = {
  basic: {
    maxBranches: Infinity,   // RESTORE TO: 1
    maxOutlets: Infinity,    // RESTORE TO: 3
    canAccessHR: true,               // RESTORE TO: false
    canAccessFinance: true,          // RESTORE TO: false  (also hidden in UI)
    canAccessAnalytics: true,        // RESTORE TO: false
    canAccessMasterFile: true,       // RESTORE TO: false
    canExport: true,                 // RESTORE TO: false
    canAccessExpenseSummary: true,   // RESTORE TO: false
    canAccessItemNetSummary: true,
    canAccessRestockScheduling: true, // RESTORE TO: false (also hidden in UI)
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
    canAccessRestockScheduling: true,
  },
};

// ─── RESTORE: Gated limits (uncomment when tiers go live) ────────────────────
// const PLAN_LIMITS: Record<SubscriptionPlan, SubscriptionLimits> = {
//   basic: {
//     maxBranches: 1,
//     maxOutlets: 3,
//     canAccessHR: false,
//     canAccessFinance: false,
//     canAccessAnalytics: false,
//     canAccessMasterFile: false,
//     canExport: false,
//     canAccessExpenseSummary: false,
//     canAccessItemNetSummary: true,
//     canAccessRestockScheduling: false,
//   },
//   gold: {
//     maxBranches: Infinity,
//     maxOutlets: Infinity,
//     canAccessHR: true,
//     canAccessFinance: true,
//     canAccessAnalytics: true,
//     canAccessMasterFile: true,
//     canExport: true,
//     canAccessExpenseSummary: true,
//     canAccessItemNetSummary: true,
//     canAccessRestockScheduling: true,
//   },
// };
// ─────────────────────────────────────────────────────────────────────────────

interface SubscriptionContextType {
  plan: SubscriptionPlan;
  limits: SubscriptionLimits;
  setPlan: (plan: SubscriptionPlan) => void;
  canAddBranch: (currentCount: number) => boolean;
  canAddOutlet: (currentCount: number) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined,
);

// ─── Helper: map org subscription tier string → SubscriptionPlan ─────────────
// Adjust the string values to match whatever your API returns in
// user.org.subscription.tier (e.g. 'GOLD', 'gold', 'premium', etc.)
function resolvePlan(user: any): SubscriptionPlan {
  const tier = user?.org?.subscription?.tier;
  if (!tier) return 'basic';
  return tier.toLowerCase() === 'gold' ? 'gold' : 'basic';
}

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── FIX: seed plan from the authenticated user's org subscription ───────────
  // Previously this was hardcoded to 'basic', which meant every fresh session
  // (including STAFF logins) started locked regardless of the org's real tier.
  // Now we read user.org.subscription.tier on mount and whenever user changes.
  const { user } = useAuth();
  const [plan, setPlanState] = useState<SubscriptionPlan>(() => resolvePlan(user));

  useEffect(() => {
    // Re-sync if user loads async (common — AuthContext fetches profile after mount)
    const resolved = resolvePlan(user);
    setPlanState(resolved);
  }, [user?.org?.subscription?.tier]);

  // DEV FAB override — keeps setPlan working for the plan toggle button
  const setPlan = (p: SubscriptionPlan) => setPlanState(p);

  const limits = PLAN_LIMITS[plan];

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