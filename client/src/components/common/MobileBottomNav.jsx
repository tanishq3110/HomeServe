import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CalendarCheck, MessageSquare, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Mobile Bottom Navigation Bar (Screens 4 & Mobile Responsive Views)
 */
const MobileBottomNav = () => {
  const { isAuthenticated } = useAuth();

  const navItems = [
    { label: 'Home', to: '/', icon: Home },
    { label: 'Bookings', to: isAuthenticated ? '/bookings' : '/login', icon: CalendarCheck },
    { label: 'Chat', to: '#chat', icon: MessageSquare, isDummy: true },
    { label: 'Profile', to: isAuthenticated ? '/profile' : '/login', icon: User },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-lg"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        if (item.isDummy) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => alert('Real-time chat is part of the upcoming customer support phase.')}
              className="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        }

        return (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[11px] font-bold transition-colors ${
                isActive ? 'text-[#FF5A1F]' : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#FF5A1F]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
