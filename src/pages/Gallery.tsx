import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, Timestamp, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Camera, X, Image as ImageIcon, Sparkles, ChevronLeft, ChevronRight, ChevronDown, Heart, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface GalleryPost {
  id: string;
  imageUrl: string;
  caption: string;
  userName: string;
  userId: string;
  createdAt: Timestamp | number;
  reactions?: Record<string, string[]>; // emoji -> userId[]
}

export default function Gallery() {
  const { user, nickname, isAdmin } = useAuth();
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<GalleryPost | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as GalleryPost)));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Auto-expand current month
  useEffect(() => {
    if (posts.length > 0) {
      const currentMonth = format(new Date(), 'yyyy-MM');
      setExpandedMonths(new Set([currentMonth]));
    }
  }, [posts.length]);

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

  const handleDelete = async (post: GalleryPost) => {
    if (!window.confirm('Hapus foto ini?')) return;
    try {
      await deleteDoc(doc(db, 'gallery', post.id));
      if (lightbox?.id === post.id) setLightbox(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'gallery');
    }
  };

  const REACTIONS = ['🔥', '❤️', '😂', '💪'];

  const handleReaction = async (post: GalleryPost, emoji: string) => {
    if (!user) return;
    const reactions = { ...(post.reactions || {}) };
    const users = reactions[emoji] || [];
    if (users.includes(user.uid)) {
      reactions[emoji] = users.filter(u => u !== user.uid);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...users, user.uid];
    }
    try {
      await updateDoc(doc(db, 'gallery', post.id), { reactions });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'gallery-reaction');
    }
  };

  // Highlights: latest 5
  const highlights = posts.slice(0, 5);

  // Auto-advance with Ken Burns timing
  useEffect(() => {
    if (highlights.length <= 1) return;
    const timer = setInterval(() => setHighlightIndex(i => (i + 1) % highlights.length), 5000);
    return () => clearInterval(timer);
  }, [highlights.length]);

  // Group posts by month
  const groupedByMonth = posts.reduce<Record<string, GalleryPost[]>>((acc, post) => {
    const ts = post.createdAt instanceof Timestamp ? post.createdAt.toDate() : new Date(post.createdAt);
    const key = format(ts, 'yyyy-MM');
    if (!acc[key]) acc[key] = [];
    acc[key].push(post);
    return acc;
  }, {});

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const getPostDate = (post: GalleryPost) => {
    return post.createdAt instanceof Timestamp ? post.createdAt.toDate() : new Date(post.createdAt);
  };

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

      {/* Highlights Carousel - Ken Burns Effect */}
      {highlights.length > 0 && (
        <div className="relative rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl aspect-[16/9] bg-zinc-950">
          {highlights.map((h, i) => (
            <div
              key={h.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-1000",
                i === highlightIndex ? "opacity-100" : "opacity-0"
              )}
            >
              <img
                src={h.imageUrl}
                alt=""
                className={cn(
                  "w-full h-full object-cover",
                  i === highlightIndex && "animate-[kenburns_5s_ease-in-out_forwards]"
                )}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-zinc-950/10" />
          
          {/* Progress bar */}
          <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-10">
            {highlights.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 rounded-full bg-zinc-700 overflow-hidden">
                <div className={cn(
                  "h-full bg-lime-400 rounded-full",
                  i === highlightIndex && "animate-[progress_5s_linear_forwards]",
                  i < highlightIndex && "w-full",
                  i > highlightIndex && "w-0"
                )} />
              </div>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-lime-400" />
              <span className="text-[9px] font-black text-lime-400 uppercase tracking-widest">Highlights</span>
            </div>
            <p className="text-sm font-black text-zinc-100 italic line-clamp-1">{highlights[highlightIndex]?.caption || 'Momen Thirty FC'}</p>
            <p className="text-[10px] text-zinc-400 font-bold mt-1">
              {highlights[highlightIndex]?.userName} • {format(getPostDate(highlights[highlightIndex]), 'd MMM yyyy', { locale: idLocale })}
            </p>
          </div>

          {/* Tap zones */}
          <button onClick={() => setHighlightIndex(i => (i - 1 + highlights.length) % highlights.length)} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" />
          <button onClick={() => setHighlightIndex(i => (i + 1) % highlights.length)} className="absolute right-0 top-0 bottom-0 w-1/3 z-10" />
        </div>
      )}

      {/* Monthly Groups */}
      {loading ? (
        <div className="h-40 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-700 animate-pulse">Memuat...</div>
      ) : posts.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-3xl p-10 text-center">
          <ImageIcon className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Belum ada foto — upload momen pertamamu!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedByMonth).map(([monthKey, monthPosts]) => {
            const isExpanded = expandedMonths.has(monthKey);
            const monthDate = new Date(monthKey + '-01');
            return (
              <div key={monthKey} className="bg-zinc-900/30 border border-zinc-800/30 rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleMonth(monthKey)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center">
                      <span className="text-[10px] font-black text-lime-400">{monthPosts.length}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-zinc-100 uppercase">{format(monthDate, 'MMMM yyyy', { locale: idLocale })}</p>
                      <p className="text-[10px] text-zinc-600 font-bold">{monthPosts.length} foto</p>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform duration-200", isExpanded && "rotate-180")} />
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-3 gap-1.5">
                      {monthPosts.map(post => (
                        <button
                          key={post.id}
                          onClick={() => setLightbox(post)}
                          className="aspect-square rounded-xl overflow-hidden border border-zinc-800/50 hover:border-lime-400/50 transition-all group relative"
                        >
                          <img src={post.imageUrl} alt={post.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                            <p className="text-[9px] font-bold text-zinc-200 line-clamp-1">{post.caption || post.userName}</p>
                            <p className="text-[8px] text-zinc-400">{format(getPostDate(post), 'd MMM')}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
              {/* Reactions */}
              <div className="flex items-center gap-2 mt-3">
                {REACTIONS.map(emoji => {
                  const count = (lightbox.reactions?.[emoji] || []).length;
                  const myReacted = (lightbox.reactions?.[emoji] || []).includes(user?.uid || '');
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(lightbox, emoji)}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition-all",
                        myReacted ? "bg-lime-400/10 border-lime-400/30 scale-110" : "bg-zinc-900 border-zinc-800 hover:border-zinc-600"
                      )}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-[10px] font-black text-zinc-400">{count}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">
                  {lightbox.userName} • {format(getPostDate(lightbox), 'd MMM yyyy, HH:mm', { locale: idLocale })}
                </p>
                {(isAdmin || lightbox.userId === user?.uid) && (
                  <button onClick={() => handleDelete(lightbox)} className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes kenburns {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.1) translate(-1%, -1%); }
        }
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
