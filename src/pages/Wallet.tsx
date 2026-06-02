import { useState } from 'react';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import {
  addMockTopUp,
  getDisplayBalance,
  getMockTransactions,
  type MockWalletTransaction,
} from '../services/walletService';
import shared from '../styles/shared.module.css';

export function Wallet() {
  const { profile } = useApp();
  const [transactions, setTransactions] = useState<MockWalletTransaction[]>(
    getMockTransactions,
  );
  const [topUpAmount, setTopUpAmount] = useState('25');
  const balance = getDisplayBalance(profile);

  const handleTopUp = () => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) return;
    setTransactions(addMockTopUp(amount));
  };

  return (
    <AppLayout>
      <h1 className={shared.pageTitle}>Wallet</h1>
      <p className={shared.pageSubtitle}>
        Mock wallet for demo payments. No real charges are processed.
      </p>

      <div className={shared.card} style={{ padding: 24, marginBottom: 24, maxWidth: 480 }}>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Available balance</p>
        <p style={{ fontSize: 40, fontWeight: 900, margin: '8px 0 20px' }}>
          ${balance.toFixed(2)}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            className={shared.input}
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
            min={1}
          />
          <button type="button" className={shared.btnPrimary} onClick={handleTopUp}>
            Mock Top-up
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Mock transactions</h2>
      {transactions.length === 0 ? (
        <p className={shared.empty}>No mock transactions yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {transactions.map((t) => (
            <li
              key={t.id}
              className={shared.card}
              style={{
                padding: 12,
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{t.label}</span>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>
                +${t.amount.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
