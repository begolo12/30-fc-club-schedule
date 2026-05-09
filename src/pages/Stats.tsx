import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trophy, Flame, Medal } from 'lucide-react';
import { BADGES, getBadgeById, calculateBadges } from '../lib/badges';

interface PlayerStat {
  id: string;
  name: string;
  nickname: string;
  matchCount: number;
  isSponsor: boolean;
  badges: string[];
}

export default function Stats() {
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      // Get all users
      const usersSnap = await getDocs(collection(db, 'users'));
      const users: Record<string, { name: string; nickname: string; isSponsor: boolean }> = {};
      usersSnap.forEach(d => {
        const data = d.data();
        users[d.id] = { name: data.displayName || 'User', nickname: data.nickname || data.displayName || 'User', isSponsor: !!data.isSponsor };
      });

      // Count participation from schedules
      const counts: Record<string, number> = {};
      const schedulesSnap = await getDocs(query(collection(db, 'schedules'), orderBy('timestamp', 'desc'), limit(50)));
      for (const s of schedulesSnap.docs) {
        const partsSnap = await getDocs(collection(db, 'schedules', s.id, 'participants'));
        partsSnap.forEach(p => {
          const uid = p.data().userId || p.id;
          counts[uid] = (counts[uid] || 0) + 1;
        });
      }

      // Build stats
      const playerStats: PlayerStat[] = Object.entries(counts)
        .map(([uid, count]) => ({
          id: uid,
          name: users[uid]?.name || 'User',
          nickname: users[uid]?.nickname || 'User',
          matchCount: count,
          isSponsor: users[uid]?.isSponsor || false,
          badges: calculateBadges(count, 0, users[uid]?.isSponsor || false),
        }))
        .sort((a, b) => b.matchCount - a.matchCount);

      setStats(playerStats);
      setLoading(false);
    };
    loadStats();
  }, []);

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    if (index === 1) return 'text-zinc-300 bg-zinc-300/10 border-zinc-300/30';
    if (index === 2) return 'text-amber-600 bg-amber-600/10 border-amber-600/30';
    return 'text-zinc-600 bg-zinc-900 border-zinc-800';
  };

  return (
    <div className="flex-1 flex flex-col gap-6 pb-24 md:pb-12">
      <header className="px-1">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-lime-400">Statistik</h2>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Leaderboard Kehadiran</p>
      </header>

      {/* Top 3 Podium */}
      {!loading && stats.length >= 3 && (
        <div className="flex items-end justify-center gap-3 px-4 py-6">
          {/* 2nd */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-300/50 flex items-center justify-center text-xl font-black text-zinc-300">
              {stats[1].nickname[0]}
            </div>
            <p className="text-[10px] font-black text-zinc-300 uppercase truncate max-w-[80px]">{stats[1].nickname}</p>
            <div className="w-full bg-zinc-300/10 border border-zinc-300/20 rounded-xl py-4 text-center">
              <span className="text-lg font-black text-zinc-300">🥈</span>
              <p className="text-xs font-black text-zinc-400 mt-1">{stats[1].matchCount}x</p>
            </div>
          </div>
          {/* 1st */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-16 h-16 rounded-full bg-yellow-400/20 border-2 border-yellow-400/50 flex items-center justify-center text-2xl font-black text-yellow-400">
              {stats[0].nickname[0]}
            </div>
            <p className="text-[10px] font-black text-yellow-400 uppercase truncate max-w-[80px]">{stats[0].nickname}</p>
            <div className="w-full bg-yellow-400/10 border border-yellow-400/20 rounded-xl py-6 text-center">
              <span className="text-2xl font-black">🥇</span>
              <p className="text-sm font-black text-yellow-400 mt-1">{stats[0].matchCount}x</p>
            </div>
          </div>
          {/* 3rd */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-amber-600/50 flex items-center justify-center text-xl font-black text-amber-600">
              {stats[2].nickname[0]}
            </div>
            <p className="text-[10px] font-black text-amber-600 uppercase truncate max-w-[80px]">{stats[2].nickname}</p>
            <div className="w-full bg-amber-600/10 border border-amber-600/20 rounded-xl py-3 text-center">
              <span className="text-lg font-black">🥉</span>
              <p className="text-xs font-black text-amber-600 mt-1">{stats[2].matchCount}x</p>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="space-y-2">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-700 animate-pulse">Menghitung...</div>
        ) : stats.map((player, i) => (
          <div key={player.id} className="bg-zinc-900/40 border border-zinc-800/30 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border ${getMedalColor(i)}`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-zinc-100 uppercase truncate">{player.nickname}</p>
                {player.isSponsor && <span className="text-[9px]">⭐</span>}
                {player.badges.includes('rajin_25') && <span className="text-[9px]">👑</span>}
                {player.badges.includes('rajin_10') && !player.badges.includes('rajin_25') && <span className="text-[9px]">⚡</span>}
                {player.badges.includes('rajin_5') && !player.badges.includes('rajin_10') && <span className="text-[9px]">🔥</span>}
              </div>
            </div>
            <span className="text-sm font-black italic text-lime-400">{player.matchCount}x</span>
          </div>
        ))}
      </div>
    </div>
  );
}
