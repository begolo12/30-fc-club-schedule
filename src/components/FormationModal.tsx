import React from 'react';
import { X, Users } from 'lucide-react';
import { cn } from '../lib/utils';

interface Participant {
  id: string;
  name: string;
  nickname?: string;
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
          <div
            key={`${team}-${role}-${i}`}
            className="relative flex flex-col items-center gap-1 min-w-[40px]"
          >
            <div className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg transition-all",
              occupant 
                ? (team === 'A' ? "bg-red-500 border-white/50" : "bg-blue-500 border-white/50")
                : "bg-zinc-950/30 border-white/5"
            )}>
              {occupant ? (
                <span className="text-[9px] font-black text-white">{(occupant.nickname || occupant.name).substring(0, 2).toUpperCase()}</span>
              ) : (
                <span className="text-[8px] font-black text-white/5 uppercase tracking-tighter">{role[0]}</span>
              )}
            </div>
            <div className={cn(
              "px-1 py-0.5 rounded text-[6px] font-black uppercase tracking-tighter whitespace-nowrap",
              occupant ? "bg-zinc-950 text-white" : "bg-zinc-800/20 text-zinc-600"
            )}>
              {occupant ? (occupant.nickname || occupant.name.split(' ')[0]).substring(0, 6) : role}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-black italic uppercase tracking-tighter text-lime-400">Formasi Pertandingan</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
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

          {/* Substitutes */}
          <div className="space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[8px] font-black uppercase tracking-widest text-red-500 border-l-2 border-red-500 pl-2">Cadangan Tim A</p>
                <div className="flex flex-wrap gap-1">
                  {participants.filter(p => p.team === 'A' && p.status === 'substitute').length > 0 ? (
                    participants.filter(p => p.team === 'A' && p.status === 'substitute').map(p => (
                      <span key={p.id} className="px-2 py-1 bg-zinc-800 text-[9px] font-bold text-zinc-400 rounded-lg uppercase tracking-tight line-clamp-1">{p.name.split(' ')[0]}</span>
                    ))
                  ) : (
                    <span className="text-[8px] text-zinc-700 italic font-bold uppercase">Kosong</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[8px] font-black uppercase tracking-widest text-blue-500 border-l-2 border-blue-500 pl-2">Cadangan Tim B</p>
                <div className="flex flex-wrap gap-1">
                  {participants.filter(p => p.team === 'B' && p.status === 'substitute').length > 0 ? (
                    participants.filter(p => p.team === 'B' && p.status === 'substitute').map(p => (
                      <span key={p.id} className="px-2 py-1 bg-zinc-800 text-[9px] font-bold text-zinc-400 rounded-lg uppercase tracking-tight line-clamp-1">{p.name.split(' ')[0]}</span>
                    ))
                  ) : (
                    <span className="text-[8px] text-zinc-700 italic font-bold uppercase">Kosong</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
