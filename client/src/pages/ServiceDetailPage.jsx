import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Zap, 
  Award, 
  AlertCircle, 
  Info,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { serviceService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/common/StarRating';

import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import MobileBottomNav from '../components/common/MobileBottomNav';

const ServiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Urgent service toggle state (UI preview)
  const [isUrgent, setIsUrgent] = useState(false);

  const { user, isAuthenticated } = useAuth();

  // Fetch service from live MongoDB API by slug or ObjectId
  useEffect(() => {
    let isMounted = true;

    const fetchService = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await serviceService.getById(id);
        if (isMounted) {
          setService(res.data);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[ServiceDetail Error]', err);
          setError(err.message || 'Service not found or currently unavailable.');
          setService(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchService();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading service details..." />
      </div>
    );
  }

  // Not Found / Error State
  if (error || !service) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <ErrorState
          title="Service Not Found"
          message={error || `The service "${id}" does not exist in the database or is inactive.`}
          actionLabel="Browse All Services"
          onAction={() => navigate('/services')}
        />
      </div>
    );
  }

  const basePrice = Number(service.startingPrice) || 0;
  const urgentFee = 150;
  const totalPrice = basePrice + (isUrgent ? urgentFee : 0);

  return (
    <div className="bg-[#F8FAFC] pb-24">
      
      {/* Top Breadcrumbs & Back Bar */}
      <div className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-brand-accent transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Services</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <Link to="/" className="hover:text-slate-700">Home</Link>
            <span>/</span>
            <Link to="/services" className="hover:text-slate-700">Services</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">{service.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Left Column: Details, Image, Inclusions */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Title & Metadata Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold uppercase tracking-wider bg-orange-50 text-[#FF5A1F] px-3 py-1 rounded-lg border border-orange-200/60">
                  {service.category}
                </span>
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Background Verified
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {service.name}
              </h1>

              {service.tagline && (
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  {service.tagline}
                </p>
              )}

              {/* Service Subcategory Pills matching Screen 2 */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[`${service.name} Inspection`, 'Standard Repair', 'Deep Maintenance', 'Parts Replacement'].map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <StarRating rating={service.rating} showScore reviewCount={service.reviewCount} />
                </div>
                {service.duration && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Est. Duration: <strong>{service.duration}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Service Banner Image */}
            {service.image && (
              <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-200 aspect-video bg-slate-900">
                <img
                  src={service.image}
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-6 right-6 text-white text-xs sm:text-sm">
                  <p className="font-semibold drop-shadow-md">
                    Professional equipment • Standardized rate card • 30-day service warranty
                  </p>
                </div>
              </div>
            )}

            {/* 3 Highlight Cards matching Screen 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-orange-50/60 border border-orange-200/70 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF5A1F] text-white flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Verified Technicians</h4>
                  <p className="text-[11px] text-slate-500">Police & skills checked</p>
                </div>
              </div>
              <div className="bg-orange-50/60 border border-orange-200/70 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF5A1F] text-white flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Service Guarantee</h4>
                  <p className="text-[11px] text-slate-500">30-day rework warranty</p>
                </div>
              </div>
              <div className="bg-orange-50/60 border border-orange-200/70 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF5A1F] text-white flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Transparent Pricing</h4>
                  <p className="text-[11px] text-slate-500">No hidden charges</p>
                </div>
              </div>
            </div>

            {/* Detailed Description */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900">
                About this Service
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {service.fullDesc || service.shortDesc}
              </p>
            </div>

            {/* What's Included Checklist */}
            {service.whatsIncluded && service.whatsIncluded.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">
                    What's Included in this Service
                  </h2>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Standard Package
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {service.whatsIncluded.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Why Choose HomeServe */}
            {service.whyChooseUs && service.whyChooseUs.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Why Choose HomeServe for {service.name}?
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {service.whyChooseUs.map((reason, index) => (
                    <div key={index} className="flex items-start gap-3 text-xs text-slate-700">
                      <div className="w-6 h-6 rounded-lg bg-orange-50 text-brand-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                      <span className="leading-relaxed">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Sticky Column: Price Breakdown & Booking Simulation Card */}
          <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-lg space-y-6">
              
              <div className="pb-4 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Pricing Summary
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    ₹{totalPrice}
                  </span>
                  <span className="text-xs text-slate-400">
                    (Standard Rate)
                  </span>
                </div>
              </div>

              {/* Price itemization */}
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Base Service Fee</span>
                  <span className="font-semibold text-slate-900">₹{basePrice}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Inspection & Diagnostics</span>
                  <span className="font-semibold text-emerald-600">Included</span>
                </div>

                {/* Urgent service toggle (Demo behavior) */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="flex items-start gap-3 p-3 rounded-2xl bg-orange-50/70 border border-orange-200/80 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isUrgent}
                      onChange={(e) => setIsUrgent(e.target.checked)}
                      className="mt-1 w-4 h-4 text-brand-accent rounded accent-brand-accent focus:ring-brand-accent cursor-pointer"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span className="flex items-center gap-1 text-brand-900">
                          <Zap className="w-3.5 h-3.5 text-brand-accent fill-brand-accent" />
                          Urgent 30-Min Dispatch
                        </span>
                        <span className="text-brand-accent">+₹{urgentFee}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Immediate priority dispatch for rapid breakdown response.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-slate-900">
                  <span>Estimated Total</span>
                  <span className="text-xl font-black text-brand-accent">₹{totalPrice}</span>
                </div>
              </div>

              {/* Book This Service Button — navigates to real booking flow */}
              {isAuthenticated && user?.role === 'CUSTOMER' ? (
                <Link
                  to={`/bookings/new/${service._id}`}
                  state={{ isUrgent }}
                  className="w-full bg-brand-accent hover:bg-brand-600 text-white font-bold text-sm py-3.5 rounded-2xl transition-all duration-200 shadow-md shadow-orange-500/25 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book This Service</span>
                </Link>
              ) : !isAuthenticated ? (
                <Link
                  to={`/login?redirect=/bookings/new/${service._id}`}
                  className="w-full bg-brand-accent hover:bg-brand-600 text-white font-bold text-sm py-3.5 rounded-2xl transition-all duration-200 shadow-md shadow-orange-500/25 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Login to Book</span>
                </Link>
              ) : null}

              {/* Safety guarantee */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-accent flex-shrink-0" />
                  <span>No upfront payment required until job completion</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-accent flex-shrink-0" />
                  <span>30-Day post-service guarantee</span>
                </div>
              </div>
            </div>

            {/* Phase 6 Notice Banner */}
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Live Booking:</strong> Real service data from MongoDB. Book now to get a technician assigned.
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Responsive Navigation Bar */}
      <MobileBottomNav />

    </div>
  );
};

export default ServiceDetailPage;
