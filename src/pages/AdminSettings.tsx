import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Camera, Save, CheckCircle2, QrCode, Users, Shield, Briefcase, UserCircle, Search, ChevronRight, Calendar, Plus, Trash2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { cn } from '../lib/utils';

type Role = 'Ketua Club' | 'Kasir' | 'Sekretaris' | 'Admin' | 'Pemain';

interface ClubUser {
  uid: string;
  displayName: string;
  nickname: string;
  email: string;
  role?: Role;
  photoURL?: string;
}

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'rutin'>('general');
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // User Management State
  const [clubUsers, setClubUsers] = useState<ClubUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Recurring Schedule State
  interface RecurringSchedule {
    id?: string;
    title: string;
    location: string;
    dayOfWeek: number; // 0=Sunday, 1=Monday...
    time: string; // HH:mm
    fieldCost: number;
    feePerPlayer: number;
    active: boolean;
  }
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [showRutinForm, setShowRutinForm] = useState(false);
  const [rutinForm, setRutinForm] = useState<RecurringSchedule>({ title: '', location: '', dayOfWeek: 5, time: '20:00', fieldCost: 0, feePerPlayer: 25000, active: true });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'club_info'), (doc) => {
      if (doc.exists()) {
        setQrisUrl(doc.data().qrisUrl);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      setLoadingUsers(true);
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as ClubUser[];
        setClubUsers(users);
        setLoadingUsers(false);
      });
      return unsubscribe;
    }
    if (activeTab === 'rutin') {
      const unsubscribe = onSnapshot(collection(db, 'recurringSchedules'), (snapshot) => {
        setRecurringSchedules(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RecurringSchedule)));
      });
      return unsubscribe;
    }
  }, [activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        await setDoc(doc(db, 'settings', 'club_info'), { qrisUrl: base64 }, { merge: true });
        setQrisUrl(base64);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      setUploading(false);
    }
  };

  const handleSaveRutin = async () => {
    if (!rutinForm.title.trim() || !rutinForm.location.trim()) return;
    try {
      await addDoc(collection(db, 'recurringSchedules'), rutinForm);
      setRutinForm({ title: '', location: '', dayOfWeek: 5, time: '20:00', fieldCost: 0, feePerPlayer: 25000, active: true });
      setShowRutinForm(false);
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'recurring'); }
  };

  const handleGenerateSchedule = async (rs: RecurringSchedule) => {
    // Find next occurrence of the day
    const now = new Date();
    const daysUntil = (rs.dayOfWeek - now.getDay() + 7) % 7 || 7;
    const nextDate = new Date(now.getTime() + daysUntil * 86400000);
    const [h, m] = rs.time.split(':').map(Number);
    nextDate.setHours(h, m, 0, 0);

    try {
      await addDoc(collection(db, 'schedules'), {
        title: rs.title,
        location: rs.location,
        timestamp: nextDate.getTime(),
        type: 'latihan',
        fieldCost: rs.fieldCost,
        dpCost: 0,
        feePerPlayer: rs.feePerPlayer,
        otherCosts: [],
        totalCost: rs.fieldCost,
        status: 'upcoming',
        createdAt: new Date()
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'generate-schedule'); }
  };

  const handleDeleteRutin = async (id: string) => {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'recurringSchedules', id));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, 'recurring'); }
  };

  const updateUserRole = async (uid: string, newRole: Role) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'update-role');
    }
  };

  const filteredUsers = clubUsers.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roles: Role[] = ['Ketua Club', 'Kasir', 'Sekretaris', 'Admin', 'Pemain'];

  const getRoleIcon = (role?: Role) => {
    switch(role) {
      case 'Ketua Club': return <Shield className="w-3 h-3 text-lime-400" />;
      case 'Kasir': return <Briefcase className="w-3 h-3 text-amber-400" />;
      case 'Admin': return <Shield className="w-3 h-3 text-red-400" />;
      default: return <UserCircle className="w-3 h-3 text-zinc-500" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24 md:pb-12">
      <header className="flex flex-col gap-4 px-2">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-lime-400">Admin Settings</h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Configure Club & Manage Members</p>
        </div>

        <div className="flex bg-zinc-900 border border-zinc-800 rounded-2xl p-1">
          <button 
            onClick={() => setActiveTab('general')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'general' ? "bg-lime-400 text-zinc-950 shadow-lg" : "text-zinc-500"
            )}
          >
            General
          </button>
          <button 
            onClick={() => setActiveTab('rutin')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'rutin' ? "bg-lime-400 text-zinc-950 shadow-lg" : "text-zinc-500"
            )}
          >
            Jadwal Rutin
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'users' ? "bg-lime-400 text-zinc-950 shadow-lg" : "text-zinc-500"
            )}
          >
            Players <span className="opacity-60">({clubUsers.length})</span>
          </button>
        </div>
      </header>

      {activeTab === 'general' ? (
        <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-xl mx-2 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-lime-400/10 rounded-xl flex items-center justify-center text-lime-400 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-tight">QRIS Payment</h3>
              <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Update club's payment QR</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative aspect-[3/4] max-w-[280px] mx-auto bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-[2rem] overflow-hidden group">
              {qrisUrl ? (
                <img src={qrisUrl} alt="QRIS" className="w-full h-full object-contain p-4" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 gap-3">
                  <Camera className="w-10 h-10 opacity-20" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em]">No QRIS</span>
                </div>
              )}
              
              <label className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                <div className="flex flex-col items-center gap-2">
                  <Camera className="w-8 h-8 text-lime-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-lime-400">Change</span>
                </div>
              </label>

              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
                  <div className="w-8 h-8 border-3 border-lime-400/20 border-t-lime-400 rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div className="flex justify-center h-4">
              {saveStatus === 'saved' && (
                <div className="flex items-center gap-2 text-lime-400 font-bold text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                  <CheckCircle2 className="w-3 h-3" />
                  QRIS Updated
                </div>
              )}
            </div>
          </div>
        </section>
      ) : activeTab === 'rutin' ? (
        <section className="space-y-4 px-2 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Template Jadwal Mingguan</h3>
            <button onClick={() => setShowRutinForm(!showRutinForm)} className="text-[9px] font-black text-lime-400 uppercase tracking-widest hover:text-lime-300">
              {showRutinForm ? 'Batal' : '+ Tambah'}
            </button>
          </div>

          {showRutinForm && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-3">
              <input type="text" placeholder="Judul (misal: Latihan Mini Soccer Rutin)" value={rutinForm.title} onChange={(e) => setRutinForm({...rutinForm, title: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 outline-none focus:border-lime-400/50 placeholder:text-zinc-700" />
              <input type="text" placeholder="Lokasi" value={rutinForm.location} onChange={(e) => setRutinForm({...rutinForm, location: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 outline-none focus:border-lime-400/50 placeholder:text-zinc-700" />
              <div className="grid grid-cols-2 gap-3">
                <select value={rutinForm.dayOfWeek} onChange={(e) => setRutinForm({...rutinForm, dayOfWeek: parseInt(e.target.value)})} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 outline-none focus:border-lime-400/50">
                  <option value={0}>Minggu</option><option value={1}>Senin</option><option value={2}>Selasa</option><option value={3}>Rabu</option><option value={4}>Kamis</option><option value={5}>Jumat</option><option value={6}>Sabtu</option>
                </select>
                <input type="time" value={rutinForm.time} onChange={(e) => setRutinForm({...rutinForm, time: e.target.value})} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 outline-none focus:border-lime-400/50 [color-scheme:dark]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-zinc-600 uppercase">Sewa Lapangan</label>
                  <input type="number" value={rutinForm.fieldCost} onChange={(e) => setRutinForm({...rutinForm, fieldCost: parseInt(e.target.value) || 0})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 outline-none focus:border-lime-400/50" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-zinc-600 uppercase">Iuran/Pemain</label>
                  <input type="number" value={rutinForm.feePerPlayer} onChange={(e) => setRutinForm({...rutinForm, feePerPlayer: parseInt(e.target.value) || 0})} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 outline-none focus:border-lime-400/50" />
                </div>
              </div>
              <button onClick={handleSaveRutin} disabled={!rutinForm.title.trim() || !rutinForm.location.trim()} className="w-full bg-lime-400 text-zinc-950 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 hover:bg-lime-300 transition-all">Simpan Template</button>
            </div>
          )}

          {recurringSchedules.length === 0 && !showRutinForm ? (
            <div className="bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-3xl p-10 text-center">
              <Calendar className="w-8 h-8 text-zinc-800 mx-auto mb-2 opacity-50" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Belum ada jadwal rutin</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recurringSchedules.map(rs => {
                const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                return (
                  <div key={rs.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-black text-zinc-100 uppercase italic tracking-tight">{rs.title}</h4>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase mt-1">{rs.location} • {days[rs.dayOfWeek]} {rs.time}</p>
                      </div>
                      <button onClick={() => handleDeleteRutin(rs.id!)} className="text-zinc-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                      <span className="text-[8px] font-black text-zinc-600 uppercase">Rp {rs.fieldCost.toLocaleString('id-ID')} • Iuran Rp {rs.feePerPlayer.toLocaleString('id-ID')}</span>
                      <button onClick={() => handleGenerateSchedule(rs)} className="bg-lime-400 text-zinc-950 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-lime-300 transition-all">Buat Jadwal →</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4 px-2 animate-in fade-in slide-in-from-bottom-4">
          {/* User Stats & Search */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input 
                type="text"
                placeholder="CARI PLAYER..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-black uppercase italic tracking-tighter text-white focus:border-lime-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Org Structure Summary Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-lg">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-lime-400" /> Pengurus Club
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['Ketua Club', 'Sekretaris', 'Kasir'].map(role => {
                const holder = clubUsers.find(u => u.role === role);
                return (
                  <div key={role} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/50">
                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-wider mb-1">{role}</p>
                    <p className="text-[11px] font-black text-white uppercase italic truncate">
                      {holder ? holder.displayName : '-'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User List - Mobile Optimized Cards */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Daftar Player</span>
              <span className="text-[10px] font-black text-lime-400 uppercase tracking-widest bg-lime-400/10 px-2 py-0.5 rounded border border-lime-400/20">{filteredUsers.length} Orang</span>
            </div>

            {loadingUsers ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-2 border-lime-400/20 border-t-lime-400 rounded-full animate-spin mx-auto"></div>
              </div>
            ) : filteredUsers.map((u) => (
              <div key={u.uid} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-md flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center text-lime-400 font-black shrink-0 shadow-inner">
                      {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" /> : u.displayName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white uppercase italic truncate">{u.displayName}</p>
                        <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-[9px] font-black text-lime-400 italic tracking-tighter shrink-0">
                          {u.nickname || 'N/A'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate">{u.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-4 border-t border-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                      u.role === 'Ketua Club' ? "bg-lime-400/10 border-lime-400/20 text-lime-400" :
                      u.role === 'Kasir' ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                      u.role === 'Admin' ? "bg-red-400/10 border-red-400/20 text-red-400" :
                      "bg-zinc-950 border-zinc-800 text-zinc-600"
                    )}>
                      {getRoleIcon(u.role)}
                      {u.role || 'Pemain'}
                    </div>
                  </div>

                  <select 
                    value={u.role || 'Pemain'}
                    onChange={(e) => updateUserRole(u.uid, e.target.value as Role)}
                    className="flex-1 max-w-[140px] bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 focus:border-lime-400 outline-none transition-all shadow-inner italic"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            
            {!loadingUsers && filteredUsers.length === 0 && (
              <div className="text-center py-20 bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-3xl">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">Player tidak ditemukan</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
