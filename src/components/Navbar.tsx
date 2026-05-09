import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, CalendarDays } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="w-full max-w-6xl mx-auto px-4 py-4 md:py-6 flex justify-between items-center bg-zinc-950 shrink-0 border-b border-zinc-900/50 md:border-none">
      <Link to="/" className="flex items-center gap-3 group">
        <img src="/logo.png" alt="Thirty FC" className="w-10 h-10 rounded-lg object-cover group-hover:scale-105 transition-transform duration-300" />
        <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">
          Thirty FC <span className="text-zinc-500 font-medium hidden sm:inline">Club</span>
        </h1>
      </Link>
      
      {user && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <ThemeToggle />
          <NotificationBell />
          <div className="flex items-center gap-3 md:pl-4 md:border-l border-zinc-800">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">User</p>
              <p className="text-zinc-200">{user.displayName}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lime-400 font-bold overflow-hidden shadow-inner">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                (user.displayName || "U")[0].toUpperCase()
              )}
            </div>
          </div>
          <button
            onClick={signOut}
            className="p-2.5 text-zinc-500 hover:text-lime-400 hover:bg-zinc-900 rounded-full transition-colors flex items-center justify-center"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      )}
    </header>
  );
}
