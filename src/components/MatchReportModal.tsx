import React, { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { scoreA: number; scoreB: number; matchNotes: string }) => void;
  totalCost: number;
}

export default function MatchReportModal({ isOpen, onClose, onSubmit, totalCost }: Props) {
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [matchNotes, setMatchNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ scoreA, scoreB, matchNotes });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-black italic uppercase tracking-tighter text-lime-400">Laporan Pertandingan</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center gap-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Skor Akhir</p>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-black uppercase text-red-400">Tim A</span>
                <input 
                  type="number" 
                  min="0"
                  value={scoreA}
                  onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                  className="w-16 h-16 text-center text-3xl font-black bg-zinc-900 border border-zinc-800 rounded-xl focus:border-red-400 outline-none text-white"
                />
              </div>
              <span className="text-2xl font-black text-zinc-600">-</span>
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-black uppercase text-blue-400">Tim B</span>
                <input 
                  type="number" 
                  min="0"
                  value={scoreB}
                  onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                  className="w-16 h-16 text-center text-3xl font-black bg-zinc-900 border border-zinc-800 rounded-xl focus:border-blue-400 outline-none text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pencetak Gol / Catatan Laga</label>
            <textarea
              rows={4}
              value={matchNotes}
              onChange={(e) => setMatchNotes(e.target.value)}
              placeholder="Contoh:&#10;Tim A: Ozriel (2), Iki&#10;Tim B: Urip&#10;Catatan: Pertandingan seru, cuaca cerah."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none text-zinc-300 resize-none"
            />
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-orange-400 leading-relaxed uppercase tracking-widest">
              Perhatian: Mengirim laporan ini akan memotong saldo kas sebesar <br/> <span className="text-sm font-black italic">Rp {totalCost.toLocaleString('id-ID')}</span> <br/> untuk pembayaran sewa lapangan.
            </p>
          </div>

          <button type="submit" className="w-full bg-lime-400 text-zinc-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-lime-300 transition-all shadow-lg shadow-lime-400/10">
            Kirim Laporan & Tutup Laga
          </button>
        </form>
      </div>
    </div>
  );
}
