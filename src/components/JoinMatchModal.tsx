import React, { useState } from 'react';
import { X, CheckCircle2, Users, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface Participant {
  role: string;
  team: 'A' | 'B';
  status: 'starting' | 'substitute';
}

interface JoinMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (data: { position: string, team: 'A' | 'B', status: 'starting' | 'substitute' }) => void;
  participants: Participant[];
}

const POSITION_LIMITS: Record<string, number> = {
  'GK': 1,
  'CB': 3,
  'Mid': 3,
  'CF': 2
};

const POSITIONS = Object.keys(POSITION_LIMITS);

export default function JoinMatchModal({ isOpen, onClose, onJoin, participants }: JoinMatchModalProps) {
  const [team, setTeam] = useState<'A' | 'B'>('A');
  const [position, setPosition] = useState('Mid');
  const [status, setStatus] = useState<'starting' | 'substitute'>('starting');

  if (!isOpen) return null;

  // Calculate current counts for the selected team
  const getPositionCount = (pos: string, targetTeam: 'A' | 'B') => {
    return participants.filter(p => p.team === targetTeam && p.role === pos && p.status === 'starting').length;
  };

  const totalStartingCount = participants.filter(p => p.team === team && p.status === 'starting').length;
  const currentPosCount = getPositionCount(position, team);
  const posLimit = POSITION_LIMITS[position];
  
  const isPosFull = currentPosCount >= posLimit;
  const isTeamFull = totalStartingCount >= 9;

  // Auto-switch to substitute if position or team is full
  const effectiveStatus = (isPosFull || isTeamFull) ? 'substitute' : status;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-100">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-lime-400 mb-2">Join Squad</h2>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-8">Select your role and team</p>

        <div className="space-y-6">
          {/* Team Selection */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 block text-center">Select Team</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setTeam('A')}
                className={cn(
                  "p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3",
                  team === 'A' ? "border-red-500 bg-red-500/10" : "border-zinc-800 bg-zinc-900/40 grayscale opacity-40"
                )}
              >
                <div className="w-10 h-10 bg-red-500 rounded-full shadow-lg shadow-red-500/40 border-4 border-zinc-900" />
                <span className="text-xs font-black uppercase tracking-widest">Team A</span>
                <span className="text-[9px] text-zinc-500 font-bold">{participants.filter(p => p.team === 'A' && p.status === 'starting').length}/9 Starting</span>
              </button>
              <button
                onClick={() => setTeam('B')}
                className={cn(
                  "p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3",
                  team === 'B' ? "border-blue-500 bg-blue-500/10" : "border-zinc-800 bg-zinc-900/40 grayscale opacity-40"
                )}
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full shadow-lg shadow-blue-500/40 border-4 border-zinc-900" />
                <span className="text-xs font-black uppercase tracking-widest">Team B</span>
                <span className="text-[9px] text-zinc-500 font-bold">{participants.filter(p => p.team === 'B' && p.status === 'starting').length}/9 Starting</span>
              </button>
            </div>
          </div>

          {/* Position Selection */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 block">Select Position</label>
            <div className="grid grid-cols-4 gap-2">
              {POSITIONS.map(pos => {
                const count = getPositionCount(pos, team);
                const limit = POSITION_LIMITS[pos];
                const full = count >= limit;
                
                return (
                  <button
                    key={pos}
                    onClick={() => setPosition(pos)}
                    className={cn(
                      "flex flex-col items-center justify-center py-3 rounded-2xl border transition-all relative overflow-hidden",
                      position === pos ? "border-lime-400 bg-lime-400 text-zinc-950" : "border-zinc-800 text-zinc-500 hover:border-zinc-700",
                      full && position !== pos && "opacity-50"
                    )}
                  >
                    <span className="font-black text-sm">{pos}</span>
                    <span className={cn("text-[8px] font-bold uppercase", position === pos ? "text-zinc-800" : "text-zinc-600")}>
                      {count}/{limit}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 block">Match Status</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setStatus('starting')}
                disabled={isPosFull || isTeamFull}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                  effectiveStatus === 'starting' ? "border-lime-400 bg-lime-400/10 text-zinc-100" : "border-zinc-800 bg-zinc-900/50 text-zinc-500",
                  (isPosFull || isTeamFull) && "opacity-30 cursor-not-allowed"
                )}
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Starting IX</span>
              </button>
              <button
                onClick={() => setStatus('substitute')}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                  effectiveStatus === 'substitute' ? "border-lime-400 bg-lime-400/10 text-zinc-100" : "border-zinc-800 bg-zinc-900/50 text-zinc-500"
                )}
              >
                <Users className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Substitute</span>
              </button>
            </div>
            {(isPosFull || isTeamFull) && (
              <p className="mt-3 text-[9px] text-orange-400 font-bold uppercase tracking-[0.1em] flex items-center gap-2 justify-center bg-orange-400/5 py-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5" /> 
                {isPosFull ? `Posisi ${position} sudah penuh untuk starting.` : 'Slot starting tim sudah penuh (9/9).'}
              </p>
            )}
          </div>

          <button
            onClick={() => onJoin({ position, team, status: effectiveStatus })}
            className="w-full bg-lime-400 hover:bg-lime-300 text-zinc-950 py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(163,230,53,0.3)] mt-2"
          >
            Confirm Squad Entry
          </button>
        </div>
      </div>
    </div>
  );
}
