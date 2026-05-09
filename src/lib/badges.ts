export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  type: 'achievement' | 'sponsor';
}

export const BADGES: Badge[] = [
  { id: 'rajin_5', name: 'Rajin Main', description: 'Ikut 5 match', icon: '🔥', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  { id: 'rajin_10', name: 'Loyal Player', description: 'Ikut 10 match', icon: '⚡', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  { id: 'rajin_25', name: 'Legend', description: 'Ikut 25 match', icon: '👑', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  { id: 'lunas_streak_3', name: 'Tepat Waktu', description: '3x bayar lunas berturut', icon: '💎', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  { id: 'lunas_streak_10', name: 'Kas Lancar', description: '10x bayar lunas berturut', icon: '🏆', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  { id: 'first_match', name: 'Welcome!', description: 'Ikut match pertama', icon: '🎉', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  { id: 'sponsor', name: 'Sponsor', description: 'Sponsor resmi klub', icon: '⭐', color: 'text-lime-400 bg-lime-400/10 border-lime-400/20' },
];

export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id);
}

export function calculateBadges(matchCount: number, lunasStreak: number, isSponsor: boolean): string[] {
  const earned: string[] = [];
  if (matchCount >= 1) earned.push('first_match');
  if (matchCount >= 5) earned.push('rajin_5');
  if (matchCount >= 10) earned.push('rajin_10');
  if (matchCount >= 25) earned.push('rajin_25');
  if (lunasStreak >= 3) earned.push('lunas_streak_3');
  if (lunasStreak >= 10) earned.push('lunas_streak_10');
  if (isSponsor) earned.push('sponsor');
  return earned;
}
