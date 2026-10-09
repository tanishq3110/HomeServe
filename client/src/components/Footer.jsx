import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Shield, Award, Clock, ArrowRight, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer id="contact" className="bg-dark-hero text-slate-400 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-accent flex items-center justify-center text-white">
                <Home className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Home<span className="text-brand-accent">Serve</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Your trusted home services marketplace. We connect homeowners with verified, high-quality local professionals for all home repair, installation, and cleaning needs.
            </p>

            <div className="pt-2 flex items-center gap-3 text-slate-400">
              {/* Social placeholders */}
              <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors" title="Twitter / X">
                𝕏
              </span>
              <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors" title="LinkedIn">
                in
              </span>
              <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors" title="Instagram">
                ig
              </span>
              <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors" title="Facebook">
                fb
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-white transition-colors">Services Marketplace</Link>
              </li>
              <li>
                <a href="/#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              </li>
              <li>
                <a href="/#contact" className="hover:text-white transition-colors">Contact Support</a>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Services
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/services?category=Electrical" className="hover:text-white transition-colors">Electrician</Link>
              </li>
              <li>
                <Link to="/services?category=Plumbing" className="hover:text-white transition-colors">Plumber</Link>
              </li>
              <li>
                <Link to="/services?category=Cleaning" className="hover:text-white transition-colors">Cleaning</Link>
              </li>
              <li>
                <Link to="/services?category=Painting" className="hover:text-white transition-colors">Painting</Link>
              </li>
              <li>
                <Link to="/services?category=AC+Repair" className="hover:text-white transition-colors">AC Repair</Link>
              </li>
              <li>
                <Link to="/services?category=Carpentry" className="hover:text-white transition-colors">Carpenter</Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><span className="hover:text-white cursor-pointer transition-colors">About Us</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Careers (Hiring!)</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span></li>
            </ul>
          </div>

        </div>

        {/* HomeServe Trust Badges */}
        <div className="py-6 border-y border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-brand-accent flex-shrink-0" />
            <span>100% Background-Verified Specialists</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Award className="w-4 h-4 text-brand-accent flex-shrink-0" />
            <span>30-Day Quality Assurance Guarantee</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-brand-accent flex-shrink-0" />
            <span>Standardized Transparent Pricing</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} HomeServe Technologies Inc. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built for reliable, hyperlocal doorstep care
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
