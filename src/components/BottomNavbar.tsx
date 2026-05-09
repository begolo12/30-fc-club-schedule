import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Wallet, Settings, LogOut, Megaphone, BarChart3, MoreHorizontal, X, Package, Trophy, Image } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function BottomNavbar() {
  const { user, isAdmin, role, signOut } = useAuth();
  const [showMore, setShowMore] = useState(false);

  if (!user) return null;

  const mainItems = [
    { to: '/', icon: Home, label: 'Beranda' },
    { to: '/calendar', icon: Calendar, label: 'Jadwal' },
    { to: '/finance', icon: Wallet, label: 'Kas' },
    { to: '/polling', icon: BarChart3, label: 'Polling' },
  ];

  const moreItems = [
    { to: '/stats', icon: Trophy, label: 'Statistik' },
    { to: '/gallery', icon: Image, label: 'Gallery' },
    { to: '/announcements', icon: Megaphone, label: 'Pengumuman' },
    { to: '/inventory', icon: Package, label: 'Inventaris' },
    ...(isAdmin || role === 'Ketua Club' ? [{ to: '/admin', icon: Settings, label: 'Settings' }] : []),
  ];

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <div className="absolute bottom-24 left-4 right-4 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) => `flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${isActive ? 'bg-lime-400/10 text-lime-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                </NavLink>
              ))}
              <button onClick={() => { if (window.confirm('Yakin mau keluar?')) { signOut(); setShowMore(false); } }} className="flex flex-col items-center gap-2 p-3 rounded-2xl text-red-400 hover:bg-red-400/10 transition-all">
                <LogOut className="w-5 h-5" />
                <span className="text-[9px] font-black uppercase tracking-widest">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-4 left-0 right-0 z-50 md:hidden flex justify-center px-4">
        <div className="w-full max-w-md bg-zinc-900/95 backdrop-blur-md border border-zinc-800/80 rounded-[2rem] px-3 py-2 shadow-2xl">
          <div className="flex items-center justify-around">
            {mainItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 
                  `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                    isActive ? 'bg-lime-400 text-zinc-950 shadow-lg' : 'text-zinc-500'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              </NavLink>
            ))}
            <button
              onClick={() => setShowMore(!showMore)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${showMore ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500'}`}
            >
              {showMore ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
              <span className="text-[10px] font-bold uppercase tracking-wider">Lainnya</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
