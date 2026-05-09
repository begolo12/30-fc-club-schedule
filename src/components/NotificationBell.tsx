import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Bell, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'match' | 'payment' | 'announcement' | 'general';
  read: boolean;
  createdAt: number;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
    });
    return unsub;
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'match': return '⚽';
      case 'payment': return '💰';
      case 'announcement': return '📢';
      default: return '🔔';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen && unreadCount > 0) markAllRead(); }}
        className="relative p-2.5 text-zinc-500 hover:text-lime-400 hover:bg-zinc-900 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 max-h-[70vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Notifikasi</h4>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Belum ada notifikasi</p>
                </div>
              ) : notifications.map(n => (
                <div key={n.id} className={cn("px-4 py-3 border-b border-zinc-800/50 last:border-b-0", !n.read && "bg-lime-400/5")}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-zinc-200 uppercase tracking-tight">{n.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[9px] text-zinc-600 mt-1">{format(n.createdAt, 'd MMM, HH:mm', { locale: idLocale })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
