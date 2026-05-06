import React from 'react';
import { X, Users } from 'lucide-react';
import { cn } from '../lib/utils';

interface Participant {
  id: string;
  name: string;
  role: string;
  team: 'A' | 'B';
  status: 'starting' | 'substitute';
}

interface FormationModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
}

export default function FormationModal({ isOpen, onClose, participants }: FormationModalProps) {
  if (!isOpen) return null;

  const teamA = participants.filter(p => p.team === 'A' && p.status === 'starting');
  const teamB = participants.filter(p => p.team === 'B' && p.status === 'starting');

  const renderTeamOnPitch = (squad: Participant[], teamColor: string, isTop: boolean) => {
    // Positioning logic based on roles
    const gks = squad.filter(p => p.role === 'GK');
    const cbs = squad.filter(p => p.role === 'CB');
    const mids = squad.filter(p => p.role === 'Mid');
    const cfs = squad.filter(p => p.role === 'CF');

    return (
      <div className={cn("absolute inset-0 p-4 flex flex-col justify-between", isTop ? "flex-col" : "flex-col-reverse")}>
        {/* Goal Keeper */}
        <div className="flex justify-center h-16">
          {gks.map(p => <PlayerNode key={p.id} name={p.name} color={teamColor} />)}
        </div>

        {/* Defenders (CB) */}
        <div className="flex justify-around h-16 px-4">
          {cbs.map(p => <PlayerNode key={p.id} name={p.name} color={teamColor} />)}
        </div>

        {/* Midfielders (Mid) */}
        <div className="flex justify-around h-16 px-2">
          {mids.map(p => <PlayerNode key={p.id} name={p.name} color={teamColor} />)}
        </div>

        {/* Forwards (CF) */}
        <div className="flex justify-center gap-12 h-16">
          {cfs.map(p => <PlayerNode key={p.id} name={p.name} color={teamColor} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col h-[90vh]">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md sticky top-0 z-20">
          <h3 className="text-xl font-black italic uppercase tracking-tighter text-lime-400 flex items-center gap-3">
            <Users className="w-6 h-6" /> Match Formation
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-12">
          {/* Pitch Container */}
          <div className="relative w-full aspect-[2/3] max-w-sm mx-auto bg-emerald-600 rounded-3xl border-4 border-emerald-400/30 overflow-hidden shadow-2xl">
            {/* Pitch Lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-20 border-b-2 border-x-2 border-white/40" /> {/* Top Box */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-20 border-t-2 border-x-2 border-white/40" /> {/* Bottom Box */}
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/40 -translate-y-1/2" /> {/* Center Line */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/40 rounded-full" /> {/* Center Circle */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-12 border-b-2 border-white/40 rounded-b-full opacity-30" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-12 border-t-2 border-white/40 rounded-t-full opacity-30" />
            </div>

            {/* Team B (Top) */}
            <div className="absolute top-0 left-0 right-0 h-1/2 rotate-180">
              {renderTeamOnPitch(teamB, 'bg-blue-500', true)}
            </div>

            {/* Team A (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 h-1/2">
              {renderTeamOnPitch(teamA, 'bg-red-500', false)}
            </div>
          </div>

          {/* Substitutes Section */}
          <div className="grid grid-cols-2 gap-8 pb-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400 border-l-2 border-red-500 pl-3">Team A Subs</h4>
              <div className="flex flex-wrap gap-2">
                {participants.filter(p => p.team === 'A' && p.status === 'substitute').map(p => (
                  <span key={p.id} className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{p.name} ({p.role})</span>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 border-l-2 border-blue-500 pl-3">Team B Subs</h4>
              <div className="flex flex-wrap gap-2">
                {participants.filter(p => p.team === 'B' && p.status === 'substitute').map(p => (
                  <span key={p.id} className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{p.name} ({p.role})</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerNode({ name, color }: { name: string, color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 group relative">
      <div className={cn("w-8 h-8 rounded-full border-2 border-white/80 shadow-lg flex items-center justify-center transform group-hover:scale-110 transition-transform", color)}>
        <span className="text-[8px] font-black text-white">{name.substring(0, 2).toUpperCase()}</span>
      </div>
      <div className="bg-zinc-950/80 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/10 max-w-[60px]">
        <p className="text-[7px] font-black text-white uppercase tracking-tighter truncate text-center">{name.split(' ')[0]}</p>
      </div>
    </div>
  );
}
