import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Camera, X, Image as ImageIcon, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface GalleryPost {
  id: string;
  imageUrl: string;
  caption: string;
  userName: string;
  userId: string;
  createdAt: Timestamp | number;
  matchTitle?: string;
}

export default function Gallery() {
  const { user, nickname } = useAuth();
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<GalleryPost | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryPost)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowUpload(true);
  };

  const compressImage = (file: File, maxSize: number = 800, quality: number = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height && width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
        else if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) return;
    setUploading(true);
    try {
      const compressed = await compressImage(selectedFile);
      await addDoc(collection(db, 'gallery'), {
        imageUrl: compressed,
        caption: caption.trim(),
        userName: nickname || user.displayName || 'User',
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setShowUpload(false);
      setCaption('');
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'gallery');
    }
    setUploading(false);
  };

  // Auto-highlight: latest 5 posts
  const highlights = posts.slice(0, 5);

  // Auto-advance highlight
  useEffect(() => {
    if (highlights.length <= 1) return;
    const timer = setInterval(() => setHighlightIndex(i => (i + 1) % highlights.length), 4000);
    return () => clearInterval(timer);
  }, [highlights.length]);

  return (
    <div className="flex-1 flex flex-col gap-6 pb-24 md:pb-12">
      <header className="flex justify-between items-start px-1">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-lime-400">Gallery</h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Momen Seru Thirty FC</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="bg-lime-400 text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
        >
          <Camera className="w-3.5 h-3.5" /> Upload
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </header>

      {/* Highlights Carousel */}
      {highlights.length > 0 && (
        <div className="relative rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl aspect-[16/9] bg-zinc-950">
          <div className="absolute inset-0">
            <img
              src={highlights[highlightIndex]?.imageUrl}
              alt=""
              className="w-full h-full object-cover transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-lime-400" />
              <span className="text-[9px] font-black text-lime-400 uppercase tracking-widest">Highlights</span>
            </div>
            <p className="text-sm font-black text-zinc-100 italic line-clamp-1">{highlights[highlightIndex]?.caption || 'Momen Thirty FC'}</p>
            <p className="text-[10px] text-zinc-400 font-bold mt-1">{highlights[highlightIndex]?.userName} • {highlights[highlightIndex]?.createdAt && format(highlights[highlightIndex].createdAt instanceof Timestamp ? highlights[highlightIndex].createdAt.toDate() : highlights[highlightIndex].createdAt, 'd MMM yyyy', { locale: idLocale })}</p>
          </div>
          {/* Dots */}
          <div className="absolute bottom-5 right-5 flex gap-1.5 z-10">
            {highlights.map((_, i) => (
              <button key={i} onClick={() => setHighlightIndex(i)} className={cn("w-2 h-2 rounded-full transition-all", i === highlightIndex ? "bg-lime-400 w-5" : "bg-zinc-600")} />
            ))}
          </div>
          {/* Nav arrows */}
          {highlights.length > 1 && (
            <>
              <button onClick={() => setHighlightIndex(i => (i - 1 + highlights.length) % highlights.length)} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-zinc-950/60 rounded-full text-zinc-300 hover:text-lime-400 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setHighlightIndex(i => (i + 1) % highlights.length)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-zinc-950/60 rounded-full text-zinc-300 hover:text-lime-400 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {loading ? (
          <div className="col-span-full h-40 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-700 animate-pulse">Memuat...</div>
        ) : posts.length === 0 ? (
          <div className="col-span-full bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-3xl p-10 text-center">
            <ImageIcon className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Belum ada foto</p>
          </div>
        ) : posts.map(post => (
          <button
            key={post.id}
            onClick={() => setLightbox(post)}
            className="aspect-square rounded-2xl overflow-hidden border border-zinc-800 hover:border-lime-400/50 transition-all group relative"
          >
            <img src={post.imageUrl} alt={post.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
              <p className="text-[10px] font-bold text-zinc-200 line-clamp-2">{post.caption}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" onClick={() => { setShowUpload(false); setPreviewUrl(null); setSelectedFile(null); }} />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-black italic uppercase tracking-tighter text-lime-400">Upload Foto</h3>
              <button onClick={() => { setShowUpload(false); setPreviewUrl(null); setSelectedFile(null); }} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {previewUrl && (
                <div className="aspect-square rounded-2xl overflow-hidden border border-zinc-800">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <input
                type="text"
                placeholder="Tulis caption... (opsional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 font-bold outline-none focus:border-lime-400/50 placeholder:text-zinc-700"
              />
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="w-full bg-lime-400 text-zinc-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-30 hover:bg-lime-300 transition-all"
              >
                {uploading ? 'Mengupload...' : 'Posting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md" />
          <div className="relative max-w-lg w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute top-3 right-3 z-10 p-2 bg-zinc-900/80 rounded-full text-zinc-400 hover:text-zinc-100">
              <X className="w-5 h-5" />
            </button>
            <img src={lightbox.imageUrl} alt={lightbox.caption} className="w-full max-h-[70vh] object-contain rounded-2xl" />
            <div className="mt-4 px-2">
              {lightbox.caption && <p className="text-sm font-bold text-zinc-200">{lightbox.caption}</p>}
              <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">
                {lightbox.userName} • {lightbox.createdAt && format(lightbox.createdAt instanceof Timestamp ? lightbox.createdAt.toDate() : lightbox.createdAt, 'd MMM yyyy, HH:mm', { locale: idLocale })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
