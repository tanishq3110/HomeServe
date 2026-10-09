import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  User,
  Phone,
  Home,
  Landmark,
  Navigation,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { serviceService, bookingService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';

// ─── Helper: today as YYYY-MM-DD for min date ─────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = ['Service', 'Schedule', 'Address', 'Pricing', 'Confirm'];

const StepBar = ({ current }) => (
  <div className="flex items-center gap-0 mb-8 max-w-xl mx-auto">
    {STEPS.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                done
                  ? 'bg-[#FF5A1F] border-[#FF5A1F] text-white'
                  : active
                  ? 'bg-white border-[#FF5A1F] text-[#FF5A1F]'
                  : 'bg-white border-slate-300 text-slate-400'
              }`}
            >
              {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-[10px] mt-1 font-semibold hidden sm:block ${
                active ? 'text-[#FF5A1F]' : done ? 'text-slate-500' : 'text-slate-300'
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 mt-[-14px] transition-all ${
                done ? 'bg-[#FF5A1F]' : 'bg-slate-200'
              }`}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Field wrapper ────────────────────────────────────────────────────────────
const Field = ({ label, error, children, required }) => (
  <div>
    <label className="block text-xs font-bold text-slate-700 mb-1.5">
      {label}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
  </div>
);

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent transition';

// ─── Main component ───────────────────────────────────────────────────────────
const NewBookingPage = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [step, setStep] = useState(0); // 0-4
  const [service, setService] = useState(null);
  const [loadingService, setLoadingService] = useState(true);
  const [serviceError, setServiceError] = useState('');

  // Form state
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [address, setAddress] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    addressLine: '',
    landmark: '',
    city: '',
    state: '',
    postalCode: '',
    label: 'Home',
  });
  const [urgency, setUrgency] = useState('NORMAL');
  const [customerNotes, setCustomerNotes] = useState('');

  // Pricing preview (frontend estimate — backend is authoritative)
  const URGENT_FEE = 150;
  const basePrice = service ? Number(service.startingPrice) : 0;
  const urgencyCharge = urgency === 'URGENT' ? URGENT_FEE : 0;
  const estimatedTotal = basePrice + urgencyCharge;

  // Validation errors per step
  const [errors, setErrors] = useState({});

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [bookingResult, setBookingResult] = useState(null); // set on success

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/bookings/new/${serviceId}`);
    }
  }, [isAuthenticated, navigate, serviceId]);

  // Fetch service
  useEffect(() => {
    if (!serviceId) return;
    const fetch = async () => {
      setLoadingService(true);
      setServiceError('');
      try {
        const res = await serviceService.getById(serviceId);
        setService(res.data);
      } catch (err) {
        setServiceError(err.message || 'Service not found.');
      } finally {
        setLoadingService(false);
      }
    };
    fetch();
  }, [serviceId]);

  // ── Validation per step ──
  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!scheduledDate) errs.scheduledDate = 'Please select a date.';
      if (!scheduledTime) errs.scheduledTime = 'Please select a time.';
    }
    if (s === 2) {
      if (!address.fullName.trim()) errs.fullName = 'Full name is required.';
      if (!address.phone.trim()) errs.phone = 'Phone number is required.';
      if (!address.addressLine.trim()) errs.addressLine = 'Address line is required.';
      if (!address.city.trim()) errs.city = 'City is required.';
      if (!address.state.trim()) errs.state = 'State is required.';
      if (!address.postalCode.trim()) errs.postalCode = 'Postal code is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // ── Submit ──
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await bookingService.create({
        serviceId: service._id,
        address,
        scheduledDate,
        scheduledTime,
        urgency,
        customerNotes,
      });
      setBookingResult(result);
      setStep(4); // Confirm step
    } catch (err) {
      setSubmitError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / Error states ──
  if (loadingService) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading service details..." />
      </div>
    );
  }

  if (serviceError || !service) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <ErrorState
          title="Service Unavailable"
          message={serviceError || 'The requested service could not be found.'}
          actionLabel="Browse Services"
          actionLink="/services"
        />
      </div>
    );
  }

  // ── Confirmation screen ──
  if (step === 4 && bookingResult) {
    const b = bookingResult.data;
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg max-w-lg w-full p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Booking Confirmed!</h1>
            <p className="text-sm text-slate-500 mt-1">
              {bookingResult.technicianAssigned
                ? 'A technician has been assigned and will confirm shortly.'
                : 'No technician is currently available. We will assign one shortly.'}
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-3 border border-slate-100">
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-medium">Booking Ref</span>
              <span className="font-bold text-brand-accent">{bookingResult.bookingRef}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-medium">Service</span>
              <span className="font-semibold">{b?.serviceId?.name || service.name}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-medium">Scheduled</span>
              <span className="font-semibold">{scheduledDate} at {scheduledTime}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-medium">Urgency</span>
              <span className={`font-bold ${urgency === 'URGENT' ? 'text-brand-accent' : 'text-slate-700'}`}>{urgency}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between text-sm font-bold text-slate-900">
              <span>Total Price</span>
              <span className="text-brand-accent">₹{bookingResult.pricing?.totalPrice ?? estimatedTotal}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              to="/bookings"
              className="flex-1 bg-brand-accent hover:bg-brand-600 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-orange-500/25"
            >
              View My Bookings
            </Link>
            <Link
              to="/services"
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-3 rounded-xl transition-all"
            >
              Browse More
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-16">
      {/* Header */}
      <div className="bg-dark-hero text-white px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Book a Service</h1>
          <p className="text-slate-400 text-sm mt-1">{service.name}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8">
          <StepBar current={step} />

          {/* ── Step 0: Service Confirmation ── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 mb-1">Confirm Service</h2>
                <p className="text-xs text-slate-500">Review the service details before scheduling.</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-accent rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900">{service.name}</p>
                    <p className="text-xs text-slate-500">{service.category}</p>
                  </div>
                </div>
                <div className="border-t border-orange-200 pt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">Starting From</span>
                  <span className="text-xl font-black text-brand-accent">₹{service.startingPrice}</span>
                </div>
                {service.duration && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Estimated duration: {service.duration}
                  </p>
                )}
              </div>
              <button
                onClick={next}
                className="w-full bg-brand-accent hover:bg-brand-600 text-white font-bold text-sm py-3.5 rounded-2xl transition-all shadow-md shadow-orange-500/25 flex items-center justify-center gap-2"
              >
                Continue to Schedule <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 1: Date & Time ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 mb-1">Choose Date & Time</h2>
                <p className="text-xs text-slate-500">Select when you'd like the service.</p>
              </div>
              <Field label="Preferred Date" error={errors.scheduledDate} required>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="scheduledDate"
                    type="date"
                    min={todayStr()}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className={`${inputCls} pl-10 ${errors.scheduledDate ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
                  />
                </div>
              </Field>
              <Field label="Preferred Time" error={errors.scheduledTime} required>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="scheduledTime"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className={`${inputCls} pl-10 ${errors.scheduledTime ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
                  />
                </div>
              </Field>
              <div className="flex gap-3">
                <button onClick={back} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-3 rounded-xl transition-all">
                  Back
                </button>
                <button onClick={next} className="flex-1 bg-brand-accent hover:bg-brand-600 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-orange-500/25">
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Address ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 mb-1">Service Address</h2>
                <p className="text-xs text-slate-500">Where should the technician come?</p>
              </div>
              <Field label="Full Name" error={errors.fullName} required>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="addr-fullName"
                    type="text"
                    placeholder="Your full name"
                    value={address.fullName}
                    onChange={(e) => setAddress((a) => ({ ...a, fullName: e.target.value }))}
                    className={`${inputCls} pl-10 ${errors.fullName ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
                  />
                </div>
              </Field>
              <Field label="Phone Number" error={errors.phone} required>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="addr-phone"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={address.phone}
                    onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
                    className={`${inputCls} pl-10 ${errors.phone ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
                  />
                </div>
              </Field>
              <Field label="Address Line" error={errors.addressLine} required>
                <div className="relative">
                  <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="addr-line"
                    type="text"
                    placeholder="House / Flat / Street"
                    value={address.addressLine}
                    onChange={(e) => setAddress((a) => ({ ...a, addressLine: e.target.value }))}
                    className={`${inputCls} pl-10 ${errors.addressLine ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
                  />
                </div>
              </Field>
              <Field label="Landmark (optional)" error={errors.landmark}>
                <div className="relative">
                  <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="addr-landmark"
                    type="text"
                    placeholder="Near market, school, etc."
                    value={address.landmark}
                    onChange={(e) => setAddress((a) => ({ ...a, landmark: e.target.value }))}
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" error={errors.city} required>
                  <input
                    id="addr-city"
                    type="text"
                    placeholder="City"
                    value={address.city}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    className={`${inputCls} ${errors.city ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
                  />
                </Field>
                <Field label="State" error={errors.state} required>
                  <input
                    id="addr-state"
                    type="text"
                    placeholder="State"
                    value={address.state}
                    onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                    className={`${inputCls} ${errors.state ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
                  />
                </Field>
              </div>
              <Field label="Postal Code" error={errors.postalCode} required>
                <div className="relative">
                  <Navigation className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="addr-postal"
                    type="text"
                    placeholder="6-digit PIN"
                    value={address.postalCode}
                    onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
                    className={`${inputCls} pl-10 ${errors.postalCode ? 'border-rose-400 ring-2 ring-rose-200' : ''}`}
                  />
                </div>
              </Field>
              <div className="flex gap-3">
                <button onClick={back} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-3 rounded-xl transition-all">
                  Back
                </button>
                <button onClick={next} className="flex-1 bg-brand-accent hover:bg-brand-600 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-orange-500/25">
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review Your Booking Details (Screen 3) ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 mb-1">Review Your Booking Details</h2>
                <p className="text-xs text-slate-500">Please review your booking information and dynamic pricing before confirming.</p>
              </div>

              {/* 2-Column Split matching Screen 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Left Column: Booking Details Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
                  {/* Service Box */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#FF5A1F] flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">{service.name}</h4>
                      <p className="text-xs text-slate-400">{service.category}</p>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">Starting from ₹{basePrice}</p>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-[#FF5A1F]" />
                      <span>Schedule</span>
                    </div>
                    <p className="text-slate-800 font-semibold pl-5">{scheduledDate}</p>
                    <p className="text-slate-500 pl-5">{scheduledTime}</p>
                  </div>

                  {/* Address */}
                  <div className="space-y-1 text-xs pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-[#FF5A1F]" />
                      <span>Address</span>
                    </div>
                    <p className="text-slate-800 font-bold pl-5">{address.fullName} <span className="text-slate-500 font-normal">({address.phone})</span></p>
                    <p className="text-slate-600 pl-5 leading-relaxed">
                      {[address.addressLine, address.landmark, address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
                    </p>
                  </div>

                  {/* Urgency */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <Zap className={`w-3.5 h-3.5 ${urgency === 'URGENT' ? 'text-[#FF5A1F] fill-[#FF5A1F]' : 'text-slate-400'}`} />
                      <span>Urgency: <strong className={urgency === 'URGENT' ? 'text-[#FF5A1F]' : 'text-emerald-600'}>{urgency}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUrgency((u) => u === 'URGENT' ? 'NORMAL' : 'URGENT')}
                      className="text-xs font-bold text-[#FF5A1F] hover:underline cursor-pointer"
                    >
                      {urgency === 'URGENT' ? 'Switch to Normal' : 'Make Urgent (+₹150)'}
                    </button>
                  </div>

                  {customerNotes && (
                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <span className="font-bold text-slate-700">Notes: </span>
                      {customerNotes}
                    </div>
                  )}
                </div>

                {/* Right Column: Price Breakdown Card matching Screen 3 */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
                  <h3 className="font-extrabold text-slate-900 text-sm">Price Breakdown</h3>
                  
                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Base Price</span>
                      <span className="font-semibold text-slate-900">₹{basePrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Urgency Charge ({urgency === 'URGENT' ? 'Urgent' : 'Normal'})</span>
                      <span className={`font-semibold ${urgencyCharge > 0 ? 'text-[#FF5A1F]' : 'text-emerald-600'}`}>
                        {urgencyCharge > 0 ? `+₹${urgencyCharge}` : '₹0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Distance Charge</span>
                      <span className="font-semibold text-emerald-600">₹0</span>
                    </div>
                    <div className="flex justify-between items-baseline border-t border-slate-200 pt-3 mt-1">
                      <span className="text-sm font-bold text-slate-900">Total Price</span>
                      <span className="text-2xl font-black text-[#FF5A1F]">₹{estimatedTotal}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl">
                    <p className="flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      No payment required now. You'll pay after the service is completed.
                    </p>
                  </div>
                </div>

              </div>

              {submitError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {submitError}
                </div>
              )}

              {/* Bottom Navigation Buttons matching Screen 3 */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={back}
                  className="px-6 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-3 bg-[#FF5A1F] hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition shadow-md shadow-orange-500/25 flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <span>Confirm Booking</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewBookingPage;
