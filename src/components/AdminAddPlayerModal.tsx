import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { name: string, team: 'A' | 'B', role: string, status: 'starting' | 'substitute' }) => void;
}

export default function AdminAddPlayerModal({ isOpen, onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [team, setTeam] = useState<'A' | 'B'>('A');
  const [roleGroup, setRoleGroup] = useState('CB');
  const [status, setStatus] = useState<'starting' | 'substitute'>('starting');
  const [slotIndex, setSlotIndex] = useState('0');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalRole = status === 'substitute' ? 'Cadangan' : `${roleGroup}-${slotIndex}`;
    
    onAdd({
      name: name.trim(),
      team,
      role: finalRole,
      status
    });
    
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-black italic uppercase tracking-tighter text-lime-400">Admin Add Player</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nama Pemain</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none text-zinc-100" 
              placeholder="Masukkan nama"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none text-zinc-100">
              <option value="starting">Starting IX</option>
              <option value="substitute">Cadangan</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tim</label>
            <select value={team} onChange={e => setTeam(e.target.value as any)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none text-zinc-100">
              <option value="A">Tim A (Merah)</option>
              <option value="B">Tim B (Biru)</option>
            </select>
          </div>

          {status === 'starting' && (
            <div className="flex gap-2">
              <div className="space-y-1 flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Posisi</label>
                <select value={roleGroup} onChange={e => setRoleGroup(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none text-zinc-100">
                  <option value="GK">GK</option>
                  <option value="CB">CB</option>
                  <option value="Mid">Mid</option>
                  <option value="CF">CF</option>
                </select>
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Slot (0-2)</label>
                <select value={slotIndex} onChange={e => setSlotIndex(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none text-zinc-100">
                  <option value="0">Slot 1</option>
                  <option value="1">Slot 2</option>
                  <option value="2">Slot 3</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" className="w-full bg-lime-400 text-zinc-950 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-lime-300 transition-all mt-2">
            Tambahkan
          </button>
        </form>
      </div>
    </div>
  );
}
