import { createContext, use, type ReactNode } from 'react';

import { type SettlementStatus } from '@/lib/api/endpoints/settlements';

export interface SettlementColumnsContextValue {
  hasWritePermission: boolean;
  hasManagePermission: boolean;
  onStatusChange: (settlementId: string, newStatus: SettlementStatus) => void;
  onNavigateToComments: (settlementId: string) => void;
  onNavigateToAssign: (settlementId: string) => void;
  isStatusUpdatePending: boolean;
}

const SettlementColumnsContext = createContext<SettlementColumnsContextValue | undefined>(
  undefined
);

interface SettlementColumnsProviderProps {
  children: ReactNode;
  value: SettlementColumnsContextValue;
}

/**
 * Provider for settlement columns context.
 * The value should be memoized by the parent component using useMemo.
 */
export function SettlementColumnsProvider({ children, value }: SettlementColumnsProviderProps) {
  return (
    <SettlementColumnsContext.Provider value={value}>{children}</SettlementColumnsContext.Provider>
  );
}

/**
 * Hook to access the full settlement columns context.
 */
export function useSettlementColumnsContext(): SettlementColumnsContextValue {
  const context = use(SettlementColumnsContext);
  if (context === undefined) {
    throw new Error('useSettlementColumnsContext must be used within a SettlementColumnsProvider');
  }
  return context;
}
