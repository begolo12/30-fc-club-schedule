import React, { useState, useRef } from 'react';
import { X, User, Check, Camera } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = document.createElement('canvas');
    const img = new window.Image();
    img.onload = () => {
      canvas.width = 128;
      canvas.height = 128;
      canvas.getContext('2d')!.drawImage(img, 0, 0, 128, 128);
      setAvatarPreview(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = URL.createObjectURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      // 1. Update user profile nickname
      await updateNickname(tempNickname);

      // 2. Save avatar if changed
      if (avatarPreview && user) {
        await setDoc(doc(db, 'users', user.uid), { avatarUrl: avatarPreview }, { merge: true });
      }

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
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="relative w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 hover:border-lime-400 transition-all overflow-hidden group">
              {avatarPreview || user?.photoURL ? (
                <img src={avatarPreview || user?.photoURL || ''} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-lime-400">{(nickname || 'U')[0]}</span>
              )}
              <div className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-lime-400" />
              </div>
            </button>
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Tap untuk ganti foto</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
          </div>

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
