import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, Users, Wallet, ArrowRight, TrendingUp, Clock, Trophy, LogOut, Settings as SettingsIcon, AlertTriangle, X as XIcon, Megaphone } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { listenForNewSchedules } from '../lib/realtimeNotifications';
import UserSettingsModal from '../components/UserSettingsModal';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  userName?: string;
  timestamp: number;
  matchId?: string;
}

interface Schedule {
  id: string;
  title: string;
  timestamp: number;
  location: string;
  status: string;
  deletedAt?: number;
  deletionReason?: string;
}

interface ClubUser {
  id: string;
  displayName?: string;
  nickname?: string;
  role?: string;
}

export default function Dashboard() {
  const { user, nickname, signOut } = useAuth();
  const [upcomingMatches, setUpcomingMatches] = useState<Schedule[]>([]);
  const [cancelledMatches, setCancelledMatches] = useState<Schedule[]>([]);
  const [unpaidMatches, setUnpaidMatches] = useState<{id: string; title: string}[]>([]);
  const [balance, setBalance] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [players, setPlayers] = useState<ClubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerSearch, setPlayerSearch] = useState('');

  useEffect(() => {
    // 1. Fetch matches (both active and recently cancelled)
    const today = startOfToday().getTime();
    const qMatches = query(
      collection(db, 'schedules'),
      where('timestamp', '>=', today),
      orderBy('timestamp', 'asc'),
      limit(10)
    );

    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      const active: Schedule[] = [];
      const cancelled: Schedule[] = [];
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);

      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as Schedule;
        if (data.status !== 'cancelled') {
          active.push(data);
        } else if (data.deletedAt && data.deletedAt > twoHoursAgo) {
          cancelled.push(data);
        }
      });
      
      setUpcomingMatches(active);
      setCancelledMatches(cancelled);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schedules'));

    // 2. Fetch balance (Transactions + Initial Balance)
    let txTotal = 0;
    let initBal = 0;

    const unsubFinance = onSnapshot(collection(db, 'finance'), (snapshot) => {
      let total = 0;
      let mIncome = 0;
      let mExpense = 0;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      snapshot.forEach(d => {
        const tx = d.data() as Transaction;
        if (tx.type === 'income') total += tx.amount;
        else total -= tx.amount;
        if (tx.timestamp >= monthStart) {
          if (tx.type === 'income') mIncome += tx.amount;
          else mExpense += tx.amount;
        }
      });
      txTotal = total;
      setMonthIncome(mIncome);
      setMonthExpense(mExpense);
      setBalance(txTotal + initBal);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'finance'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'finance'), (settingsDoc) => {
      initBal = settingsDoc.exists() ? settingsDoc.data().initialBalance || 0 : 0;
      setBalance(txTotal + initBal);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/finance'));

    // 3. Fetch real user count
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data: ClubUser[] = [];
      snapshot.forEach((userDoc) => {
        const userData = userDoc.data() as ClubUser;
        data.push({
          id: userDoc.id,
          displayName: userData.displayName,
          nickname: userData.nickname,
          role: userData.role,
        });
      });
      setTotalPlayers(snapshot.size);
      setPlayers(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    // 4. Setup notification listener for new schedules
    const scheduleListener = user ? listenForNewSchedules(user.uid) : { unsubscribe: () => {} };

    return () => {
      unsubMatches();
      unsubFinance();
      unsubSettings();
      unsubUsers();
      scheduleListener.unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user || upcomingMatches.length === 0) return;
    const checkUnpaid = async () => {
      const unpaid: {id: string; title: string}[] = [];
      for (const match of upcomingMatches) {
        const pDoc = await getDoc(doc(db, 'schedules', match.id, 'participants', user.uid));
        if (pDoc.exists() && pDoc.data().paymentStatus === 'unpaid') {
          unpaid.push({ id: match.id, title: match.title });
        }
      }
      setUnpaidMatches(unpaid);
    };
    checkUnpaid();
  }, [user, upcomingMatches]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const nextMatch = upcomingMatches[0];

  return (
    <div className="flex-1 flex flex-col gap-8 pb-24 md:pb-12">
      {/* Payment Reminder */}
      {unpaidMatches.length > 0 && (
        <div className="mx-1 bg-orange-400/10 border border-orange-400/20 rounded-2xl p-4 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-400/20 rounded-xl flex items-center justify-center text-orange-400 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-widest italic">Tagihan Iuran</h4>
              <p className="text-xs text-zinc-300 font-bold mt-0.5">
                Kamu belum bayar iuran untuk <span className="text-orange-400 italic">{unpaidMatches.map(m => m.title).join(', ')}</span>
              </p>
            </div>
            <Link to={`/schedule/${unpaidMatches[0].id}`} className="shrink-0 bg-orange-400 text-zinc-950 px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest">Bayar</Link>
          </div>
        </div>
      )}

      {/* Cancellation Notifications */}
      {cancelledMatches.length > 0 && (
        <div className="space-y-3 px-1 animate-in slide-in-from-top-4 duration-500">
          {cancelledMatches.map(match => (
            <div key={match.id} className="relative bg-red-500/10 border border-red-500/20 rounded-2xl p-4 overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 pr-6">
                  <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 italic">Jadwal Dibatalkan!</h4>
                  <p className="text-sm font-black text-white uppercase italic tracking-tighter mb-2">{match.title}</p>
                  <div className="p-3 bg-zinc-950/50 rounded-xl border border-red-500/10">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Alasan:</p>
                    <p className="text-xs font-bold text-red-400 italic">"{match.deletionReason || 'Tidak ada alasan spesifik'}"</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <header className="flex justify-between items-start px-1 pt-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-100">
            Halo, <span className="text-lime-400">{nickname || user?.displayName?.split(' ')[0] || 'Pemain'}</span>
          </h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Ikhtisar Pertandingan & Statistik</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-lime-400 hover:border-lime-400/50 transition-all shadow-lg"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
          <Link to="/announcements" className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-lime-400 hover:border-lime-400/50 transition-all shadow-lg" title="Pengumuman">
            <Megaphone className="w-5 h-5" />
          </Link>
          <button 
            onClick={signOut}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-red-400 hover:border-red-400/50 transition-all shadow-lg"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {isPlayersOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md" onClick={() => setIsPlayersOpen(false)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-lime-400">Daftar Pemain</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Lihat anggota yang sudah terdaftar</p>
              </div>
              <button onClick={() => setIsPlayersOpen(false)} className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 border-b border-zinc-800">
              <input
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Cari nama / role..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:border-lime-400 outline-none"
              />
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {players.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm font-bold uppercase tracking-widest text-zinc-500">Belum ada pemain</div>
              ) : (
                players
                  .filter((p) => {
                    const q = playerSearch.toLowerCase();
                    if (!q) return true;
                    return (
                      (p.nickname || '').toLowerCase().includes(q) ||
                      (p.displayName || '').toLowerCase().includes(q) ||
                      (p.role || '').toLowerCase().includes(q)
                    );
                  })
                  .map((player) => (
                    <div key={player.id} className="flex items-center gap-3 border-b border-zinc-800/80 px-5 py-3 last:border-b-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 font-black uppercase text-lime-300">
                        {(player.nickname || player.displayName || 'P')[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-zinc-100">{player.nickname || player.displayName || 'Pemain'}</p>
                        <p className="truncate text-[10px] font-bold uppercase tracking-widest text-zinc-500">{player.role || 'Pemain'}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compact Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex flex-col items-center text-center">
          <Wallet className="w-5 h-5 text-lime-400 mb-2 opacity-50" />
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Saldo Kas</p>
          <h3 className="text-xs font-black italic text-zinc-100">Rp {balance.toLocaleString('id-ID')}</h3>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex flex-col items-center text-center">
          <Trophy className="w-5 h-5 text-blue-400 mb-2 opacity-50" />
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Jadwal</p>
          <h3 className="text-xs font-black italic text-zinc-100">{upcomingMatches.length}</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsPlayersOpen(true)}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex flex-col items-center text-center hover:border-lime-400/40 transition-all"
        >
          <Users className="w-5 h-5 text-orange-400 mb-2 opacity-50" />
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Pemain</p>
          <h3 className="text-xs font-black italic text-zinc-100">{totalPlayers}</h3>
        </button>
      </div>

      {/* Finance Chart */}
      {(monthIncome > 0 || monthExpense > 0) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl mx-1">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Keuangan Bulan Ini</h4>
            <span className="text-[8px] font-black text-zinc-600 uppercase">{format(new Date(), 'MMMM yyyy', { locale: idLocale })}</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-black text-zinc-500 uppercase w-16">Masuk</span>
              <div className="flex-1 h-6 bg-zinc-950 rounded-lg overflow-hidden">
                <div className="h-full bg-lime-400 rounded-lg flex items-center px-2 transition-all duration-500" style={{ width: `${Math.min(100, (monthIncome / Math.max(monthIncome, monthExpense)) * 100)}%` }}>
                  <span className="text-[8px] font-black text-zinc-950">Rp {monthIncome.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-black text-zinc-500 uppercase w-16">Keluar</span>
              <div className="flex-1 h-6 bg-zinc-950 rounded-lg overflow-hidden">
                <div className="h-full bg-red-400 rounded-lg flex items-center px-2 transition-all duration-500" style={{ width: `${Math.min(100, (monthExpense / Math.max(monthIncome, monthExpense)) * 100)}%` }}>
                  <span className="text-[8px] font-black text-zinc-950">Rp {monthExpense.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t border-zinc-800/50">
              <span className="text-[8px] font-black text-zinc-500 uppercase">Selisih</span>
              <span className={`text-xs font-black italic ${monthIncome - monthExpense >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
                {monthIncome - monthExpense >= 0 ? '+' : '-'} Rp {Math.abs(monthIncome - monthExpense).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Compact Hero: Next Match */}
      {nextMatch ? (
        <Link 
          to={`/schedule/${nextMatch.id}`}
          className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-5 overflow-hidden group shadow-xl hover:border-lime-400/50 transition-all"
        >
          <div className="absolute top-0 right-0 p-4 opacity-[0.02] font-black text-7xl italic pointer-events-none uppercase tracking-tighter text-zinc-100">
            {format(nextMatch.timestamp, 'HH:mm')}
          </div>
          
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="bg-lime-400 text-zinc-950 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic">
                Laga Berikutnya
              </span>
              <span className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">
                {format(nextMatch.timestamp, 'EEEE, d MMM', { locale: idLocale })}
              </span>
            </div>

            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-100 group-hover:text-lime-400 transition-colors leading-none">
              {nextMatch.title}
            </h3>

            <div className="flex gap-4 items-center pt-4 border-t border-zinc-800/50 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate max-w-[120px]">{nextMatch.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{format(nextMatch.timestamp, 'HH:mm')} WIB</span>
              </div>
              <div className="ml-auto w-8 h-8 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-[2rem] p-10 text-center">
          <CalendarIcon className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">Belum Ada Jadwal Pertandingan</h3>
        </div>
      )}

      {/* Grid: Other Upcoming Matches */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Jadwal Lainnya</h4>
          <Link to="/calendar" className="text-[10px] font-black uppercase tracking-widest text-lime-400 hover:text-lime-300 transition-colors flex items-center gap-1">
            Lihat Semua <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingMatches.slice(1).map(match => (
            <Link 
              key={match.id}
              to={`/schedule/${match.id}`}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all group flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  {format(match.timestamp, 'd MMM')}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-lime-400">
                  {format(match.timestamp, 'HH:mm')}
                </span>
              </div>
              <h5 className="text-lg font-black italic uppercase tracking-tight text-zinc-100 group-hover:text-lime-400 transition-colors line-clamp-1 mb-4">
                {match.title}
              </h5>
              <div className="mt-auto flex items-center gap-2 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{match.location}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
