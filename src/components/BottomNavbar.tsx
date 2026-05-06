import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Wallet, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function BottomNavbar() {
  const { user, isAdmin, signOut } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden w-auto">
      <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800/80 rounded-[2rem] p-1.5 flex items-center gap-1 shadow-2xl">
        <NavLink 
          to="/" 
          className={({ isActive }) => `p-2.5 rounded-full transition-all ${isActive ? 'bg-lime-400 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Home className="w-5 h-5" />
        </NavLink>
        
        <NavLink 
          to="/calendar" 
          className={({ isActive }) => `p-2.5 rounded-full transition-all ${isActive ? 'bg-lime-400 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Calendar className="w-5 h-5" />
        </NavLink>

        <NavLink 
          to="/finance" 
          className={({ isActive }) => `p-2.5 rounded-full transition-all ${isActive ? 'bg-lime-400 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Wallet className="w-5 h-5" />
        </NavLink>

        {isAdmin && (
          <NavLink 
            to="/admin" 
            className={({ isActive }) => `p-2.5 rounded-full transition-all ${isActive ? 'bg-lime-400 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Settings className="w-5 h-5" />
          </NavLink>
        )}

        <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

        <button 
          onClick={signOut}
          className="p-2.5 rounded-full text-zinc-600 hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
