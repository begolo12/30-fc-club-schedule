import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy, setDoc, deleteDoc, updateDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { format, isBefore, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Calendar, MapPin, Users, Send, ArrowLeft, Trash2, Edit2, QrCode, CheckCircle2, Banknote, Clock, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import EditScheduleModal from '../components/EditScheduleModal';
import JoinMatchModal from '../components/JoinMatchModal';
import FormationModal from '../components/FormationModal';
import DeleteScheduleModal from '../components/DeleteScheduleModal';
import { listenForChatNotifications, listenForPaymentNotifications } from '../lib/realtimeNotifications';

interface Schedule {
  id: string;
  title: string;
  timestamp: number;
  location: string;
  fieldCost: number;
  dpCost: number;
  otherCosts?: { description: string, amount: number }[];
  otherCost: number;
  totalCost: number;
  status: string;
  creatorId: string;
  feePerPlayer?: number;
  responsibleUserId?: string;
  responsibleName?: string;
  deletedAt?: number;
  deletionReason?: string;
}

interface Participant {
  id: string;
  userId: string;
  name: string;
  nickname?: string;
  role: string;
  team: 'A' | 'B';
  status: 'starting' | 'substitute';
  joinedAt: number | Timestamp;
  paymentStatus?: 'unpaid' | 'pending_qris' | 'paid_qris' | 'paid_cash';
}

interface Message {
  id: string;
  userId: string;
  name: string;
  nickname?: string;
  text: string;
  timestamp: number | Timestamp;
}

export default function ScheduleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, nickname } = useAuth();
  
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormationModalOpen, setIsFormationModalOpen] = useState(false);
  const [showQris, setShowQris] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    
    const unsubSchedule = onSnapshot(doc(db, 'schedules', id), (snapshot) => {
      if (snapshot.exists()) {
        setSchedule({ id: snapshot.id, ...snapshot.data() } as Schedule);
      } else {
        setSchedule(null);
      }
      setLoading(false);
    });

    const unsubParts = onSnapshot(collection(db, 'schedules', id, 'participants'), (snapshot) => {
      const data: Participant[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Participant));
      setParticipants(data);
    });

    const msgsQuery = query(collection(db, 'schedules', id, 'messages'), orderBy('timestamp', 'asc'));
    const unsubMsgs = onSnapshot(msgsQuery, (snapshot) => {
      const data: Message[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Message));
      setMessages(data);
    });

    onSnapshot(doc(db, 'settings', 'club_info'), (snapshot) => {
      if (snapshot.exists()) setQrisUrl(snapshot.data().qrisUrl);
    });

    // Setup realtime notification listeners
    const chatListener = listenForChatNotifications(
      id, 
      user.uid, 
      schedule?.title || 'Pertandingan'
    );

    const paymentListener = listenForPaymentNotifications(
      id,
      isAdmin,
      schedule?.title || 'Pertandingan'
    );

    return () => {
      unsubSchedule();
      unsubParts();
      unsubMsgs();
      chatListener.unsubscribe();
      paymentListener.unsubscribe();
    };
  }, [id, user, isAdmin, schedule?.title]);

  if (loading) return <div className="py-12 text-center text-zinc-500 uppercase tracking-widest font-black text-[10px] animate-pulse">Memuat Pertandingan...</div>;
  if (!schedule) return <div className="py-12 flex flex-col items-center justify-center text-zinc-500 uppercase tracking-widest font-bold text-xs"><p>Pertandingan tidak ditemukan.</p><button onClick={() => navigate('/')} className="mt-4 bg-lime-400 text-zinc-950 px-4 py-2 rounded-full">Kembali</button></div>;

  const teamAParticipants = participants.filter(p => p.team === 'A');
  const teamBParticipants = participants.filter(p => p.team === 'B');
  const hasJoined = participants.some(p => p.userId === user?.uid);
  const myRecord = participants.find(p => p.userId === user?.uid);
  const iuranFix = schedule.feePerPlayer && schedule.feePerPlayer > 0
    ? schedule.feePerPlayer
    : Math.max(0, Math.ceil(schedule.totalCost / Math.max(participants.length || 1, 1)));
  const totalCollected = participants.filter(p => p.paymentStatus && p.paymentStatus !== 'unpaid').length * iuranFix;
  const financialDiff = totalCollected - (schedule?.totalCost || 0);

  const handleJoin = async (selection: { position: string, team: 'A' | 'B', status: 'starting' | 'substitute' }) => {
    if (!user || !id) return;
    try {
      await setDoc(doc(db, 'schedules', id, 'participants', user.uid), {
        userId: user.uid,
        name: user.displayName || 'Pemain Anonim',
        nickname: nickname || user.displayName?.substring(0, 6) || 'Pemain',
        role: selection.position,
        team: selection.team,
        status: selection.status,
        joinedAt: serverTimestamp(),
        paymentStatus: 'unpaid'
      }, { merge: true });
      setIsJoinModalOpen(false);
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'participants'); }
  };

  const handleLeave = async () => {
    if (!user || !id) return;
    if (!confirm('Apakah Anda yakin ingin keluar dari pertandingan ini?')) return;
    try { await deleteDoc(doc(db, 'schedules', id, 'participants', user.uid)); } 
    catch (err) { handleFirestoreError(err, OperationType.DELETE, 'participants'); }
  };

  const handleConfirmDelete = async (reason: string) => {
    if (!isAdmin || !id) return;
    try {
      await updateDoc(doc(db, 'schedules', id), {
        status: 'cancelled',
        deletedAt: Date.now(),
        deletionReason: reason
      });
      setIsDeleteModalOpen(false);
      navigate('/');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'schedule');
    }
  };

  const handleVerifyPayment = async (participantId: string, status: 'paid_qris' | 'paid_cash' | 'unpaid') => {
    if (!isAdmin || !id) return;
    if (status !== 'unpaid' && !confirm('Konfirmasi pembayaran sudah masuk?')) return;
    try {
      // Prevent double entry
      const pDoc = await getDoc(doc(db, 'schedules', id, 'participants', participantId));
      const current = pDoc.data()?.paymentStatus;
      if ((current === 'paid_qris' || current === 'paid_cash') && status !== 'unpaid') return;

      await updateDoc(doc(db, 'schedules', id, 'participants', participantId), { paymentStatus: status });
      if (status !== 'unpaid') {
        const p = participants.find(x => x.userId === participantId);
        await setDoc(doc(collection(db, 'finance')), {
          amount: iuranFix,
          type: 'income',
          description: `Bayar ${status === 'paid_qris' ? 'QRIS' : 'Tunai'}: ${schedule.title}`,
          userName: p?.name,
          userId: p?.userId,
          matchId: id,
          timestamp: Date.now()
        });
      }
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'verification'); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !chatText.trim()) return;
    try {
      await setDoc(doc(collection(db, 'schedules', id, 'messages')), {
        userId: user.uid,
        name: user.displayName || 'Pemain',
        nickname: nickname || user.displayName?.substring(0, 6) || 'Pemain',
        text: chatText.trim(),
        timestamp: serverTimestamp()
      });
      setChatText('');
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'chat'); }
  };

  const renderSquad = (squad: Participant[], teamName: string, colorClass: string) => (
    <div className="flex-1 flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h4 className={cn("text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2", colorClass)}>
          <div className={cn("w-2 h-2 rounded-full", colorClass.includes('red') ? 'bg-red-500' : 'bg-blue-500')} />
          {teamName}
        </h4>
        <span className="text-[8px] font-black text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full">{squad.filter(s => s.status === 'starting').length}/9 IX</span>
      </div>

      <div className="space-y-2">
        {squad.filter(p => p.status === 'starting').map(p => (
          <div key={p.id} className={cn(
            "flex items-center justify-between px-3 py-2 bg-zinc-900/40 border border-zinc-800/50 rounded-xl group",
            p.userId === user?.uid && "border-lime-400/30 bg-lime-400/5"
          )}>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center bg-zinc-950 rounded-lg text-[8px] font-black text-lime-400 border border-zinc-800 uppercase">
                  {p.role.split('-')[0]}
                </span>
                <span className="font-bold text-[12px] text-zinc-300 uppercase tracking-tight line-clamp-1">{p.nickname || p.name}</span>
              </div>
            <div className="flex items-center gap-2">
              {p.paymentStatus === 'paid_qris' && <QrCode className="w-3.5 h-3.5 text-lime-400" />}
              {p.paymentStatus === 'paid_cash' && <Banknote className="w-3.5 h-3.5 text-lime-400" />}
              {p.paymentStatus === 'pending_qris' && <Clock className="w-3.5 h-3.5 text-orange-400 animate-spin" />}
              {isAdmin && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleVerifyPayment(p.userId, p.paymentStatus === 'paid_cash' ? 'unpaid' : 'paid_cash')} className={cn("w-6 h-6 rounded-md flex items-center justify-center", p.paymentStatus === 'paid_cash' ? "bg-lime-400 text-zinc-950" : "bg-zinc-800 text-zinc-600")}><Banknote className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-1 pt-2 border-t border-zinc-800/30">
          {squad.filter(p => p.status === 'substitute').map(p => (
            <div key={p.id} className="px-2 py-1 bg-zinc-950/40 border border-zinc-900 rounded-lg opacity-60 flex items-center gap-2">
              <span className="text-[7px] font-black text-zinc-600 uppercase">{p.role}</span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase">{p.nickname || p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex items-center justify-between px-1">
        <button onClick={() => navigate(-1)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 text-zinc-400"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button onClick={() => setIsEditModalOpen(true)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:text-lime-400 transition-colors"><Edit2 className="w-5 h-5" /></button>
              <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:text-red-400 transition-colors"><Trash2 className="w-5 h-5" /></button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Hero */}
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 md:p-8 overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] font-black text-[8rem] italic pointer-events-none uppercase tracking-tighter text-zinc-100">
              {format(schedule.timestamp, 'HH:mm')}
            </div>
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <span className="bg-lime-400 text-zinc-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest italic">Detail Pertandingan</span>
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{format(schedule.timestamp, 'EEEE, d MMM yyyy', { locale: idLocale })}</span>
              </div>
              <div>
                <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-zinc-100 leading-tight">{schedule.title}</h2>
                <div className="flex flex-wrap gap-4 items-center mt-5 pt-5 border-t border-zinc-800/50 text-[11px]">
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-lime-400" /><span className="font-bold text-zinc-300 uppercase">{schedule.location}</span></div>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-lime-400" /><span className="font-bold text-zinc-300 uppercase">{format(schedule.timestamp, 'HH:mm')} WIB</span></div>
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 text-lime-400" /><span className="font-bold text-zinc-300 uppercase">{participants.length} Pemain</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Rincian Biaya */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Sewa & DP</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-300"><span>Sewa Lapangan:</span><span className="font-black italic">Rp {schedule.fieldCost?.toLocaleString('id-ID')}</span></div>
                {schedule.dpCost > 0 && <div className="flex justify-between text-xs text-lime-400"><span>DP Dibayar:</span><span className="font-black italic">- Rp {schedule.dpCost?.toLocaleString('id-ID')}</span></div>}
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Biaya Tambahan</p>
              <div className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar">
                {schedule.otherCosts && schedule.otherCosts.length > 0 ? schedule.otherCosts.map((oc, i) => (
                  <div key={i} className="flex justify-between text-[10px] text-zinc-300"><span className="truncate pr-2">{oc.description}:</span><span className="font-black italic shrink-0 text-zinc-100">Rp {oc.amount?.toLocaleString('id-ID')}</span></div>
                )) : <p className="text-[10px] text-zinc-600 font-bold italic">Tidak ada biaya tambahan</p>}
              </div>
            </div>
            <div className="bg-lime-400 text-zinc-950 rounded-3xl p-6 shadow-lg shadow-lime-400/10 flex flex-col justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Ekonomi Laga</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold"><span className="opacity-70">Total Biaya:</span><span className="italic">Rp {schedule.totalCost?.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-sm font-black border-t border-zinc-950/10 pt-1"><span>Iuran Fix:</span><span className="italic">Rp {iuranFix.toLocaleString('id-ID')}</span></div>
                </div>
              </div>

              {(schedule.responsibleName || schedule.responsibleUserId) && (
                <div className="bg-white/80 text-zinc-900 rounded-2xl p-3 shadow-inner">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Penanggung Jawab</p>
                  <p className="text-sm font-black italic truncate">{schedule.responsibleName || schedule.responsibleUserId}</p>
                </div>
              )}

              {isAdmin && (
                <div className="mt-4 pt-4 border-t border-zinc-950/20">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Status Keuangan (Admin)</p>
                  <div className="flex justify-between text-[10px] font-black">
                    <span className="opacity-60">Terkumpul:</span>
                    <span className="italic text-emerald-800">Rp {totalCollected.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-black mt-1">
                    <span className="opacity-60">{financialDiff >= 0 ? 'Surplus:' : 'Kurang:'}</span>
                    <span className={cn("italic", financialDiff >= 0 ? "text-emerald-900" : "text-red-700")}>
                      {financialDiff >= 0 ? '+' : '-'} Rp {Math.abs(financialDiff).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Join Actions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-4 md:gap-6 shadow-xl sticky bottom-4 md:static z-20">
            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-lime-400/10 rounded-2xl flex items-center justify-center text-lime-400"><Users className="w-6 h-6 md:w-7 md:h-7" /></div>
              <div className="min-w-0">
                <h4 className="text-lg md:text-xl font-black italic uppercase tracking-tighter text-zinc-100 line-clamp-1">Ayo Join Laga!</h4>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Pilih posisi & konfirmasi bayar</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
              <button onClick={() => setIsFormationModalOpen(true)} className="flex-1 md:flex-none bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Formasi</button>
              {hasJoined ? (
                <button onClick={handleLeave} className="flex-1 md:flex-none bg-red-500 hover:bg-red-400 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg">Keluar</button>
              ) : (
                <button onClick={() => setIsJoinModalOpen(true)} className="flex-1 md:flex-none bg-lime-400 hover:bg-lime-300 text-zinc-950 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg">Ikut Main</button>
              )}
            </div>
          </div>

          {/* Skuad */}
          <div className="flex flex-col md:flex-row gap-8">
            {renderSquad(teamAParticipants, 'Tim A (Merah)', 'text-red-400')}
            {renderSquad(teamBParticipants, 'Tim B (Biru)', 'text-blue-400')}
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-4 flex flex-col h-[500px] bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 border-l-2 border-lime-400 pl-3">Obrolan Laga</h4>
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 custom-scrollbar">
            {messages.map(msg => (
              <div key={msg.id} className={cn("max-w-[90%] group", msg.userId === user?.uid ? "ml-auto" : "")}>
                <div className={cn("px-4 py-3 rounded-2xl shadow-sm", msg.userId === user?.uid ? "bg-lime-400 text-zinc-950 rounded-tr-none" : "bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-tl-none")}>
                  <p className="text-[8px] font-black uppercase opacity-50 mb-0.5">{msg.name}</p>
                  <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input value={chatText} onChange={e => setChatText(e.target.value)} placeholder="Tulis pesan..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:border-lime-400 outline-none" />
            <button className="p-2.5 bg-lime-400 text-zinc-950 rounded-xl hover:bg-lime-300"><Send className="w-4 h-4" /></button>
          </form>
        </div>
      </div>

      <JoinMatchModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} onJoin={handleJoin} participants={participants} />
      <FormationModal isOpen={isFormationModalOpen} onClose={() => setIsFormationModalOpen(false)} participants={participants} />
      <EditScheduleModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} schedule={schedule} />
      <DeleteScheduleModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        onConfirm={handleConfirmDelete}
        title={schedule.title}
      />
    </div>
  );
}
