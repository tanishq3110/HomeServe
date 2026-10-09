import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Shield, 
  Tag, 
  Calendar, 
  Zap, 
  Wrench, 
  Sparkles, 
  Paintbrush, 
  Hammer 
} from 'lucide-react';

const AuthBrandingPanel = ({
  headline = 'Your Home. Our Experts.',
  highlightWord = 'Our Experts.',
  titlePrefix = 'Your Home.',
  subtitle = 'Book trusted professionals for all your home service needs.',
}) => {
  return (
    <div className="lg:w-[46%] bg-dark-hero text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
      
      {/* Background subtle radial orange glow */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-brand-accent/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top: Logo & Tagline */}
      <div className="relative z-10 space-y-6">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-brand-accent flex items-center justify-center text-white shadow-md shadow-orange-950/40 group-hover:scale-105 transition-transform duration-200">
              <Home className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Home<span className="text-brand-accent">Serve</span>
            </span>
          </Link>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-1 pl-0.5">
            Trusted Home Services
          </p>
        </div>

        {/* Main Headline & Supporting Text */}
        <div className="space-y-3 pt-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            {titlePrefix} <br />
            <span className="text-brand-accent">{highlightWord}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm">
            {subtitle}
          </p>
        </div>

        {/* Three Compact Trust Indicators */}
        <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full border border-brand-accent/60 bg-brand-accent/10 flex items-center justify-center text-brand-accent flex-shrink-0 shadow-sm">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-[11px] sm:text-xs">Verified<br className="hidden sm:block" /> professionals</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full border border-brand-accent/60 bg-brand-accent/10 flex items-center justify-center text-brand-accent flex-shrink-0 shadow-sm">
              <Tag className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-[11px] sm:text-xs">Transparent<br className="hidden sm:block" /> pricing</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full border border-brand-accent/60 bg-brand-accent/10 flex items-center justify-center text-brand-accent flex-shrink-0 shadow-sm">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-[11px] sm:text-xs">Easy online<br className="hidden sm:block" /> booking</span>
          </div>
        </div>
      </div>

      {/* Lower Portion Visual: Modern House at Night with Floating Service Badges */}
      <div className="relative mt-8 pt-4 hidden sm:block">
        
        {/* House Image Container */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 aspect-[4/3] bg-slate-900 group">
          <img
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
            alt="Modern home at dusk with warm interior lighting"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          {/* Night gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-hero via-dark-hero/20 to-transparent" />
          
          {/* Subtle curved orange decorative glow */}
          <div className="absolute -bottom-8 -left-8 right-0 h-28 bg-brand-accent/25 blur-2xl rounded-full pointer-events-none" />

          {/* Floating Service Badge: Electrician */}
          <div className="absolute top-6 right-6 bg-dark-surface/85 backdrop-blur-md border border-brand-accent/40 p-2.5 rounded-xl text-brand-accent shadow-xl flex items-center justify-center hover:scale-110 transition-transform">
            <Zap className="w-4 h-4 fill-brand-accent" />
          </div>

          {/* Floating Service Badge: Plumber */}
          <div className="absolute top-16 right-16 bg-dark-surface/85 backdrop-blur-md border border-white/15 p-2 rounded-xl text-slate-200 shadow-xl flex items-center justify-center hover:scale-110 transition-transform">
            <Wrench className="w-3.5 h-3.5" />
          </div>

          {/* Floating Service Badge: Cleaning */}
          <div className="absolute top-28 right-8 bg-dark-surface/85 backdrop-blur-md border border-white/15 p-2 rounded-xl text-slate-200 shadow-xl flex items-center justify-center hover:scale-110 transition-transform">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>

          {/* Floating Service Badge: Painting */}
          <div className="absolute bottom-16 right-20 bg-dark-surface/85 backdrop-blur-md border border-white/15 p-2 rounded-xl text-slate-200 shadow-xl flex items-center justify-center hover:scale-110 transition-transform">
            <Paintbrush className="w-3.5 h-3.5 text-emerald-400" />
          </div>

          {/* Floating Service Badge: Carpenter */}
          <div className="absolute bottom-8 right-6 bg-dark-surface/85 backdrop-blur-md border border-brand-accent/40 p-2.5 rounded-xl text-brand-accent shadow-xl flex items-center justify-center hover:scale-110 transition-transform">
            <Hammer className="w-4 h-4" />
          </div>
        </div>

        {/* Elegant Bottom Slogan */}
        <div className="pt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium tracking-wide">
          <span>Better Homes</span>
          <span className="text-brand-accent">•</span>
          <span>Happier Lives</span>
        </div>
      </div>

    </div>
  );
};

export default AuthBrandingPanel;

