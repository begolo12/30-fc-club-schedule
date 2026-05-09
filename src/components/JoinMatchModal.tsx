import React, { useState } from 'react';
import { X, Users, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface Participant {
  id: string;
  name: string;
  nickname?: string;
  role: string;
  team: 'A' | 'B';
  status: 'starting' | 'substitute';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (selection: { position: string, team: 'A' | 'B', status: 'starting' | 'substitute' }) => void;
  participants: Participant[];
}

interface Slot {
  id: string;
  role: string;
  team: 'A' | 'B';
  label: string;
}

export default function JoinMatchModal({ isOpen, onClose, onJoin, participants }: Props) {
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSlotClick = (team: 'A' | 'B', role: string, slotIndex: number) => {
    const specificRole = `${role}-${slotIndex}`;
    const occupant = participants.find(p => p.team === team && p.role === specificRole && p.status === 'starting');
    
    if (occupant) return;

    onJoin({ position: specificRole, team, status: 'starting' });
  };

  const handleJoinSubstitute = (team: 'A' | 'B') => {
    onJoin({ position: 'Cadangan', team, status: 'substitute' });
  };

  const getOccupantForSlot = (team: 'A' | 'B', role: string, index: number) => {
    return participants.find(p => p.team === team && p.role === `${role}-${index}` && p.status === 'starting');
  };

  const renderPitchRow = (team: 'A' | 'B', role: string, count: number) => (
    <div className={cn(
      "flex w-full gap-1",
      count === 1 ? "justify-center" : "justify-between px-6"
    )}>
      {Array.from({ length: count }).map((_, i) => {
        const occupant = getOccupantForSlot(team, role, i);
        return (
          <button
            key={`${team}-${role}-${i}`}
            onClick={() => !occupant && handleSlotClick(team, role, i)}
            className={cn(
              "relative flex flex-col items-center gap-1 transition-all transform active:scale-95 min-w-[40px]",
              occupant ? "cursor-default" : "cursor-pointer group"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg transition-all",
              occupant 
                ? (team === 'A' ? "bg-red-500 border-white/50" : "bg-blue-500 border-white/50")
                : "bg-zinc-950/50 border-white/10 group-hover:border-lime-400 group-hover:bg-lime-400/20"
            )}>
              {occupant ? (
                <span className="text-[9px] font-black text-white">{(occupant.nickname || occupant.name).substring(0, 2).toUpperCase()}</span>
              ) : (
                <Plus className="w-3.5 h-3.5 text-white/10 group-hover:text-lime-400" />
              )}
            </div>
            <div className={cn(
              "px-1 py-0.5 rounded text-[6px] font-black uppercase tracking-tighter whitespace-nowrap",
              occupant ? "bg-zinc-950 text-white" : "bg-zinc-800 text-zinc-500 group-hover:text-lime-400"
            )}>
              {occupant ? (occupant.nickname || occupant.name.split(' ')[0]).substring(0, 6) : role}
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-black italic uppercase tracking-tighter text-lime-400">Pilih Posisi</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
          <div className="text-center space-y-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 italic">Klik pada posisi yang kosong</p>
            {error && <p className="text-[9px] font-bold text-red-400 animate-pulse">{error}</p>}
          </div>

          {/* Visual Pitch */}
          <div className="relative w-full aspect-[2/3] max-w-[320px] mx-auto bg-emerald-600 rounded-2xl border-4 border-emerald-400/30 overflow-hidden shadow-2xl shrink-0">
            <div className="absolute inset-0 pointer-events-none opacity-30">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-12 border-b-2 border-x-2 border-white" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-12 border-t-2 border-x-2 border-white" />
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white rounded-full" />
            </div>

            {/* Team B (Top - Blue) */}
            <div className="absolute top-2 left-0 right-0 h-[46%] flex flex-col justify-between py-1">
              <div className="flex justify-center">{renderPitchRow('B', 'GK', 1)}</div>
              <div>{renderPitchRow('B', 'CB', 3)}</div>
              <div>{renderPitchRow('B', 'Mid', 3)}</div>
              <div>{renderPitchRow('B', 'CF', 2)}</div>
            </div>

            {/* Team A (Bottom - Red) */}
            <div className="absolute bottom-2 left-0 right-0 h-[46%] flex flex-col-reverse justify-between py-1">
              <div className="flex justify-center">{renderPitchRow('A', 'GK', 1)}</div>
              <div>{renderPitchRow('A', 'CB', 3)}</div>
              <div>{renderPitchRow('A', 'Mid', 3)}</div>
              <div>{renderPitchRow('A', 'CF', 2)}</div>
            </div>
          </div>

          {/* Substitute Buttons at the Bottom */}
          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 text-center">Masuk Sebagai Cadangan</p>
            <div className="grid grid-cols-2 gap-3 pb-4">
              <button 
                onClick={() => handleJoinSubstitute('A')}
                className="flex items-center justify-center gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-red-500/40 transition-all group"
              >
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-100">Tim A (Merah)</span>
              </button>
              <button 
                onClick={() => handleJoinSubstitute('B')}
                className="flex items-center justify-center gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-blue-500/40 transition-all group"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-100">Tim B (Biru)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
