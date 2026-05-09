import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, arrayUnion, serverTimestamp, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { Megaphone, Send, X, User, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt?: Timestamp;
  author?: string;
  audience?: 'all' | 'admins';
  closed?: boolean;
  seenBy?: string[];
  reactions?: Record<string, string[]>;
}

const REACTIONS = ['👍', '🔥', '❤️', '👏'];

export default function Announcements() {
  const { isAdmin, role, user, nickname } = useAuth();
  const canPost = isAdmin || role === 'Ketua Club' || role === 'Sekretaris';
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'all' | 'admins'>('all');
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'active' | 'closed'>('active');

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setAnnouncements(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'announcements'));
    return unsub;
  }, []);

  // Mark as seen when viewing
  useEffect(() => {
    if (!user) return;
    announcements.filter(a => !a.closed && !(a.seenBy || []).includes(user.uid)).forEach(a => {
      updateDoc(doc(db, 'announcements', a.id), { seenBy: arrayUnion(user.uid) }).catch(() => {});
    });
  }, [announcements, user]);

  const submit = async () => {
    if (!title.trim() || !message.trim()) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        title: title.trim(),
        message: message.trim(),
        audience,
        author: nickname || user?.displayName || 'Admin',
        createdAt: serverTimestamp(),
        closed: false,
        seenBy: [],
        reactions: {},
      });
      if (audience === 'all') {
        const usersSnap = await getDocs(collection(db, 'users'));
        usersSnap.forEach(u => {
          addDoc(collection(db, 'users', u.id, 'notifications'), {
            title: `📢 ${title.trim()}`,
            message: message.trim(),
            type: 'announcement',
            link: '/announcements',
            read: false,
            createdAt: Date.now(),
          }).catch(() => {});
        });
      }
      setTitle(''); setMessage(''); setAudience('all'); setShowForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'announcements');
    }
  };

  const handleClose = async (id: string) => {
    if (!window.confirm('Tutup pengumuman ini?')) return;
    await updateDoc(doc(db, 'announcements', id), { closed: true }).catch(() => {});
  };

  const handleReaction = async (a: Announcement, emoji: string) => {
    if (!user) return;
    const reactions = { ...(a.reactions || {}) };
    const users = reactions[emoji] || [];
    if (users.includes(user.uid)) {
      reactions[emoji] = users.filter(u => u !== user.uid);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, user.uid];
    }
    await updateDoc(doc(db, 'announcements', a.id), { reactions }).catch(() => {});
  };

  const filtered = announcements.filter(a => tab === 'active' ? !a.closed : a.closed);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24 md:pb-12">
      <header className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-lime-400">Pengumuman</h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Info penting untuk klub</p>
        </div>
        {canPost && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-lime-400 text-zinc-950 text-[10px] font-black uppercase tracking-widest">
            {showForm ? 'Tutup' : '+ Buat'}
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex bg-zinc-900 border border-zinc-800 rounded-2xl p-1">
        <button onClick={() => setTab('active')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'active' ? 'bg-lime-400 text-zinc-950 shadow-lg' : 'text-zinc-500'}`}>
          Aktif ({announcements.filter(a => !a.closed).length})
        </button>
        <button onClick={() => setTab('closed')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'closed' ? 'bg-lime-400 text-zinc-950 shadow-lg' : 'text-zinc-500'}`}>
          Selesai ({announcements.filter(a => a.closed).length})
        </button>
      </div>

      {/* Form */}
      {showForm && canPost && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <input className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none" value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul pengumuman" />
          <textarea className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none" value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Isi pesan..." />
          <div className="flex gap-2">
            <select className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-[10px] font-black uppercase text-zinc-400 outline-none" value={audience} onChange={e => setAudience(e.target.value as any)}>
              <option value="all">Semua anggota</option>
              <option value="admins">Pengurus saja</option>
            </select>
            <button onClick={submit} className="px-6 py-3 rounded-xl bg-lime-400 text-zinc-950 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Send className="w-3.5 h-3.5" /> Kirim
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-3xl p-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{tab === 'active' ? 'Tidak ada pengumuman aktif' : 'Belum ada pengumuman selesai'}</p>
          </div>
        ) : filtered.map(a => (
          <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-lime-400/10 text-lime-400 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-zinc-100 uppercase tracking-tight truncate">{a.title}</h4>
                  {a.audience === 'admins' && <span className="px-2 py-0.5 rounded-full border border-amber-400/30 text-amber-400 text-[9px] font-black uppercase">Pengurus</span>}
                </div>
                <p className="text-xs text-zinc-300 whitespace-pre-wrap mt-1">{a.message}</p>
                <div className="flex items-center gap-3 text-[10px] text-zinc-600 font-bold mt-2">
                  <span>{a.author}</span>
                  <span>{a.createdAt?.toDate ? format(a.createdAt.toDate(), 'd MMM yyyy, HH:mm', { locale: idLocale }) : '-'}</span>
                </div>
              </div>
              {canPost && !a.closed && (
                <button onClick={() => handleClose(a.id)} className="text-[9px] font-black text-zinc-600 uppercase hover:text-red-400 shrink-0">Tutup</button>
              )}
            </div>

            {/* Reactions */}
            <div className="flex items-center gap-2 pl-13">
              {REACTIONS.map(emoji => {
                const count = (a.reactions?.[emoji] || []).length;
                const myReacted = (a.reactions?.[emoji] || []).includes(user?.uid || '');
                return (
                  <button key={emoji} onClick={() => handleReaction(a, emoji)} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm transition-all", myReacted ? "bg-lime-400/10 border-lime-400/30" : "bg-zinc-950 border-zinc-800 hover:border-zinc-600")}>
                    <span className="text-xs">{emoji}</span>
                    {count > 0 && <span className="text-[9px] font-black text-zinc-400">{count}</span>}
                  </button>
                );
              })}
            </div>

            {/* Seen indicator */}
            <div className="flex items-center gap-1.5 pl-13 text-[9px] text-zinc-600 font-bold">
              <Eye className="w-3 h-3" />
              <span>Dilihat {(a.seenBy || []).length} orang</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
