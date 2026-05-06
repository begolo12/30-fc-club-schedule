import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Wallet, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function BottomNavbar() {
  const { user, isAdmin, signOut } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-2 flex items-center justify-around shadow-2xl">
        <NavLink 
          to="/" 
          className={({ isActive }) => `p-3 rounded-2xl transition-all ${isActive ? 'bg-lime-400 text-zinc-950 shadow-[0_0_15px_rgba(163,230,53,0.3)]' : 'text-zinc-500'}`}
        >
          <Home className="w-6 h-6" />
        </NavLink>
        
        <NavLink 
          to="/calendar" 
          className={({ isActive }) => `p-3 rounded-2xl transition-all ${isActive ? 'bg-lime-400 text-zinc-950 shadow-[0_0_15px_rgba(163,230,53,0.3)]' : 'text-zinc-500'}`}
        >
          <Calendar className="w-6 h-6" />
        </NavLink>

        <NavLink 
          to="/finance" 
          className={({ isActive }) => `p-3 rounded-2xl transition-all ${isActive ? 'bg-lime-400 text-zinc-950 shadow-[0_0_15px_rgba(163,230,53,0.3)]' : 'text-zinc-500'}`}
        >
          <Wallet className="w-6 h-6" />
        </NavLink>

        {isAdmin && (
          <NavLink 
            to="/admin" 
            className={({ isActive }) => `p-3 rounded-2xl transition-all ${isActive ? 'bg-lime-400 text-zinc-950 shadow-[0_0_15px_rgba(163,230,53,0.3)]' : 'text-zinc-500'}`}
          >
            <Settings className="w-6 h-6" />
          </NavLink>
        )}

        <button 
          onClick={signOut}
          className="p-3 rounded-2xl text-zinc-500 hover:text-red-400 transition-all"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
}
