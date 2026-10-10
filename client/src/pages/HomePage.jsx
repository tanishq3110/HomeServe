import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Shield,
  CreditCard,
  CalendarCheck,
  Award,
  Navigation,
  RefreshCw,
  Server,
  Database,
  Star,
  Zap,
  PhoneCall,
  Wind,
  Wrench,
  Droplets,
  Paintbrush,
  Check,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { techniciansData } from '../data/techniciansData';
import { testimonialsData } from '../data/testimonialsData';
import ServiceCard from '../components/cards/ServiceCard';
import TechnicianCard from '../components/cards/TechnicianCard';
import TestimonialCard from '../components/cards/TestimonialCard';
import SectionHeading from '../components/common/SectionHeading';
import { healthService, serviceService } from '../services/api';
import heroTechnicianImg from '../assets/images/hero-technician.jpg';
import heroCleanerImg from '../assets/images/hero-cleaner.jpg';
import heroBathroomImg from '../assets/images/hero-bathroom.jpg';
import heroElectricianImg from '../assets/images/hero-electrician.jpg';
import MobileBottomNav from '../components/common/MobileBottomNav';

const HomePage = () => {
  const navigate = useNavigate();
  const [heroSearch, setHeroSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Bangalore');
  const [heroLocationOpen, setHeroLocationOpen] = useState(false);

  // Live MongoDB Services State
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState(null);

  // Backend Health State (Phase 1 verification preserved)
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [latency, setLatency] = useState(null);

  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    const startTime = performance.now();

    try {
      const data = await healthService.checkHealth();
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setHealthData(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setHealthError(err.message || 'Failed to connect to backend server');
      setHealthData(null);
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchServices = async () => {
    setServicesLoading(true);
    setServicesError(null);
    try {
      const res = await serviceService.getAll();
      setServices(res.data || []);
    } catch (err) {
      setServicesError(err.message || 'Failed to load services from MongoDB.');
    } finally {
      setServicesLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchServices();
  }, []);

  const handleHeroSearchSubmit = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/services?search=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      navigate('/services');
    }
  };

  const handleQuickTagClick = (tag) => {
    setHeroSearch(tag);
    navigate(`/services?search=${encodeURIComponent(tag)}`);
  };

  // Quick category shortcuts for the hero section
  const heroQuickCategories = [
    { name: 'AC Service', category: 'AC Repair', icon: Wind, color: 'hover:border-cyan-400/50 hover:bg-cyan-500/10' },
    { name: 'Electrician', category: 'Electrical', icon: Zap, color: 'hover:border-amber-400/50 hover:bg-amber-500/10' },
    { name: 'Plumber', category: 'Plumbing', icon: Wrench, color: 'hover:border-blue-400/50 hover:bg-blue-500/10' },
    { name: 'Cleaning', category: 'Cleaning', icon: Sparkles, color: 'hover:border-purple-400/50 hover:bg-purple-500/10' },
    { name: 'Carpentry', category: 'Carpentry', icon: Award, color: 'hover:border-emerald-400/50 hover:bg-emerald-500/10' },
  ];

  // Why HomeServe features list
  const whyChooseFeatures = [
    {
      icon: ShieldCheck,
      title: 'Verified Professionals',
      desc: 'All service technicians undergo background verification, skills testing, and identity checks.',
    },
    {
      icon: Award,
      title: 'Transparent Pricing',
      desc: 'Standardized rate card with upfront price estimates. No hidden charges or surprise invoices.',
    },
    {
      icon: Navigation,
      title: 'Real-Time Tracking',
      desc: 'Follow your assigned professional’s live ETA right to your doorstep once dispatched.',
    },
    {
      icon: CreditCard,
      title: 'Secure Payments',
      desc: 'Pay smoothly after service completion via UPI, credit cards, or net banking with 100% safety.',
    },
    {
      icon: CalendarCheck,
      title: 'Easy Booking',
      desc: 'Select your preferred date, convenient 30-minute time slot, and service details in under 60 seconds.',
    },
    {
      icon: Sparkles,
      title: 'Quality Service',
      desc: 'Every booking is backed by our 30-day rework guarantee if you are not fully satisfied.',
    },
  ];

  // How it works 4 steps
  const workflowSteps = [
    {
      num: '01',
      title: 'Choose a Service',
      desc: 'Select from our wide range of curated electrical, plumbing, cleaning, AC, and home repair solutions.',
    },
    {
      num: '02',
      title: 'Select Date & Time',
      desc: 'Pick your preferred arrival schedule, including standard slots or urgent 30-minute express arrival.',
    },
    {
      num: '03',
      title: 'Get a Verified Professional',
      desc: 'A background-checked, equipped specialist arrives at your doorstep on time with genuine tools.',
    },
    {
      num: '04',
      title: 'Relax & Get It Done',
      desc: 'Enjoy top-tier workmanship, inspect the finished job, and pay securely after full satisfaction.',
    },
  ];

  return (
    <div className="space-y-20 pb-20 overflow-x-hidden">
      
      {/* 1. RECREATED MODERN HERO SECTION - WHITE & ORANGE COMBINATION */}
      <section className="relative bg-gradient-to-b from-orange-50/70 via-white to-orange-50/30 text-slate-900 pt-10 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-orange-100/80">
        
        {/* Ambient warm orange & amber atmospheric glow orbs */}
        <div className="absolute -top-32 right-1/4 w-[600px] h-[600px] bg-orange-400/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 -left-32 w-[500px] h-[500px] bg-amber-400/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Subtle geometric dot matrix overlay in warm tone */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(249,115,22,0.08)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-80" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
          
          {/* Hero Left Content Column - Redesigned & Elevated */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            
            {/* Live Telemetry Status Pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-orange-200/90 bg-white shadow-sm shadow-orange-500/5 text-xs font-bold text-slate-800 backdrop-blur-md hover:border-orange-300 transition-all">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
              <span className="text-orange-600 font-extrabold uppercase tracking-wide text-[11px]">Live GPS Dispatch</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-slate-600 font-medium">Available in {selectedLocation}</span>
            </div>

            {/* Main Headline with Custom Gradient & Underline Accent */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-black tracking-tight leading-[1.05] text-slate-900">
                Expert Home<br />
                Services,<br />
                <span className="relative inline-block mt-0.5">
                  <span className="bg-gradient-to-r from-[#FF5A1F] via-orange-500 to-amber-500 bg-clip-text text-transparent">
                    In 30 Minutes.
                  </span>
                  {/* Subtle artistic orange highlighter stroke */}
                  <svg
                    className="absolute -bottom-1 left-0 w-full h-2.5 text-orange-200/70 -z-0 pointer-events-none"
                    viewBox="0 0 300 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 9C80 3 220 3 297 9"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
              <p className="max-w-lg text-slate-600 text-sm sm:text-base leading-relaxed mx-auto lg:mx-0 font-normal">
                Skip the wait. Book verified electricians, plumbers, and cleaning professionals instantly. Backed by our <span className="font-semibold text-slate-800">30-day rework warranty</span>.
              </p>
            </div>

            {/* Micro-Perks Quick Strip */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 text-xs font-semibold text-slate-600 pt-0.5">
              <div className="flex items-center gap-1.5 text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Verified Pros</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Clock className="w-4 h-4 text-[#FF5A1F]" />
                <span>30-Min Arrival</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                <span>Standard Pricing</span>
              </div>
            </div>

            {/* Elevated Interactive Search Console */}
            <div className="relative max-w-xl mx-auto lg:mx-0">
              <form
                onSubmit={handleHeroSearchSubmit}
                className="relative bg-white rounded-2xl sm:rounded-full p-2 pl-4 sm:pl-5 shadow-xl shadow-orange-950/10 flex flex-col sm:flex-row items-stretch sm:items-center border-2 border-orange-100 hover:border-orange-300 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/15 transition-all duration-300 gap-2 sm:gap-0"
              >
                {/* Search Input */}
                <div className="flex items-center gap-3 flex-1 min-w-0 py-1 sm:py-0">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF5A1F] flex items-center justify-center flex-shrink-0">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    placeholder="Search for a service (e.g. AC Repair, Plumbing...)"
                    className="w-full text-slate-900 placeholder-slate-400 bg-transparent text-sm focus:outline-none font-medium"
                  />
                </div>

                {/* Location Dropdown */}
                <div className="relative border-t sm:border-t-0 sm:border-l border-slate-200 px-3 py-1 sm:py-0 flex items-center">
                  <button
                    type="button"
                    onClick={() => setHeroLocationOpen(!heroLocationOpen)}
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors w-full sm:w-auto justify-between sm:justify-start cursor-pointer py-1"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#FF5A1F] flex-shrink-0" />
                    <span>{selectedLocation}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                  </button>

                  {/* City Select Popover */}
                  {heroLocationOpen && (
                    <div className="absolute top-full right-0 mt-3 w-44 bg-white border border-slate-200 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Select City
                      </div>
                      {['Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune'].map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setSelectedLocation(city);
                            setHeroLocationOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors flex items-center justify-between ${
                            selectedLocation === city
                              ? 'text-[#FF5A1F] bg-orange-50 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{city}</span>
                          {selectedLocation === city && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]"></span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search Button */}
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#FF5A1F] to-orange-500 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl sm:rounded-full flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/30 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex-shrink-0 cursor-pointer"
                >
                  <span>Search</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Popular Tags with Category Icons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs pt-1">
              <span className="text-slate-500 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                Popular:
              </span>
              {[
                { name: 'AC Service', icon: Wind, color: 'text-cyan-700 bg-cyan-50/80 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300' },
                { name: 'Deep Cleaning', icon: Sparkles, color: 'text-purple-700 bg-purple-50/80 border-purple-200 hover:bg-purple-100 hover:border-purple-300' },
                { name: 'Electrician', icon: Zap, color: 'text-amber-700 bg-amber-50/80 border-amber-200 hover:bg-amber-100 hover:border-amber-300' },
                { name: 'Plumber', icon: Wrench, color: 'text-blue-700 bg-blue-50/80 border-blue-200 hover:bg-blue-100 hover:border-blue-300' },
              ].map((tag) => {
                const IconComponent = tag.icon;
                return (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => handleQuickTagClick(tag.name)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-sm transition-all duration-200 cursor-pointer font-semibold ${tag.color}`}
                  >
                    <IconComponent className="w-3 h-3" />
                    <span>{tag.name}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Hero Right Visual Showcase (Multi-Image Overlapping Collage) */}
          <div className="lg:col-span-6 relative mt-12 lg:mt-0 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[480px] sm:max-w-[500px]">
              
              {/* Warm Orange Ambient Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/25 via-amber-300/20 to-transparent rounded-[36px] blur-3xl opacity-75 pointer-events-none" />

              {/* Center Main Card - Cinematic Live Service Video Showcase */}
              <div className="relative mx-auto w-[82%] sm:w-[84%] aspect-[3/3.8] rounded-[32px] overflow-hidden border-4 border-white shadow-2xl shadow-orange-950/15 bg-slate-900 group">
                <video
                  src="/videos/hero-service.mp4"
                  poster={heroCleanerImg}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover filter brightness-[0.98] contrast-[1.02]"
                />

                {/* Subtle top indicator */}
                <div className="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white flex items-center gap-1.5 shadow-md">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="tracking-wide uppercase">Live Showcase</span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Top-Right Inset Floating Image (Luxury clean bathroom) */}
              <div className="absolute -top-6 -right-2 sm:-top-8 sm:-right-4 w-36 h-36 sm:w-44 sm:h-44 rounded-[26px] overflow-hidden border-4 border-white shadow-2xl z-20 bg-white">
                <img
                  src={heroBathroomImg}
                  alt="Spotless Bathroom Renovation"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Bottom-Left Inset Floating Image (Electrician in helmet with switchboard) */}
              <div className="absolute -bottom-6 -left-2 sm:-bottom-8 sm:-left-4 w-40 h-40 sm:w-48 sm:h-48 rounded-[26px] overflow-hidden border-4 border-white shadow-2xl z-20 bg-white">
                <img
                  src={heroElectricianImg}
                  alt="Verified Electrician"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-100 text-[10px] font-bold text-slate-900 flex items-center gap-1 shadow-md">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Verified Pro</span>
                </div>
              </div>

              {/* Floating Badge 1 (Top-Left): 4.9/5 Rating */}
              <div className="absolute top-10 -left-4 sm:top-12 sm:-left-8 z-30 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3 px-3.5 sm:px-4 shadow-xl shadow-slate-900/5 flex items-center gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-emerald-500 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-tight">4.9/5 Rating</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Based on 50k+ reviews</p>
                </div>
              </div>

              {/* Floating Badge 2 (Bottom-Right): 24m Avg. Arrival */}
              <div className="absolute -bottom-2 right-2 sm:-bottom-4 sm:right-4 z-30 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3 px-3.5 sm:px-4 shadow-xl shadow-slate-900/5 flex items-center gap-3">
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-orange-50 border border-orange-200 text-orange-500 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-500"></span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-tight">24m Avg. Arrival</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Fastest in Bangalore</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Full-width Social Proof & Trust Badges Strip */}
        <div className="mt-16 pt-8 border-t border-orange-100 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          {/* Customer Avatar Stack & Star Rating */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2.5 overflow-hidden">
              <img
                className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                alt="Customer"
              />
              <img
                className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                alt="Customer"
              />
              <img
                className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover"
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80"
                alt="Customer"
              />
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent text-white text-xs font-black ring-2 ring-white shadow-sm">
                +38k
              </div>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1 text-amber-500 text-sm">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="font-extrabold text-slate-900 ml-1.5">4.9 / 5</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Over 38,000+ satisfied homeowners served</p>
            </div>
          </div>

          {/* 4 Trust Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto text-xs text-slate-700">
            <div className="flex items-center gap-2 bg-white py-2.5 px-3.5 rounded-xl border border-orange-100 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="font-semibold text-slate-800">100% Verified</span>
            </div>
            <div className="flex items-center gap-2 bg-white py-2.5 px-3.5 rounded-xl border border-orange-100 shadow-sm">
              <Clock className="w-4 h-4 text-brand-accent flex-shrink-0" />
              <span className="font-semibold text-slate-800">30-Min Arrival</span>
            </div>
            <div className="flex items-center gap-2 bg-white py-2.5 px-3.5 rounded-xl border border-orange-100 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="font-semibold text-slate-800">Standard Pricing</span>
            </div>
            <div className="flex items-center gap-2 bg-white py-2.5 px-3.5 rounded-xl border border-orange-100 shadow-sm">
              <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="font-semibold text-slate-800">30-Day Warranty</span>
            </div>
          </div>
        </div>

      </section>

      {/* 4 Feature Cards directly under hero matching Screen 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5A1F] flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Verified Professionals</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5A1F] flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Transparent Pricing</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5A1F] flex items-center justify-center flex-shrink-0">
            <Navigation className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Real-Time Tracking</span>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5A1F] flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-800">Secure Payments</span>
        </div>
      </div>

      {/* 2. POPULAR SERVICES SECTION */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <SectionHeading
            badge="Categories"
            title="Popular"
            highlight="Services"
            subtitle="Book certified professionals for everyday home maintenance, repairs, and sanitization."
            align="left"
          />
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FF5A1F] hover:text-orange-700 transition-colors group self-start sm:self-auto"
          >
            <span>View all</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Live MongoDB Services Grid */}
        {servicesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-pulse">
                <div className="h-44 bg-slate-200 rounded-xl w-full" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
                <div className="pt-3 border-t border-slate-100 flex justify-between">
                  <div className="h-4 bg-slate-200 rounded w-16" />
                  <div className="h-7 bg-slate-200 rounded-lg w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : servicesError ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-md mx-auto space-y-3">
            <p className="text-sm font-semibold text-rose-600">{servicesError}</p>
            <button
              onClick={fetchServices}
              className="bg-brand-accent hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
            >
              Retry Loading Services
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service) => (
              <ServiceCard key={service._id || service.slug} service={service} />
            ))}
          </div>
        )}

        {/* Promo Card matching Mockup Screen 1: Your Home. Our Priority. */}
        <div className="mt-14 bg-[#FFF5EE] rounded-3xl p-6 sm:p-10 border border-orange-200/60 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden shadow-xs">
          <div className="space-y-3 max-w-md">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              Your Home. <span className="text-[#FF5A1F]">Our Priority.</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Quality services. Trusted technicians. Peace of mind.
            </p>
            <div className="pt-1">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-orange-500/25 active:scale-95"
              >
                Book Now
              </Link>
            </div>
          </div>
          <div className="w-full sm:w-72 h-44 rounded-2xl overflow-hidden shadow-sm flex-shrink-0">
            <img
              src="https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=600&q=80"
              alt="Cozy Home Living Room"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* 3. HOW HOMESERVE WORKS (4 Connected Steps) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden border border-slate-800 shadow-xl">
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none" />

          <SectionHeading
            badge="Simple Process"
            title="How HomeServe"
            highlight="Works"
            subtitle="Get reliable, verified home repair assistance at your doorstep in four easy steps."
            dark
            align="center"
            className="mb-14"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {workflowSteps.map((step, idx) => (
              <div
                key={step.num}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 relative group hover:bg-white/10 hover:border-brand-accent/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <span className="text-4xl font-black text-brand-accent/40 group-hover:text-brand-accent transition-colors block mb-2">
                    {step.num}
                  </span>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-accent transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Step {idx + 1} of 4</span>
                  <span className="w-2 h-2 rounded-full bg-brand-accent/50 group-hover:bg-brand-accent"></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. WHY CHOOSE HOMESERVE? (6 Future Capability Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Our Guarantee"
          title="Why Choose"
          highlight="HomeServe?"
          subtitle="Built on trust, speed, and uncompromising service quality for homeowners."
          align="center"
          className="mb-12"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {whyChooseFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-brand-accent/30 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-orange-50 text-brand-accent flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-brand-accent group-hover:text-white transition-all duration-200">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5 group-hover:text-brand-accent transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>HomeServe Certified Promise</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. TOP RATED PROFESSIONALS (Fictional Demo Data) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <SectionHeading
            badge="Verified Experts"
            title="Top Rated"
            highlight="Professionals"
            subtitle="Meet experienced local technicians dedicated to delivering quality craftsmanship."
            align="left"
          />
          <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-medium self-start sm:self-auto">
            Simulated Demo Profiles
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {techniciansData.map((tech) => (
            <TechnicianCard key={tech.id} technician={tech} />
          ))}
        </div>
      </section>

      {/* 6. WHAT OUR CUSTOMERS SAY (Testimonials) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Customer Reviews"
          title="What Our Customers"
          highlight="Say"
          subtitle="Real experiences from satisfied homeowners across the city."
          align="center"
          className="mb-12"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonialsData.map((test) => (
            <TestimonialCard key={test.id} testimonial={test} />
          ))}
        </div>
      </section>

      {/* 7. CTA SECTION (Dark banner with orange accent) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-dark-hero rounded-3xl p-8 sm:p-12 lg:p-16 text-center text-white border border-white/10 relative overflow-hidden shadow-2xl">
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-accent/20 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <span className="text-brand-accent text-xs font-bold uppercase tracking-widest bg-brand-accent/15 px-3 py-1 rounded-full border border-brand-accent/30">
              Need A Service At Home?
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Book a Trusted Professional <br />
              <span className="text-brand-accent">Today</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg mx-auto">
              Get transparent pricing, background-verified specialists, and a 30-day warranty on every booking.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/services"
                className="w-full sm:w-auto bg-brand-accent hover:bg-brand-600 text-white font-bold text-sm px-8 py-3.5 rounded-2xl transition-all duration-200 shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Book a Service</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#services"
                className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white font-semibold text-sm px-6 py-3.5 rounded-2xl border border-white/10 transition-colors"
              >
                Explore Categories
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PRESERVED FULL-STACK HEALTH CHECK CARD (For continuous verification) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">System Architecture & Health</h3>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">Backend Live Sync</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Continuous status monitor communicating with Node.js Express server and MongoDB.
              </p>
            </div>

            <button
              onClick={fetchHealth}
              disabled={healthLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin text-brand-accent' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
            {/* Express API */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-brand-accent" /> Express API
                </span>
                {healthData?.success ? (
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Online</span>
                ) : (
                  <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md">Offline</span>
                )}
              </div>
              <p className="text-slate-800 font-medium truncate">
                {healthData?.message || healthError || 'Connecting...'}
              </p>
            </div>

            {/* MongoDB */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-brand-accent" /> MongoDB
                </span>
                {healthData?.database === 'connected' ? (
                  <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Connected</span>
                ) : (
                  <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md">{healthData?.database || 'Disconnected'}</span>
                )}
              </div>
              <p className="text-slate-800 font-medium capitalize">
                Database: {healthData?.database || 'Querying...'}
              </p>
            </div>

            {/* Latency */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand-accent" /> Axios Latency
                </span>
                <span className="text-emerald-600 font-bold">{latency !== null ? `${latency} ms` : '--'}</span>
              </div>
              <p className="text-slate-800 font-medium">
                Last checked: {lastChecked || 'Just now'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Responsive Navigation Bar */}
      <MobileBottomNav />

    </div>
  );
};

export default HomePage;
