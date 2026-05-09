import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Home, Calendar, Wallet, Settings, LogOut, ChevronLeft, ChevronRight, Menu, Map as MapIcon, Megaphone, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const { user, isAdmin, role, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user) return null;

  const navItems = [
    { to: '/', icon: Home, label: 'Beranda' },
    { to: '/calendar', icon: Calendar, label: 'Kalender' },
    // { to: '/map', icon: MapIcon, label: 'Maps' }, // Hidden temporarily
    { to: '/finance', icon: Wallet, label: 'Kas' },
    { to: '/inventory', icon: MapIcon, label: 'Inventaris' },
    { to: '/announcements', icon: Megaphone, label: 'Pengumuman' },
    { to: '/polling', icon: BarChart3, label: 'Polling' },
  ];

  if (isAdmin || role === 'Ketua Club') {
    navItems.push({ to: '/admin', icon: Settings, label: 'Settings' });
  }

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col bg-zinc-950 border-r border-zinc-900 transition-all duration-300 sticky top-0 h-screen shrink-0",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <Link to="/" className="flex items-center gap-3 animate-in fade-in duration-300">
            <img src="/logo.png" alt="Thirty FC" className="w-8 h-8 rounded-lg object-cover" />
            <h1 className="text-lg font-bold tracking-tight uppercase">Thirty FC</h1>
          </Link>
        )}
        {isCollapsed && (
          <img src="/logo.png" alt="Thirty FC" className="w-8 h-8 rounded-lg object-cover mx-auto" />
        )}
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group relative",
              isActive 
                ? "bg-lime-400 text-zinc-950 shadow-[0_0_15px_rgba(163,230,53,0.2)]" 
                : "text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-bold uppercase tracking-widest text-[10px] animate-in fade-in duration-300">{item.label}</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {item.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-900">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-3 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 rounded-xl transition-all mb-2"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        
        <div className={cn(
          "flex items-center gap-3 p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800/50",
          isCollapsed ? "justify-center" : "px-4"
        )}>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lime-400 font-bold overflow-hidden shrink-0">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (user.displayName || 'U')[0]
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-in fade-in duration-300">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter truncate">{user.displayName}</p>
              <button onClick={signOut} className="text-[9px] text-zinc-600 hover:text-red-400 font-bold uppercase tracking-widest flex items-center gap-1 transition-colors">
                <LogOut className="w-3 h-3" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
