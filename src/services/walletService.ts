import type { UserProfile } from '../types';

const MOCK_TRANSACTIONS_KEY = 'plti_mock_wallet_tx';

export interface MockWalletTransaction {
  id: string;
  label: string;
  amount: number;
  created_at: string;
}

export function getMockTransactions(): MockWalletTransaction[] {
  try {
    const raw = localStorage.getItem(MOCK_TRANSACTIONS_KEY);
    return raw ? (JSON.parse(raw) as MockWalletTransaction[]) : [];
  } catch {
    return [];
  }
}

function saveMockTransactions(transactions: MockWalletTransaction[]): void {
  localStorage.setItem(MOCK_TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export function addMockTopUp(amount: number): MockWalletTransaction[] {
  const transactions = getMockTransactions();
  const entry: MockWalletTransaction = {
    id: crypto.randomUUID(),
    label: 'Mock top-up',
    amount,
    created_at: new Date().toISOString(),
  };
  const updated = [entry, ...transactions];
  saveMockTransactions(updated);
  return updated;
}

export function getDisplayBalance(profile: UserProfile | null): number {
  const base = Number(profile?.wallet_balance ?? 0);
  const mockTotal = getMockTransactions().reduce((sum, t) => sum + t.amount, 0);
  return base + mockTotal;
}

export interface MockEarningsSummary {
  available: number;
  pending: number;
  lifetime: number;
}

export function getMockEarnings(): MockEarningsSummary {
  return {
    available: 248.5,
    pending: 75.0,
    lifetime: 1240.0,
  };
}

export function requestMockWithdrawal(amount: number): { success: boolean; message: string } {
  if (amount <= 0) {
    return { success: false, message: 'Enter a valid withdrawal amount.' };
  }
  return {
    success: true,
    message: `Mock withdrawal of $${amount.toFixed(2)} submitted. Funds typically arrive in 3–5 business days (demo only).`,
  };
}
