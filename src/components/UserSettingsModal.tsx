import React, { useState } from 'react';
import { X, User, Check } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserSettingsModal({ isOpen, onClose }: Props) {
  const { user, nickname, updateNickname } = useAuth();
  const [tempNickname, setTempNickname] = useState(nickname);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      // 1. Update user profile nickname
      await updateNickname(tempNickname);

      // 2. Find and update all participant records in all schedules
      const schedulesRef = collection(db, 'schedules');
      const schedulesSnap = await getDocs(schedulesRef);
      
      const updatePromises = schedulesSnap.docs.map(async (scheduleDoc) => {
        const participantRef = doc(db, 'schedules', scheduleDoc.id, 'participants', user.uid);
        const participantSnap = await getDoc(participantRef);
        if (participantSnap.exists()) {
          return updateDoc(participantRef, { nickname: tempNickname });
        }
      });
      
      await Promise.all(updatePromises);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'nickname-sync');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-xl font-black italic uppercase tracking-tighter text-lime-400 flex items-center gap-2">
            <User className="w-6 h-6" /> Pengaturan User
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block ml-1">Nama di Lapangan (Max 6 Char)</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-lg font-black text-white focus:border-lime-400 outline-none transition-all placeholder:text-zinc-800 uppercase italic tracking-tighter"
                  placeholder="NICKNAME"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-700">
                  {tempNickname.length}/6
                </div>
              </div>
              <p className="text-[9px] text-zinc-600 mt-2 italic font-bold uppercase tracking-wider px-1">Nama ini yang akan muncul di posisi Starting IX pada lapangan taktis.</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className={cn(
              "w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg",
              success 
                ? "bg-emerald-500 text-zinc-950" 
                : "bg-lime-400 hover:bg-lime-300 text-zinc-950 shadow-lime-400/20"
            )}
          >
            {loading ? 'Menyimpan...' : success ? <><Check className="w-4 h-4" /> Berhasil!</> : 'Simpan Nama'}
          </button>
        </form>
      </div>
    </div>
  );
}
