import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Search,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  User,
  History,
  Lock,
} from 'lucide-react';
import { walletService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState([]);
  const [stats, setStats] = useState({ totalWallets: 0, totalLiabilityRupees: '0.00' });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal state for Adjust Balance
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [adjustType, setAdjustType] = useState('CREDIT');
  const [adjustAmountRupees, setAdjustAmountRupees] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Drawer / History state for customer audit ledger
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const fetchWallets = useCallback(async (page = 1, search = searchQuery) => {
    try {
      setError('');
      const res = await walletService.adminGetAllWallets({ page, limit: 10, search });
      if (res.success) {
        setWallets(res.data.wallets || []);
        setStats(res.data.stats || { totalWallets: 0, totalLiabilityRupees: '0.00' });
        setPagination(res.data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
      }
    } catch (err) {
      console.error('[AdminWalletsPage] Fetch error:', err);
      setError(err.message || 'Failed to load customer wallets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchWallets(1);
  }, [fetchWallets]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchWallets(1, searchQuery);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWallets(pagination.page, searchQuery);
  };

  const handleOpenAdjust = (wallet) => {
    setSelectedWallet(wallet);
    setAdjustType('CREDIT');
    setAdjustAmountRupees('');
    setAdjustReason('');
    setAdjustError('');
  };

  const handleCloseAdjust = () => {
    setSelectedWallet(null);
    setAdjustError('');
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setAdjustError('');
    const numRupees = parseFloat(adjustAmountRupees);
    if (isNaN(numRupees) || numRupees <= 0) {
      setAdjustError('Please enter a valid positive rupee amount.');
      return;
    }
    const amountPaise = Math.round(numRupees * 100);

    if (!adjustReason || adjustReason.trim().length < 10) {
      setAdjustError('Reason is required for audit and must be at least 10 characters.');
      return;
    }

    setAdjustSubmitting(true);
    try {
      const res = await walletService.adminAdjustBalance(selectedWallet.owner?._id, {
        type: adjustType,
        amountPaise,
        reason: adjustReason.trim(),
      });

      if (res.success) {
        setSuccessMessage(res.message || `Successfully adjusted balance by ₹${numRupees.toFixed(2)}.`);
        handleCloseAdjust();
        fetchWallets(pagination.page, searchQuery);
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      console.error('[AdminWalletsPage] Adjust error:', err);
      setAdjustError(err.message || 'Balance adjustment failed.');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleViewLedger = async (wallet) => {
    setLedgerCustomer(wallet);
    setLedgerLoading(true);
    try {
      const res = await walletService.adminGetTransactions(wallet.owner?._id, { limit: 20 });
      if (res.success) {
        setLedgerTransactions(res.data.transactions || []);
      }
    } catch (err) {
      console.error('[AdminWalletsPage] Ledger error:', err);
    } finally {
      setLedgerLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading customer wallets & platform liability..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24">
      {/* ── Header ── */}
      <div className="bg-dark-hero text-white px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-orange-400 border border-white/10">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin Controls
                </span>
                <span className="text-xs text-slate-400 font-medium">Phase 14 Ledger</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Customer Wallets & Ledger
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Oversee platform liability, inspect individual ledgers, and execute audited adjustments.
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl border border-white/10 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8">
        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500 text-white flex items-center justify-between shadow-lg shadow-emerald-500/20">
            <div className="flex items-center gap-2.5 text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="p-1 hover:bg-emerald-600 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── KPI Liability Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FF5A1F]/10 text-[#FF5A1F] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Total System Liability
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-0.5">
                ₹{stats.totalLiabilityRupees}
              </p>
              <span className="text-[11px] text-slate-500 font-medium">All active customer balances</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Active Customer Wallets
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-0.5">
                {stats.totalWallets}
              </p>
              <span className="text-[11px] text-slate-500 font-medium">Initialized in system</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Ledger Security
              </p>
              <p className="text-lg font-black text-slate-900 mt-1">
                Atomic Conditional
              </p>
              <span className="text-[11px] text-slate-500 font-medium">Unique idempotency indices</span>
            </div>
          </div>
        </div>

        {/* ── Wallets Table Card ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Registered Customer Wallets</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select any customer to adjust balance or inspect transactions.</p>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or email..."
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F] w-56 sm:w-64"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>

          {/* Table */}
          {wallets.length === 0 ? (
            <div className="py-16 text-center">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No customer wallets found</p>
              <p className="text-xs text-slate-400 mt-1">Try another search or refresh.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Current Balance</th>
                    <th className="py-4 px-6">Last Updated</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {wallets.map((w) => (
                    <tr key={w.walletId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-slate-900 text-sm">{w.owner?.name || 'Customer'}</div>
                        <div className="text-slate-400 text-xs">{w.owner?.email}</div>
                        {w.owner?.phone && (
                          <div className="text-[11px] text-slate-400">{w.owner?.phone}</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-base font-extrabold text-slate-900">
                          ₹{w.balanceRupees}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1.5 uppercase font-semibold">
                          {w.currency}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500">
                        {w.updatedAt
                          ? new Date(w.updatedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewLedger(w)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            Ledger
                          </button>
                          <button
                            onClick={() => handleOpenAdjust(w)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                          >
                            Adjust Balance
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} wallets)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchWallets(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchWallets(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Adjust Balance Modal ── */}
      {selectedWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF5A1F] flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Adjust Customer Balance</h3>
                  <p className="text-xs text-slate-400">{selectedWallet.owner?.name}</p>
                </div>
              </div>
              <button onClick={handleCloseAdjust} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="mt-5 space-y-4">
              {adjustError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{adjustError}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Current Balance:</span>
                <span className="font-mono font-bold text-slate-900">₹{selectedWallet.balanceRupees}</span>
              </div>

              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('CREDIT')}
                    className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      adjustType === 'CREDIT'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" /> Credit Funds
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('DEBIT')}
                    className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      adjustType === 'DEBIT'
                        ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" /> Debit Funds
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Amount (₹ Rupees)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 500.00"
                    value={adjustAmountRupees}
                    onChange={(e) => setAdjustAmountRupees(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Audit Reason (Mandatory, min 10 chars)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Document reason for balance adjustment for platform audit..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleCloseAdjust}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white text-xs font-bold transition shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {adjustSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Customer Ledger Drawer / Modal ── */}
      {ledgerCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full h-[90vh] p-6 shadow-2xl border border-slate-200 flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Customer Audit Ledger</h3>
                <p className="text-xs text-slate-500">{ledgerCustomer.owner?.name} ({ledgerCustomer.owner?.email})</p>
              </div>
              <button onClick={() => setLedgerCustomer(null)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {ledgerLoading ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner size="md" message="Loading transaction audit trail..." />
                </div>
              ) : ledgerTransactions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No transaction records recorded for this customer yet.
                </div>
              ) : (
                ledgerTransactions.map((tx) => (
                  <div key={tx._id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        tx.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-800' :
                        tx.type === 'REFUND' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tx.type}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-slate-900">
                        {tx.type === 'DEBIT' ? '-' : '+'}₹{(tx.amountPaise / 100).toFixed(2)}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800">{tx.description}</p>

                    {tx.adminReason && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                        <span className="font-bold">Admin Note:</span> {tx.adminReason}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                      <span>Post-Balance: ₹{(tx.balanceAfterPaise / 100).toFixed(2)}</span>
                      <span>{new Date(tx.createdAt).toLocaleString('en-IN')}</span>
                    </div>

                    <div className="text-[9px] font-mono text-slate-400 truncate">
                      Key: {tx.idempotencyKey}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={() => setLedgerCustomer(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
