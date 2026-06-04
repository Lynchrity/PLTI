import { useState } from 'react';
import { AppLayout } from '../components/AppLayout/AppLayout';
import {
  getMockEarnings,
  requestMockWithdrawal,
} from '../services/walletService';
import shared from '../styles/shared.module.css';

export function Earnings() {
  const earnings = getMockEarnings();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [message, setMessage] = useState('');

  const handleWithdraw = () => {
    const result = requestMockWithdrawal(Number(withdrawAmount));
    setMessage(result.message);
  };

  return (
    <AppLayout>
      <h1 className={shared.pageTitle}>Earnings</h1>
      <p className={shared.pageSubtitle}>Mock tutor earnings and withdrawal (demo only).</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div className={shared.card} style={{ padding: 20 }}>
          <p className={shared.empty} style={{ margin: 0 }}>Available</p>
          <p style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 0' }}>
            ${earnings.available.toFixed(2)}
          </p>
        </div>
        <div className={shared.card} style={{ padding: 20 }}>
          <p className={shared.empty} style={{ margin: 0 }}>Pending</p>
          <p style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 0' }}>
            ${earnings.pending.toFixed(2)}
          </p>
        </div>
        <div className={shared.card} style={{ padding: 20 }}>
          <p className={shared.empty} style={{ margin: 0 }}>Lifetime</p>
          <p style={{ fontSize: 28, fontWeight: 800, margin: '8px 0 0' }}>
            ${earnings.lifetime.toFixed(2)}
          </p>
        </div>
      </div>

      <div className={shared.card} style={{ padding: 24, maxWidth: 420 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Withdraw funds</h2>
        <div className={shared.formGroup}>
          <label className={shared.label}>Amount (USD)</label>
          <input
            type="number"
            className={shared.input}
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="0.00"
            min={0}
            step="0.01"
          />
        </div>
        <button type="button" className={shared.btnPrimary} onClick={handleWithdraw}>
          Request Withdrawal
        </button>
        {message && (
          <p style={{ marginTop: 12, fontSize: 14, color: 'var(--color-text-muted)' }}>
            {message}
          </p>
        )}
      </div>
    </AppLayout>
  );
}
