import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  Briefcase,
  Wrench,
  RefreshCw,
  AlertTriangle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Wifi,
  WifiOff,
  X,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { adminTechnicianService } from '../../services/api';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
    icon: <Clock className="w-3.5 h-3.5" />,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  APPROVED: {
    label: 'Approved',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Rejected',
    icon: <XCircle className="w-3.5 h-3.5" />,
    cls: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  );
};

const DocStatusBadge = ({ status }) => {
  const map = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-100',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[status] || map.PENDING}`}>
      {status}
    </span>
  );
};

const DOC_LABELS = { ID_PROOF: 'ID Proof', ADDRESS_PROOF: 'Address Proof', CERTIFICATE: 'Certificate' };

// ─── Technician Detail Modal ───────────────────────────────────────────────────
const TechnicianDetailModal = ({ technician, onClose, onApprove, onReject, actionLoading }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!technician) return null;
  const { user, skills, experience, description, profileImage, documents, verificationStatus, isVerified, isAvailable, rating, totalReviews, rejectionReason: existingReason } = technician;
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'T';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-brand-accent" />
            <h2 className="text-base font-extrabold text-slate-900">Technician Details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Identity */}
          <div className="flex items-center gap-4">
            {profileImage ? (
              <img src={profileImage} alt={user?.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-200" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-brand-accent flex items-center justify-center text-white text-xl font-extrabold">
                {initials}
              </div>
            )}
            <div>
              <p className="text-xl font-extrabold text-slate-900">{user?.name || 'Unknown'}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              {user?.phone && <p className="text-sm text-slate-500">{user.phone}</p>}
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <StatusBadge status={verificationStatus} />
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {isAvailable ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isAvailable ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
              <p className="text-xl font-extrabold text-slate-900">{rating > 0 ? rating.toFixed(1) : '—'}</p>
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                <Star className="w-3 h-3 text-amber-400" /> Rating
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
              <p className="text-xl font-extrabold text-slate-900">{totalReviews}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Reviews</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
              <p className="text-xl font-extrabold text-slate-900">{experience}yr</p>
              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                <Briefcase className="w-3 h-3 text-brand-accent" /> Exp.
              </p>
            </div>
          </div>

          {/* Skills */}
          {skills?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="bg-brand-accent/10 text-brand-accent text-xs font-semibold px-3 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {description && (
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">About</p>
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-200">
                {description}
              </p>
            </div>
          )}

          {/* Documents */}
          {documents?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Documents</p>
              <div className="space-y-2">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-700">{DOC_LABELS[doc.type] || doc.type}</span>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">{doc.url}</p>
                    </div>
                    <DocStatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejection reason (if any) */}
          {existingReason && verificationStatus === 'REJECTED' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <p className="text-xs font-bold text-rose-700 mb-1">Rejection Reason</p>
              <p className="text-sm text-rose-600">{existingReason}</p>
            </div>
          )}

          {/* Action buttons */}
          {verificationStatus === 'PENDING' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              {!showRejectForm ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => onApprove(technician.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                  >
                    {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    <ThumbsDown className="w-4 h-4" /> Reject
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Optional: provide a reason for rejection..."
                    className="w-full text-sm px-4 py-3 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all text-slate-800 placeholder:text-slate-400 resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 text-sm font-bold py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => onReject(technician.id, rejectionReason)}
                      className="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm py-3 rounded-xl transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
                      Confirm Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {verificationStatus === 'APPROVED' && (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" /> This technician is approved.
            </div>
          )}
          {verificationStatus === 'REJECTED' && (
            <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm font-semibold">
              <XCircle className="w-4 h-4" /> This application was rejected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Technician Card (list row) ───────────────────────────────────────────────
const TechnicianCard = ({ technician, onView, onApprove, onReject, actionLoading, actionTarget }) => {
  const { user, skills, experience, verificationStatus, isAvailable, rating, totalReviews } = technician;
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'T';
  const isAction = actionTarget === technician.id;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md hover:border-slate-300 transition-all">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl bg-brand-accent flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-extrabold text-slate-900 text-sm">{user?.name || 'Unknown'}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
              {user?.phone && <p className="text-xs text-slate-400">{user.phone}</p>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={verificationStatus} />
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                {isAvailable ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isAvailable ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Briefcase className="w-3.5 h-3.5 text-brand-accent" />
              {experience}yr exp
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              {rating > 0 ? rating.toFixed(1) : '—'} ({totalReviews})
            </span>
          </div>

          {/* Skills */}
          {skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {skills.slice(0, 4).map((s) => (
                <span key={s} className="bg-brand-accent/10 text-brand-accent text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
              {skills.length > 4 && (
                <span className="text-[11px] text-slate-400 font-semibold px-2 py-0.5">+{skills.length - 4} more</span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => onView(technician)}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> View
            </button>

            {verificationStatus === 'PENDING' && (
              <>
                <button
                  type="button"
                  disabled={actionLoading && isAction}
                  onClick={() => onApprove(technician.id)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {actionLoading && isAction ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ThumbsUp className="w-3.5 h-3.5" />
                  )}
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onView(technician, true)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                >
                  <ThumbsDown className="w-3.5 h-3.5" /> Reject
                </button>
              </>
            )}

            {verificationStatus === 'APPROVED' && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approved
              </span>
            )}
            {verificationStatus === 'REJECTED' && (
              <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Rejected
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

const AdminTechniciansPage = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [openRejectModal, setOpenRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filter !== 'ALL') params.status = filter;
      if (search) params.search = search;
      const data = await adminTechnicianService.getAll(params);
      setTechnicians(data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load technicians.');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };
  const clearSearch = () => { setSearch(''); setSearchInput(''); };

  const handleApprove = async (id) => {
    setActionLoading(true);
    setActionTarget(id);
    setActionMessage('');
    try {
      await adminTechnicianService.approve(id);
      setActionMessage('Technician approved successfully.');
      setSelectedTechnician(null);
      await fetchTechnicians();
    } catch (err) {
      setActionMessage(err.message || 'Failed to approve technician.');
    } finally {
      setActionLoading(false);
      setActionTarget(null);
      setTimeout(() => setActionMessage(''), 4000);
    }
  };

  const handleReject = async (id, rejectionReason) => {
    setActionLoading(true);
    setActionTarget(id);
    setActionMessage('');
    try {
      await adminTechnicianService.reject(id, rejectionReason);
      setActionMessage('Technician rejected.');
      setSelectedTechnician(null);
      await fetchTechnicians();
    } catch (err) {
      setActionMessage(err.message || 'Failed to reject technician.');
    } finally {
      setActionLoading(false);
      setActionTarget(null);
      setTimeout(() => setActionMessage(''), 4000);
    }
  };

  const handleView = (technician, openReject = false) => {
    setSelectedTechnician(technician);
    if (openReject) {
      // small trick to open reject form in modal
    }
  };

  // Counts for tab badges
  const counts = technicians.reduce(
    (acc, t) => { acc[t.verificationStatus] = (acc[t.verificationStatus] || 0) + 1; return acc; },
    {}
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-16">
      {/* ── Header ── */}
      <div className="bg-dark-hero text-white px-4 sm:px-6 lg:px-8 pt-10 pb-14">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold text-brand-accent uppercase tracking-widest">Admin Panel</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">Technician Applications</h1>
          <p className="text-slate-400 text-sm mt-1">
            Review, approve and manage technician verification applications.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-6">

        {/* ── Action message ── */}
        {actionMessage && (
          <div className={`rounded-2xl border p-4 text-sm font-semibold flex items-center gap-2 ${
            actionMessage.includes('successfully') || actionMessage.includes('approved')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}>
            {actionMessage.includes('successfully') || actionMessage.includes('approved') ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {actionMessage}
          </div>
        )}

        {/* ── Search & Filter ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          {/* Filter tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map((f) => {
              const count = f === 'ALL' ? technicians.length : (counts[f] || 0);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filter === f
                      ? 'bg-brand-accent text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'PENDING' && <Clock className="w-3 h-3" />}
                  {f === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                  {f === 'REJECTED' && <XCircle className="w-3 h-3" />}
                  {f === 'ALL' && <Users className="w-3 h-3" />}
                  {f.charAt(0) + f.slice(1).toLowerCase()}
                  {count > 0 && (
                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      filter === f ? 'bg-white/30' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-brand-accent hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" /> Search
            </button>
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </form>
        </div>

        {/* ── Error ── */}
        {error && (
          <ErrorState
            title="Failed to Load Technicians"
            message={error}
            actionLabel="Try Again"
            onAction={fetchTechnicians}
          />
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="space-y-4">
            <SkeletonLoader variant="card" count={3} />
          </div>
        )}

        {/* ── Results ── */}
        {!loading && !error && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">
                {technicians.length} result{technicians.length !== 1 ? 's' : ''}
                {filter !== 'ALL' && ` · ${filter.charAt(0) + filter.slice(1).toLowerCase()}`}
                {search && ` · "${search}"`}
              </p>
              <button
                type="button"
                onClick={fetchTechnicians}
                className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {technicians.length === 0 ? (
              <EmptyState
                title="No Technicians Found"
                message={search || filter !== 'ALL' ? 'No technicians match your search or filter criteria.' : 'No technician applications have been registered yet.'}
                actionLabel={search ? 'Clear Search' : undefined}
                onAction={search ? clearSearch : undefined}
              />
            ) : (
              <div className="space-y-4">
                {technicians.map((t) => (
                  <TechnicianCard
                    key={t.id}
                    technician={t}
                    onView={handleView}
                    onApprove={handleApprove}
                    onReject={(id) => {
                      handleView(t);
                    }}
                    actionLoading={actionLoading}
                    actionTarget={actionTarget}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selectedTechnician && (
        <TechnicianDetailModal
          technician={selectedTechnician}
          onClose={() => setSelectedTechnician(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
};

export default AdminTechniciansPage;
