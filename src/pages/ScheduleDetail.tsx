import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy, setDoc, deleteDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { format, isBefore, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Calendar, MapPin, Users, Wallet, Shield, Send, ArrowLeft, Trash2, Edit2, QrCode, CheckCircle2, Banknote, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import EditScheduleModal from '../components/EditScheduleModal';
import JoinMatchModal from '../components/JoinMatchModal';
import FormationModal from '../components/FormationModal';

interface Schedule {
  id: string;
  title: string;
  timestamp: number;
  location: string;
  fieldCost: number;
  otherCost: number;
  totalCost: number;
  status: string;
  creatorId: string;
}

interface Participant {
  id: string;
  userId: string;
  name: string;
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
  text: string;
  timestamp: number | Timestamp;
}

export default function ScheduleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isFormationModalOpen, setIsFormationModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQris, setShowQris] = useState(false);

  useEffect(() => {
    if (!id) return;
    
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

    return () => {
      unsubSchedule();
      unsubParts();
      unsubMsgs();
    };
  }, [id]);

  if (loading) return <div className="py-12 text-center text-zinc-500 uppercase tracking-widest font-bold text-xs">Loading Match...</div>;
  if (!schedule) return <div className="py-12 flex flex-col items-center justify-center text-zinc-500 uppercase tracking-widest font-bold text-xs"><p>Match not found.</p><button onClick={() => navigate('/')} className="mt-4 bg-lime-400 text-zinc-950 px-4 py-2 rounded-full">Go Back</button></div>;

  const teamA = participants.filter(p => p.team === 'A');
  const teamB = participants.filter(p => p.team === 'B');
  const isJoined = participants.some(p => p.userId === user?.uid);
  const myParticipantRecord = participants.find(p => p.userId === user?.uid);
  const costPerPerson = participants.length > 0 ? Math.ceil(schedule.totalCost / participants.length) : schedule.totalCost;

  const isHMinus1 = isBefore(subDays(new Date(schedule.timestamp), 1), new Date());
  const canPay = isHMinus1 && isJoined && myParticipantRecord?.paymentStatus === 'unpaid';

  const handleJoin = async (selection: { position: string, team: 'A' | 'B', status: 'starting' | 'substitute' }) => {
    if (!user || !id) return;
    try {
      await setDoc(doc(db, 'schedules', id, 'participants', user.uid), {
        userId: user.uid,
        name: user.displayName || 'Unknown',
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
    try { await deleteDoc(doc(db, 'schedules', id, 'participants', user.uid)); } 
    catch (err) { handleFirestoreError(err, OperationType.DELETE, 'participants'); }
  };

  const handleConfirmPayment = async () => {
    if (!user || !id) return;
    try {
      await updateDoc(doc(db, 'schedules', id, 'participants', user.uid), { paymentStatus: 'pending_qris' });
      setShowQris(false);
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'payment'); }
  };

  const handleVerifyPayment = async (participantId: string, status: 'paid_qris' | 'paid_cash' | 'unpaid') => {
    if (!isAdmin || !id) return;
    try {
      await updateDoc(doc(db, 'schedules', id, 'participants', participantId), { paymentStatus: status });
      if (status !== 'unpaid') {
        const p = participants.find(x => x.id === participantId);
        await setDoc(doc(collection(db, 'finance')), {
          amount: costPerPerson,
          type: 'income',
          description: `${status === 'paid_qris' ? 'QRIS' : 'Cash'} Payment: ${schedule.title}`,
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
        name: user.displayName || 'Unknown',
        text: chatText.trim(),
        timestamp: serverTimestamp()
      });
      setChatText('');
    } catch (err) { handleFirestoreError(err, OperationType.WRITE, 'chat'); }
  };

  const renderSquad = (squad: Participant[], teamName: string, colorClass: string) => (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex items-center justify-between px-2">
        <h4 className={cn("text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2", colorClass)}>
          <div className={cn("w-3 h-3 rounded-full", colorClass.includes('red') ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]')} />
          {teamName}
        </h4>
        <span className="text-[10px] font-bold text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full">{squad.filter(s => s.status === 'starting').length}/9 Starting</span>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest px-2">Starting IX</p>
          {squad.filter(p => p.status === 'starting').map(p => (
            <div key={p.id} className={cn(
              "flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-[1.5rem] group hover:border-zinc-700 transition-all",
              p.userId === user?.uid && "border-lime-400/50 bg-lime-400/5"
            )}>
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 flex items-center justify-center bg-zinc-950 rounded-xl text-[10px] font-black text-lime-400 border border-zinc-800 uppercase">{p.role}</span>
                <span className="font-bold text-sm text-zinc-200 uppercase tracking-tight line-clamp-1">{p.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {p.paymentStatus === 'pending_qris' && <Clock className="w-4 h-4 text-orange-400 animate-spin" />}
                {p.paymentStatus === 'paid_qris' && <QrCode className="w-4 h-4 text-lime-400" />}
                {p.paymentStatus === 'paid_cash' && <Banknote className="w-4 h-4 text-lime-400" />}
                {isAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    {p.paymentStatus === 'pending_qris' && (
                      <button onClick={() => handleVerifyPayment(p.id, 'paid_qris')} className="w-7 h-7 bg-lime-400 text-zinc-950 rounded-lg flex items-center justify-center shadow-lg"><CheckCircle2 className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => handleVerifyPayment(p.id, p.paymentStatus === 'paid_cash' ? 'unpaid' : 'paid_cash')} className={cn("w-7 h-7 rounded-lg flex items-center justify-center", p.paymentStatus === 'paid_cash' ? "bg-lime-400 text-zinc-950" : "bg-zinc-800 text-zinc-600")}><Banknote className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-4">
          <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest px-2">Substitutes</p>
          {squad.filter(p => p.status === 'substitute').map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl grayscale opacity-60">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-zinc-600 w-8">{p.role}</span>
                <span className="font-bold text-xs text-zinc-500 uppercase">{p.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button onClick={() => setIsEditModalOpen(true)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:text-lime-400"><Edit2 className="w-5 h-5" /></button>
              <button onClick={() => navigate('/')} className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Match Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none"><Shield className="w-64 h-64" /></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="bg-lime-400 text-zinc-950 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest italic">Match Day</span>
                <span className="text-zinc-500 text-xs font-black uppercase tracking-widest">
                  {format(schedule.timestamp, 'EEEE, d MMMM yyyy', { locale: idLocale })}
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-zinc-100 mb-8 leading-none">{schedule.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-zinc-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center text-lime-400 border border-zinc-800"><Calendar className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Date</p><p className="text-lg font-bold text-zinc-200">{format(schedule.timestamp, 'd MMM yyyy')}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center text-lime-400 border border-zinc-800"><MapPin className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Location</p><p className="text-lg font-bold text-zinc-200 line-clamp-1">{schedule.location}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center text-lime-400 border border-zinc-800"><Clock className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Kick Off</p><p className="text-lg font-bold text-zinc-200">{format(schedule.timestamp, 'HH:mm')} WIB</p></div>
                </div>
              </div>
            </div>
          </div>

          {/* Join Actions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-zinc-950 rounded-2xl flex items-center justify-center text-lime-400 border border-zinc-800"><Users className="w-7 h-7" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Squad</p>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-black text-zinc-100 italic">{participants.length} Players</p>
                  <button 
                    onClick={() => setIsFormationModalOpen(true)}
                    className="bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-lime-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Lihat Formasi
                  </button>
                </div>
              </div>
            </div>
            {!isJoined ? (
              <button onClick={() => setIsJoinModalOpen(true)} className="bg-lime-400 hover:bg-lime-300 text-zinc-950 px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg">Join Squad</button>
            ) : (
              <div className="flex gap-3">
                <button onClick={handleLeave} className="px-6 py-4 rounded-2xl border border-zinc-800 text-zinc-500 font-bold uppercase tracking-widest text-xs hover:border-red-500 hover:text-red-500 transition-all">Leave</button>
                {canPay && <button onClick={() => setShowQris(true)} className="bg-lime-400 text-zinc-950 px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg"><QrCode className="w-4 h-4" /> Pay</button>}
                {myParticipantRecord?.paymentStatus === 'pending_qris' && <div className="bg-orange-400/10 px-6 py-4 rounded-2xl border border-orange-400/30 text-orange-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4 animate-spin" /> Pending</div>}
                {myParticipantRecord?.paymentStatus && !['unpaid', 'pending_qris'].includes(myParticipantRecord.paymentStatus) && <div className="bg-zinc-950 px-6 py-4 rounded-2xl border border-lime-400/30 text-lime-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Verified</div>}
              </div>
            )}
          </div>

          {/* Squad Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {renderSquad(teamA, 'Team A (Red)', 'text-red-400')}
            {renderSquad(teamB, 'Team B (Blue)', 'text-blue-400')}
          </div>
        </div>

        {/* RIGHT: Chat */}
        <div className="lg:col-span-4 flex flex-col h-[600px] bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 border-l-2 border-lime-400 pl-3">Match Chat</h4>
          <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
            {messages.map(msg => (
              <div key={msg.id} className={cn("max-w-[85%] group", msg.userId === user?.uid ? "ml-auto" : "")}>
                <div className={cn("p-4 rounded-2xl", msg.userId === user?.uid ? "bg-lime-400 text-zinc-950 rounded-tr-none" : "bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-tl-none")}>
                  <p className="text-[9px] font-black uppercase opacity-40 mb-1">{msg.name}</p>
                  <p className="text-sm font-medium">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input value={chatText} onChange={e => setChatText(e.target.value)} placeholder="Type message..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-lime-400 outline-none" />
            <button className="p-3 bg-lime-400 text-zinc-950 rounded-xl hover:bg-lime-300"><Send className="w-5 h-5" /></button>
          </form>
        </div>
      </div>

      <JoinMatchModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} onJoin={handleJoin} participants={participants} />
      <FormationModal isOpen={isFormationModalOpen} onClose={() => setIsFormationModalOpen(false)} participants={participants} />
      <EditScheduleModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} schedule={schedule} />

      {showQris && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-2xl font-black italic uppercase tracking-tight text-zinc-100 mb-2">Scan to Pay</h3>
            <div className="bg-white p-6 rounded-[2rem] mb-6">{qrisUrl ? <img src={qrisUrl} alt="QRIS" className="w-full" /> : <div className="aspect-square flex items-center justify-center text-zinc-400">QRIS Not Set</div>}</div>
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6"><p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Amount</p><p className="text-2xl font-black text-lime-400">Rp {costPerPerson.toLocaleString('id-ID')}</p></div>
            <button onClick={handleConfirmPayment} className="w-full bg-lime-400 py-4 rounded-xl font-black uppercase tracking-widest shadow-lg">Confirm Paid</button>
            <button onClick={() => setShowQris(false)} className="w-full mt-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
