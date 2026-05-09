import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { Megaphone, Send, X, AlertTriangle, User } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt?: any;
  author?: string;
  audience?: 'all' | 'admins';
}

export default function Announcements() {
  const { isAdmin, role, user } = useAuth();
  const canPost = isAdmin || role === 'Ketua Club' || role === 'Sekretaris';
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'all' | 'admins'>('all');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Announcement[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'announcements'));
    return unsub;
  }, []);

  const submit = async () => {
    if (!title.trim() || !message.trim()) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        title: title.trim(),
        message: message.trim(),
        audience,
        author: user?.displayName || 'Admin',
        createdAt: serverTimestamp(),
      });
      // Broadcast to all users' notification inbox
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
      setTitle('');
      setMessage('');
      setAudience('all');
      setShowForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'announcements');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24 md:pb-12">
      <header className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-lime-400">Pengumuman</h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">Sampaikan info penting ke seluruh klub</p>
        </div>
        {canPost && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-3 rounded-2xl bg-lime-400 text-zinc-950 text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-[1.01] transition"
          >
            {showForm ? 'Tutup' : 'Buat Pengumuman'}
          </button>
        )}
      </header>

      {showForm && canPost && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Judul</label>
            <input
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm focus:border-lime-400 outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Laga dipindah ke Lapangan B"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pesan</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm focus:border-lime-400 outline-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Tuliskan informasi penting, waktu, dan aksi yang dibutuhkan."
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Audiens</label>
            <select
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm focus:border-lime-400 outline-none"
              value={audience}
              onChange={(e) => setAudience(e.target.value as 'all' | 'admins')}
            >
              <option value="all">Semua anggota</option>
              <option value="admins">Pengurus saja</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-3 rounded-xl border border-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:border-zinc-700"
            >
              Batal
            </button>
            <button
              onClick={submit}
              className="px-4 py-3 rounded-xl bg-lime-400 text-zinc-950 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:scale-[1.01] transition"
            >
              <Send className="w-4 h-4" /> Kirim
            </button>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Daftar Pengumuman</h3>
          <span className="text-[10px] text-zinc-600 font-bold uppercase">{announcements.length} pesan</span>
        </div>

        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-lime-400/10 text-lime-300 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-lg text-zinc-100 truncate">{a.title}</h4>
                  {a.audience === 'admins' && (
                    <span className="px-2 py-1 rounded-full border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-widest">Pengurus</span>
                  )}
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{a.message}</p>
                <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {a.author || 'Admin'}</span>
                  <span>{a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString('id-ID') : '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {announcements.length === 0 && (
          <div className="text-center py-10 text-zinc-600 text-sm font-bold uppercase tracking-[0.2em] flex flex-col items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Belum ada pengumuman
          </div>
        )}
      </section>
    </div>
  );
}
