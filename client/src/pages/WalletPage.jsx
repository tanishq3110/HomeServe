import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { walletService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import MobileBottomNav from '../components/common/MobileBottomNav';

const TRANSACTION_ICONS = {
  CREDIT: { icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10', sign: '+', textCol: 'text-emerald-600' },
  DEBIT: { icon: ArrowUpRight, color: 'text-rose-500', bg: 'bg-rose-500/10', sign: '-', textCol: 'text-rose-600' },
  REFUND: { icon: RotateCcw, color: 'text-blue-500', bg: 'bg-blue-500/10', sign: '+', textCol: 'text-blue-600' },
};

export default function WalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const fetchWalletData = useCallback(async (page = 1) => {
    try {
      setError('');
      const [walletRes, txRes] = await Promise.all([
        walletService.getWallet(),
        walletService.getTransactions({ page, limit: 10 }),
      ]);

      if (walletRes.success) {
        setWallet(walletRes.data);
      }
      if (txRes.success) {
        setTransactions(txRes.data.transactions || []);
        setPagination(txRes.data.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
      }
    } catch (err) {
      console.error('[WalletPage] Error loading wallet:', err);
      setError(err.message || 'Failed to load wallet information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData(1);
  }, [fetchWalletData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletData(pagination.page);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchWalletData(newPage);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter === 'ALL') return true;
    return tx.type === typeFilter;
  });

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading your secure wallet..." />
      </div>
    );
  }

  if (error && !wallet) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <ErrorState
          title="Wallet Unavailable"
          message={error}
          actionLabel="Try Again"
          onAction={() => fetchWalletData(1)}
        />
      </div>
    );
  }

  const balancePaise = wallet?.balancePaise || 0;
  const balanceRupees = (balancePaise / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-24">
      {/* ── Header ── */}
      <div className="bg-dark-hero text-white px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-orange-400 border border-white/10">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Internal Ledger System
                </span>
                <span className="text-xs text-slate-400 font-medium">Phase 14</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                My Wallet
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Seamless internal payments and instant booking refunds.
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8">
        {/* ── Main Balance Card ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 text-white">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#FF5A1F]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
                <Wallet className="w-4 h-4 text-[#FF5A1F]" />
                <span>Available Balance</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                  ₹{balanceRupees}
                </span>
                <span className="text-sm text-slate-400 font-semibold uppercase">INR</span>
              </div>

              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Wallet funds can be used immediately at checkout to settle any pending HomeServe booking.
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/bookings"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
              >
                <CreditCard className="w-4 h-4" />
                Pay for Bookings
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/10 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Explore Services
              </Link>
            </div>
          </div>

          {/* Phase 14 Non-real-money disclaimer banner */}
          <div className="mt-6 pt-5 border-t border-white/10 flex items-start gap-2.5 text-xs text-slate-300 bg-white/5 p-3.5 rounded-2xl">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-bold text-amber-300">Phase 14 Note:</span> This is a closed-loop internal ledger system. Direct card/UPI deposits and withdrawals are postponed to Phase 15. Your wallet receives promotional credits from HomeServe Admin and automatic refunds on cancelled bookings.
            </p>
          </div>
        </div>

        {/* ── Transaction Ledger Section ── */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Transaction History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete cryptographically indexed audit trail of all credits, debits, and refunds.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-start sm:self-auto">
              {['ALL', 'CREDIT', 'DEBIT', 'REFUND'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTypeFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    typeFilter === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase() + 's'}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 mb-1">
                {typeFilter === 'ALL' ? 'No transactions yet' : `No ${typeFilter.toLowerCase()} transactions`}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                When you pay for a booking or receive an admin promotional credit or refund, your ledger records will appear here with instant balance snapshots.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => {
                const conf = TRANSACTION_ICONS[tx.type] || TRANSACTION_ICONS.DEBIT;
                const IconComponent = conf.icon;
                const formattedDate = new Date(tx.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const amountRupees = (tx.amountPaise / 100).toFixed(2);
                const postBalanceRupees = (tx.balanceAfterPaise / 100).toFixed(2);

                return (
                  <div
                    key={tx._id}
                    className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/75 px-3 rounded-2xl transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-2xl ${conf.bg} flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0`}>
                        <IconComponent className={`w-5 h-5 ${conf.color}`} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900">
                            {tx.description || `${tx.type} Transaction`}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tx.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {tx.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-slate-500">
                            Post-Balance: ₹{postBalanceRupees}
                          </span>
                          {tx.bookingId && (
                            <>
                              <span>•</span>
                              <Link
                                to={`/bookings/${tx.bookingId?._id || tx.bookingId}`}
                                className="inline-flex items-center gap-1 text-[#FF5A1F] hover:underline font-semibold"
                              >
                                View Booking <ExternalLink className="w-3 h-3" />
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                      <div className={`text-base sm:text-lg font-black font-mono ${conf.textCol}`}>
                        {conf.sign}₹{amountRupees}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {tx.idempotencyKey?.slice(0, 20)}...
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
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

      <MobileBottomNav />
    </div>
  );
}
