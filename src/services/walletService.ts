import type { UserProfile } from '../types';
import { formatIdr, formatWalletBalance } from '../utils/currency';
import { supabase } from './supabase';

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

export function getWalletBalance(profile: UserProfile | null): number {
  return Number(profile?.wallet_balance ?? 0);
}

/** @deprecated Use getWalletBalance for payments; mock top-ups are demo-only on Wallet page */
export function getDisplayBalance(profile: UserProfile | null): number {
  const base = getWalletBalance(profile);
  const mockTotal = getMockTransactions().reduce((sum, t) => sum + t.amount, 0);
  return base + mockTotal;
}

export function assertSufficientBalance(balance: number, cost: number): void {
  if (cost <= 0) {
    return;
  }

  if (balance < cost) {
    throw new Error(
      `Insufficient wallet balance. You have ${formatWalletBalance(balance)} but need ${formatWalletBalance(cost)}.`,
    );
  }
}

export async function deductWalletBalance(userId: string, amount: number): Promise<number> {
  if (amount <= 0) {
    const { data, error } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw error;
    }

    return Number(data.wallet_balance ?? 0);
  }

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('wallet_balance')
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const current = Number(user.wallet_balance ?? 0);
  assertSufficientBalance(current, amount);

  const newBalance = current - amount;
  const { error: updateError } = await supabase
    .from('users')
    .update({ wallet_balance: newBalance })
    .eq('user_id', userId);

  if (updateError) {
    throw updateError;
  }

  return newBalance;
}

export async function refundWalletBalance(userId: string, amount: number): Promise<number> {
  if (amount <= 0) {
    const { data, error } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return Number(data.wallet_balance ?? 0);
  }

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('wallet_balance')
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const current = Number(user.wallet_balance ?? 0);
  const newBalance = current + amount;

  const { error: updateError } = await supabase
    .from('users')
    .update({ wallet_balance: newBalance })
    .eq('user_id', userId);

  if (updateError) {
    throw updateError;
  }

  return newBalance;
}

export interface MockEarningsSummary {
  available: number;
  pending: number;
  lifetime: number;
}

export function getMockEarnings(): MockEarningsSummary {
  return {
    available: 248_000,
    pending: 75_000,
    lifetime: 1_240_000,
  };
}

export function requestMockWithdrawal(amount: number): { success: boolean; message: string } {
  if (amount <= 0) {
    return { success: false, message: 'Enter a valid withdrawal amount.' };
  }
  return {
    success: true,
    message: `Mock withdrawal of ${formatIdr(amount)} submitted. Funds typically arrive in 3–5 business days (demo only).`,
  };
}
