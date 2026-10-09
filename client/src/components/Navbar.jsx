import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Menu, 
  X, 
  MapPin, 
  ChevronDown, 
  User, 
  LogOut, 
  ShieldCheck, 
  Wrench, 
  Sparkles,
  Calendar 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Bangalore');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const cities = ['Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune'];

  const handleLogout = () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    logout();
    navigate('/', { replace: true });
  };

  const navLinkClasses = ({ isActive }) =>
    `text-sm font-medium transition-colors relative py-1 ${
      isActive
        ? 'text-brand-accent font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-accent after:rounded-full'
        : 'text-white/80 hover:text-white'
    }`;

  const mobileNavLinkClasses = ({ isActive }) =>
    `block text-base font-medium px-3 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-brand-accent/20 text-brand-accent font-semibold'
        : 'text-white/80 hover:text-white hover:bg-white/5'
    }`;

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <header className="bg-dark-hero text-white border-b border-white/10 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Brand Logo & City Selector */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-brand-accent flex items-center justify-center text-white shadow-md shadow-orange-950/40 group-hover:scale-105 transition-transform duration-200">
                <Home className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Home<span className="text-brand-accent">Serve</span>
              </span>
            </Link>

            {/* City Selector Pill */}
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 px-2.5 py-1.5 rounded-lg border border-white/10 transition-colors"
                title="Select City (UI Simulation)"
              >
                <MapPin className="w-3.5 h-3.5 text-brand-accent" />
                <span className="font-medium">{selectedCity}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {cityDropdownOpen && (
                <div className="absolute top-full mt-1.5 left-0 w-36 bg-dark-surface border border-white/15 rounded-xl shadow-xl py-1 z-50">
                  {cities.map((city) => (
                    <button
                      key={city}
                      onClick={() => {
                        setSelectedCity(city);
                        setCityDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        selectedCity === city
                          ? 'text-brand-accent font-bold bg-white/5'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavLink to="/" end className={navLinkClasses}>
              Home
            </NavLink>
            <NavLink to="/services" className={navLinkClasses}>
              Services
            </NavLink>
            {user?.role === 'CUSTOMER' && (
              <NavLink to="/bookings" className={navLinkClasses}>
                My Bookings
              </NavLink>
            )}
            {user?.role === 'TECHNICIAN' && (
              <NavLink to="/technician/dashboard" className={navLinkClasses}>
                Technician Hub
              </NavLink>
            )}
            {user?.role === 'ADMIN' && (
              <>
                <NavLink to="/admin/technicians" className={navLinkClasses}>
                  Technicians
                </NavLink>
                <NavLink to="/admin/bookings" className={navLinkClasses}>
                  Bookings
                </NavLink>
              </>
            )}
            <a href="/#how-it-works" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              How It Works
            </a>
            <a href="/#contact" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Contact
            </a>
          </nav>

          {/* Desktop Right Side: Auth / User State */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-white/10 transition-colors cursor-pointer"
                >
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-brand-accent text-white font-bold text-xs flex items-center justify-center">
                      {initials}
                    </div>
                  )}

                  <div className="text-left">
                    <span className="text-xs font-bold text-white block leading-tight">
                      {firstName}
                    </span>
                    <span className="text-[10px] text-brand-accent uppercase font-semibold">
                      {user?.role}
                    </span>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* User Dropdown */}
                {userDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-dark-surface border border-white/15 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in">
                    <div className="px-4 py-2.5 border-b border-white/10">
                      <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <User className="w-4 h-4 text-brand-accent" />
                      <span>My Profile</span>
                    </Link>

                    {user?.role === 'CUSTOMER' && (
                      <Link
                        to="/bookings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Calendar className="w-4 h-4 text-brand-accent" />
                        <span>My Bookings</span>
                      </Link>
                    )}

                    {user?.role === 'TECHNICIAN' && (
                      <>
                        <Link
                          to="/technician/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Wrench className="w-4 h-4 text-brand-accent" />
                          <span>Technician Dashboard</span>
                        </Link>
                        <Link
                          to="/technician/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-brand-accent" />
                          <span>Skills & Documents</span>
                        </Link>
                      </>
                    )}

                    {user?.role === 'ADMIN' && (
                      <>
                        <Link
                          to="/admin/technicians"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-brand-accent" />
                          <span>Manage Technicians</span>
                        </Link>
                        <Link
                          to="/admin/bookings"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Calendar className="w-4 h-4 text-brand-accent" />
                          <span>Manage Bookings</span>
                        </Link>
                      </>
                    )}

                    <div className="pt-1 border-t border-white/10">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-white/90 hover:text-white px-3.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-bold text-white bg-brand-accent hover:bg-brand-600 px-4 py-2 rounded-xl shadow-sm transition-all duration-200 active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-dark-surface border-b border-white/10 px-4 pt-3 pb-6 space-y-3">
          {/* User state in mobile */}
          {isAuthenticated ? (
            <div className="pb-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-accent text-white font-bold text-xs flex items-center justify-center">
                  {initials}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{user?.name}</p>
                  <span className="text-[10px] text-brand-accent uppercase font-semibold">
                    {user?.role} Account
                  </span>
                </div>
              </div>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs bg-white/10 text-white font-semibold px-2.5 py-1 rounded-lg"
              >
                Profile
              </Link>
            </div>
          ) : (
            <div className="pb-2 border-b border-white/10 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-accent" />
                <span>City: <strong>{selectedCity}</strong></span>
              </span>
              <span className="text-[10px] text-slate-400">(Bangalore Hub)</span>
            </div>
          )}

          <div className="space-y-1">
            <NavLink
              to="/"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClasses}
            >
              Home
            </NavLink>
            <NavLink
              to="/services"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClasses}
            >
              Services
            </NavLink>
            <a
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5"
            >
              How It Works
            </a>
            <a
              href="/#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-medium text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5"
            >
              Contact
            </a>
            {isAuthenticated && (
              <NavLink
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClasses}
              >
                My Account
              </NavLink>
            )}
            {isAuthenticated && user?.role === 'CUSTOMER' && (
              <NavLink
                to="/bookings"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClasses}
              >
                My Bookings
              </NavLink>
            )}
            {isAuthenticated && user?.role === 'TECHNICIAN' && (
              <>
                <NavLink
                  to="/technician/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClasses}
                >
                  Technician Dashboard
                </NavLink>
                <NavLink
                  to="/technician/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClasses}
                >
                  Skills & Documents
                </NavLink>
              </>
            )}
            {isAuthenticated && user?.role === 'ADMIN' && (
              <>
                <NavLink
                  to="/admin/technicians"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClasses}
                >
                  Manage Technicians
                </NavLink>
                <NavLink
                  to="/admin/bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClasses}
                >
                  Manage Bookings
                </NavLink>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-center text-sm font-bold text-rose-400 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center text-sm font-semibold text-white py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center text-sm font-bold text-white py-2.5 rounded-xl bg-brand-accent hover:bg-brand-600 transition-colors shadow-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
