import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit, where, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, Users, Wallet, ArrowRight, TrendingUp, Clock, Trophy, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { useAuth } from '../contexts/AuthContext';
import UserSettingsModal from '../components/UserSettingsModal';
import { listenForNewSchedules } from '../lib/realtimeNotifications';

interface Schedule {
  id: string;
  title: string;
  timestamp: number;
  location: string;
  status: string;
}

interface Transaction {
  amount: number;
  type: 'income' | 'expense';
}

export default function Dashboard() {
  const { user, nickname, signOut } = useAuth();
  const [upcomingMatches, setUpcomingMatches] = useState<Schedule[]>([]);
  const [balance, setBalance] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch upcoming matches
    const today = startOfToday().getTime();
    const qMatches = query(
      collection(db, 'schedules'),
      where('timestamp', '>=', today),
      orderBy('timestamp', 'asc'),
      limit(6)
    );

    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      const data: Schedule[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Schedule);
      });
      setUpcomingMatches(data.filter(s => s.status !== 'cancelled'));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schedules'));

    // 2. Fetch balance (Transactions + Initial Balance)
    let txTotal = 0;
    let initBal = 0;

    const unsubFinance = onSnapshot(collection(db, 'finance'), (snapshot) => {
      let total = 0;
      snapshot.forEach(doc => {
        const tx = doc.data() as Transaction;
        if (tx.type === 'income') total += tx.amount;
        else total -= tx.amount;
      });
      txTotal = total;
      setBalance(txTotal + initBal);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'finance'), (settingsDoc) => {
      initBal = settingsDoc.exists() ? settingsDoc.data().initialBalance || 0 : 0;
      setBalance(txTotal + initBal);
    });

    // 3. Fetch real user count
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setTotalPlayers(snapshot.size);
    });

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const nextMatch = upcomingMatches[0];

  return (
    <div className="flex-1 flex flex-col gap-8">
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
          <button 
            onClick={signOut}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-red-400 hover:border-red-400/50 transition-all shadow-lg"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

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
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex flex-col items-center text-center">
          <Users className="w-5 h-5 text-orange-400 mb-2 opacity-50" />
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Pemain</p>
          <h3 className="text-xs font-black italic text-zinc-100">{totalPlayers}</h3>
        </div>
      </div>

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
