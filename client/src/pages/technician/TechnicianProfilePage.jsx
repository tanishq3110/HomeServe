import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Wrench,
  Briefcase,
  FileText,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { technicianService } from '../../services/api';

// ─── Document status badge ─────────────────────────────────────────────────────
const DocStatusBadge = ({ status }) => {
  const map = {
    PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3" /> },
    APPROVED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> },
    REJECTED: { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: <XCircle className="w-3 h-3" /> },
  };
  const c = map[status] || map.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  );
};

// ─── Skill tag ────────────────────────────────────────────────────────────────
const SkillTag = ({ skill, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 bg-brand-accent/10 text-brand-accent font-semibold text-xs px-3 py-1 rounded-full">
    {skill}
    {onRemove && (
      <button type="button" onClick={() => onRemove(skill)} className="hover:text-brand-600 ml-0.5 cursor-pointer">
        <Trash2 className="w-3 h-3" />
      </button>
    )}
  </span>
);

const DOCUMENT_TYPES = ['ID_PROOF', 'ADDRESS_PROOF', 'CERTIFICATE'];
const DOCUMENT_LABELS = {
  ID_PROOF: 'ID Proof',
  ADDRESS_PROOF: 'Address Proof',
  CERTIFICATE: 'Certificate',
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TechnicianProfilePage = () => {
  const { user } = useAuth();

  // Profile state
  const [profileExists, setProfileExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docSaving, setDocSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [docError, setDocError] = useState('');
  const [docSuccess, setDocSuccess] = useState('');

  // Form fields
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [experience, setExperience] = useState(0);
  const [description, setDescription] = useState('');
  const [profileImage, setProfileImage] = useState('');

  // Documents
  const [documents, setDocuments] = useState([]);
  const [newDocType, setNewDocType] = useState('ID_PROOF');
  const [newDocUrl, setNewDocUrl] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await technicianService.getMyProfile();
      setProfileExists(data.profileExists);
      if (data.profileExists && data.data) {
        const p = data.data;
        setSkills(p.skills || []);
        setExperience(p.experience || 0);
        setDescription(p.description || '');
        setProfileImage(p.profileImage || '');
        setDocuments(p.documents || []);
      }
    } catch (err) {
      if (err.status !== 404) setError(err.message || 'Failed to load profile.');
      setProfileExists(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Add skill ──
  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (skills.includes(trimmed)) { setSkillInput(''); return; }
    setSkills((prev) => [...prev, trimmed]);
    setSkillInput('');
  };
  const removeSkill = (skill) => setSkills((prev) => prev.filter((s) => s !== skill));

  // ── Save profile ──
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = { skills, experience: Number(experience), description, profileImage };
      if (profileExists) {
        await technicianService.updateProfile(payload);
      } else {
        await technicianService.createProfile({ ...payload, documents });
        setProfileExists(true);
      }
      setSuccess('Profile saved successfully!');
      await fetchProfile();
    } catch (err) {
      setError(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  // ── Documents ──
  const addDocument = () => {
    if (!newDocUrl.trim()) { setDocError('Please enter a document URL.'); return; }
    // Replace if same type already exists
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.type !== newDocType);
      return [...filtered, { type: newDocType, url: newDocUrl.trim(), status: 'PENDING' }];
    });
    setNewDocUrl('');
    setDocError('');
  };
  const removeDocument = (type) => setDocuments((prev) => prev.filter((d) => d.type !== type));

  const handleSaveDocuments = async (e) => {
    e.preventDefault();
    if (!profileExists) {
      setDocError('Please save your basic profile first before submitting documents.');
      return;
    }
    setDocError('');
    setDocSuccess('');
    setDocSaving(true);
    try {
      await technicianService.updateProfile({ documents });
      setDocSuccess('Documents saved successfully!');
      await fetchProfile();
    } catch (err) {
      setDocError(err.message || 'Failed to save documents.');
    } finally {
      setDocSaving(false);
      setTimeout(() => setDocSuccess(''), 4000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-8 h-8 text-brand-accent animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading your profile...</p>
      </div>
    );
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'T';

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-16">
      {/* ── Header ── */}
      <div className="bg-dark-hero text-white px-4 sm:px-6 lg:px-8 pt-10 pb-14">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/technician/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight">Technician Profile</h1>
          <p className="text-slate-400 text-sm mt-1">
            {profileExists
              ? 'Update your professional information and documents.'
              : 'Set up your profile to begin the verification process.'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-6">

        {/* ── Identity Card (read-only from User) ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4">
            Account Information
          </h2>
          <div className="flex items-center gap-5">
            {profileImage ? (
              <img
                src={profileImage}
                alt={user?.name}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-brand-accent flex items-center justify-center text-white text-xl font-extrabold shadow-md">
                {initials}
              </div>
            )}
            <div>
              <p className="font-extrabold text-slate-900 text-lg">{user?.name}</p>
              <div className="flex flex-col gap-0.5 mt-1">
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-brand-accent" /> {user?.email}
                </span>
                {user?.phone && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-brand-accent" /> {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Professional Info Form ── */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">
            Professional Information
          </h2>

          {/* Error/Success */}
          {error && (
            <div className="flex items-start gap-2.5 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
            </div>
          )}

          {/* Profile Image URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Profile Image URL <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="url"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="https://example.com/your-photo.jpg"
                className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Skills
            </label>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Wrench className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="e.g. Plumbing, Electrical, AC Repair"
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={addSkill}
                className="flex items-center gap-1.5 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <SkillTag key={skill} skill={skill} onRemove={removeSkill} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No skills added yet. Press Enter or click Add.</p>
            )}
          </div>

          {/* Experience */}
          <div>
            <label htmlFor="tech-experience" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Years of Experience
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="tech-experience"
                type="number"
                min="0"
                max="50"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="tech-description" className="block text-xs font-semibold text-slate-700 mb-1.5">
              About You <span className="text-slate-400 font-normal">(max 1000 chars)</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <textarea
                id="tech-description"
                rows={4}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your expertise, specialisations and work style..."
                className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-slate-800 placeholder:text-slate-400 resize-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 text-right">{description.length}/1000</p>
          </div>

          {/* Save Profile button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-600 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-orange-500/25 disabled:opacity-60 active:scale-[0.98] cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        {/* ── Documents Form ── */}
        <form onSubmit={handleSaveDocuments} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-500" />
            <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">
              Documents
            </h2>
          </div>
          <p className="text-xs text-slate-500 -mt-4">
            Submit document URLs for verification. Cloudinary file upload will be available in a later phase.
          </p>

          {/* Error/Success */}
          {docError && (
            <div className="flex items-start gap-2.5 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {docError}
            </div>
          )}
          {docSuccess && (
            <div className="flex items-center gap-2.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-sm">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {docSuccess}
            </div>
          )}

          {/* Existing documents */}
          {documents.length > 0 && (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.type}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-slate-700">
                        {DOCUMENT_LABELS[doc.type] || doc.type}
                      </span>
                      <DocStatusBadge status={doc.status} />
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-xs">{doc.url}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDocument(doc.type)}
                    className="text-slate-400 hover:text-rose-500 transition-colors flex-shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new document */}
          <div className="border border-dashed border-slate-300 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-600">Add / Replace Document</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value)}
                className="text-sm px-3 py-2.5 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-slate-800"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{DOCUMENT_LABELS[type]}</option>
                ))}
              </select>
              <input
                type="url"
                value={newDocUrl}
                onChange={(e) => setNewDocUrl(e.target.value)}
                placeholder="https://example.com/document.pdf"
                className="sm:col-span-2 text-sm px-3 py-2.5 rounded-xl border border-[#D9DEE7] bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={addDocument}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Document
            </button>
          </div>

          {/* Save Documents */}
          <button
            type="submit"
            disabled={docSaving || !profileExists}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm py-3.5 rounded-xl transition-all disabled:opacity-60 active:scale-[0.98] cursor-pointer"
          >
            {docSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {docSaving ? 'Saving Documents...' : 'Save Documents'}
          </button>
          {!profileExists && (
            <p className="text-[11px] text-center text-slate-400">
              Save your basic profile above first before saving documents.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default TechnicianProfilePage;
