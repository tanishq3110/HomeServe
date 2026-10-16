import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WalletPage from '../pages/WalletPage';
import { walletService } from '../services/api';

vi.mock('../services/api', () => ({
  walletService: {
    getWallet: vi.fn(),
    getTransactions: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'cust123', name: 'Wallet Tester', role: 'CUSTOMER' },
    isAuthenticated: true,
  }),
}));

describe('Frontend — Customer Wallet & Ledger Page Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders wallet balance, currency, and transaction items upon successful fetch', async () => {
    walletService.getWallet.mockResolvedValueOnce({
      success: true,
      data: {
        balancePaise: 125000,
        balanceRupees: '1250.00',
        currency: 'INR',
      },
    });

    walletService.getTransactions.mockResolvedValueOnce({
      success: true,
      data: {
        transactions: [
          {
            _id: 'tx1',
            type: 'CREDIT',
            amountPaise: 50000,
            balanceAfterPaise: 125000,
            status: 'COMPLETED',
            description: 'Promotional Welcome Credit',
            createdAt: new Date().toISOString(),
          },
          {
            _id: 'tx2',
            type: 'DEBIT',
            amountPaise: 25000,
            balanceAfterPaise: 75000,
            status: 'COMPLETED',
            description: 'Payment for AC Repair Service',
            createdAt: new Date().toISOString(),
          },
        ],
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
      },
    });

    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('₹1250.00')).toBeInTheDocument();
      expect(screen.getByText('Promotional Welcome Credit')).toBeInTheDocument();
      expect(screen.getByText('Payment for AC Repair Service')).toBeInTheDocument();
    });
  });

  it('renders empty transaction ledger state when customer has no past activity', async () => {
    walletService.getWallet.mockResolvedValueOnce({
      success: true,
      data: {
        balancePaise: 0,
        balanceRupees: '0.00',
        currency: 'INR',
      },
    });

    walletService.getTransactions.mockResolvedValueOnce({
      success: true,
      data: {
        transactions: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      },
    });

    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('₹0.00')).toBeInTheDocument();
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
    });
  });

  it('renders error state when wallet API request fails', async () => {
    walletService.getWallet.mockRejectedValueOnce(new Error('Network error: server unreachable'));
    walletService.getTransactions.mockRejectedValueOnce(new Error('Network error: server unreachable'));

    render(
      <MemoryRouter>
        <WalletPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/network error: server unreachable/i)).toBeInTheDocument();
    });
  });
});
