import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Wallet, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function BottomNavbar() {
  const { user, isAdmin, signOut } = useAuth();

  if (!user) return null;

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/finance', icon: Wallet, label: 'Finance' },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', icon: Settings, label: 'Settings' });
  }

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800/80 rounded-[2rem] p-3 shadow-2xl">
        <div className="flex items-center justify-between gap-2">
          {/* Navigation Items */}
          <div className="flex items-center gap-1 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 
                  `flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all flex-1 ${
                    isActive 
                      ? 'bg-lime-400 text-zinc-950 shadow-lg' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Divider */}
          <div className="w-[1px] h-12 bg-zinc-800" />

          {/* Logout Button */}
          <button
            onClick={signOut}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-zinc-600 hover:text-red-400 hover:bg-zinc-800/50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
