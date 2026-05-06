import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit, where, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, Users, Wallet, ArrowRight, TrendingUp, Clock, Trophy } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();
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

    return () => {
      unsubMatches();
      unsubFinance();
      unsubSettings();
      unsubUsers();
    };
  }, []);

  const nextMatch = upcomingMatches[0];

  return (
    <div className="flex-1 flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-zinc-100">
          Hello, <span className="text-lime-400">{user?.displayName?.split(' ')[0]}</span>
        </h2>
        <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mt-1">Match Day Overview & Statistics</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-xl group hover:border-lime-400/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-lime-400/10 rounded-2xl flex items-center justify-center text-lime-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Club Balance</p>
              <h3 className="text-2xl font-black italic text-zinc-100">Rp {balance.toLocaleString('id-ID')}</h3>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-xl group hover:border-blue-400/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-400/10 rounded-2xl flex items-center justify-center text-blue-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Upcoming Matches</p>
              <h3 className="text-2xl font-black italic text-zinc-100">{upcomingMatches.length} <span className="text-xs text-zinc-600 not-italic uppercase tracking-normal">Scheduled</span></h3>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-xl group hover:border-orange-400/30 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-400/10 rounded-2xl flex items-center justify-center text-orange-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Active Players</p>
              <h3 className="text-2xl font-black italic text-zinc-100">{totalPlayers} <span className="text-xs text-zinc-600 not-italic uppercase tracking-normal">Members</span></h3>
            </div>
          </div>
        </div>
      </div>

      {/* Hero: Next Match */}
      {nextMatch ? (
        <Link 
          to={`/schedule/${nextMatch.id}`}
          className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 overflow-hidden group shadow-2xl hover:border-lime-400/50 transition-all"
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity font-black text-[10rem] italic pointer-events-none uppercase tracking-tighter leading-none text-zinc-100">
            {format(nextMatch.timestamp, 'HH:mm')}
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-lime-400 text-zinc-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                Next Match
              </span>
              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                {format(nextMatch.timestamp, 'EEEE, d MMMM', { locale: idLocale })}
              </span>
            </div>

            <h3 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-zinc-100 group-hover:text-lime-400 transition-colors mb-8 max-w-2xl leading-tight">
              {nextMatch.title}
            </h3>

            <div className="flex flex-wrap gap-8 items-center pt-8 border-t border-zinc-800/50">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-zinc-500" />
                <span className="text-sm font-bold text-zinc-300 uppercase tracking-widest">{nextMatch.location}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-zinc-500" />
                <span className="text-sm font-bold text-zinc-300 uppercase tracking-widest">{format(nextMatch.timestamp, 'HH:mm')} WIB</span>
              </div>
              <div className="ml-auto w-12 h-12 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <ArrowRight className="w-6 h-6" />
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-[2.5rem] p-16 text-center">
          <CalendarIcon className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
          <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest italic">No Upcoming Matches Scheduled</h3>
        </div>
      )}

      {/* Grid: Other Upcoming Matches */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">More Upcoming Matches</h4>
          <Link to="/calendar" className="text-[10px] font-black uppercase tracking-widest text-lime-400 hover:text-lime-300 transition-colors flex items-center gap-1">
            View Full Calendar <ArrowRight className="w-3 h-3" />
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
