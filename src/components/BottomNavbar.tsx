import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Wallet, Settings, LogOut, Map as MapIcon, Megaphone, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function BottomNavbar() {
  const { user, isAdmin, role, signOut } = useAuth();

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
    <nav className="fixed bottom-4 left-0 right-0 z-50 md:hidden flex justify-center px-4">
      <div className="w-full max-w-3xl bg-zinc-900/90 backdrop-blur-md border border-zinc-800/80 rounded-[2rem] px-2 py-2 shadow-2xl">
        <div className="grid items-center gap-1" style={{ gridTemplateColumns: `repeat(${navItems.length + 1}, minmax(0, 1fr))` }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `min-w-0 flex flex-col items-center gap-1 px-1 py-2 rounded-xl transition-all text-center ${
                  isActive 
                    ? 'bg-lime-400 text-zinc-950 shadow-lg' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="text-[8px] font-bold uppercase tracking-[0.08em] leading-none truncate max-w-full">{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={signOut}
            className="min-w-0 flex flex-col items-center gap-1 px-1 py-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-zinc-800/60 transition-all text-center"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="text-[8px] font-bold uppercase tracking-[0.08em] leading-none truncate max-w-full">Keluar</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
