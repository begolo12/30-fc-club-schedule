import React, { useState } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
}

export default function DeleteScheduleModal({ isOpen, onClose, onConfirm, title }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-red-500/10">
          <h3 className="text-xl font-black italic uppercase tracking-tighter text-red-500 flex items-center gap-2">
            <Trash2 className="w-6 h-6" /> Hapus Jadwal
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex flex-col items-center text-center gap-4 mb-2">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Konfirmasi Penghapusan</p>
              <h4 className="text-lg font-black text-white uppercase italic tracking-tighter line-clamp-2">
                {title}
              </h4>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block ml-1">Alasan Pembatalan (Akan jadi Notif)</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 text-sm font-bold text-white focus:border-red-500 outline-none transition-all placeholder:text-zinc-800 uppercase italic tracking-tighter resize-none"
              placeholder="CONTOH: HUJAN DERAS / LAPANGAN FULL..."
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="w-full py-4 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
            >
              {loading ? 'MENGHAPUS...' : 'YA, HAPUS JADWAL'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl font-black uppercase tracking-widest transition-all"
            >
              BATALKAN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
