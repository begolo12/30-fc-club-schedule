import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Save, CheckCircle2, QrCode } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';

export default function AdminSettings() {
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'club_info'), (doc) => {
      if (doc.exists()) {
        setQrisUrl(doc.data().qrisUrl);
      }
    });
    return unsubscribe;
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, 'settings/qris.png');
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setQrisUrl(url);
      
      // Update firestore
      await setDoc(doc(db, 'settings', 'club_info'), { qrisUrl: url }, { merge: true });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-lime-400">Admin Settings</h2>
        <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest mt-1">Configure Club Identity & Payments</p>
      </header>

      <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-lime-400/10 rounded-2xl flex items-center justify-center text-lime-400">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-tight">QRIS Payment</h3>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Upload your club's QRIS for easy payments</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative aspect-[3/4] max-w-sm mx-auto bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-3xl overflow-hidden group">
            {qrisUrl ? (
              <img src={qrisUrl} alt="QRIS" className="w-full h-full object-contain p-4" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 gap-3">
                <Camera className="w-12 h-12 opacity-20" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">No QRIS Uploaded</span>
              </div>
            )}
            
            <label className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
              <div className="flex flex-col items-center gap-2">
                <Camera className="w-8 h-8 text-lime-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-lime-400">Change Photo</span>
              </div>
            </label>

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
                <div className="w-10 h-10 border-4 border-lime-400/20 border-t-lime-400 rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-2 text-lime-400 font-bold text-xs uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 className="w-4 h-4" />
                QRIS Updated Successfully
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
