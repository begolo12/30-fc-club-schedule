import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot, collection, query, orderBy, setDoc, deleteDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Calendar, MapPin, Users, Wallet, Shield, User as UserIcon, Send, ArrowLeft, Settings, Trash2, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';
import EditScheduleModal from '../components/EditScheduleModal';

// We'll define schemas here roughly as local interfaces
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
  id: string; // same as userId
  userId: string;
  name: string;
  role: 'Goalkeeper' | 'Player';
  joinedAt: number | Timestamp;
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
  
  const [chatText, setChatText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const scheduleRef = doc(db, 'schedules', id);
    const unsubSchedule = onSnapshot(scheduleRef, (snapshot) => {
      if (snapshot.exists()) {
        setSchedule({ id: snapshot.id, ...snapshot.data() } as Schedule);
      } else {
        setSchedule(null);
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `schedules/${id}`));

    const partsRef = collection(db, 'schedules', id, 'participants');
    const unsubParts = onSnapshot(partsRef, (snapshot) => {
      const data: Participant[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Participant));
      setParticipants(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `schedules/${id}/participants`));

    const msgsRef = collection(db, 'schedules', id, 'messages');
    const msgsQuery = query(msgsRef, orderBy('timestamp', 'asc'));
    const unsubMsgs = onSnapshot(msgsQuery, (snapshot) => {
      const data: Message[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Message));
      setMessages(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `schedules/${id}/messages`));

    return () => {
      unsubSchedule();
      unsubParts();
      unsubMsgs();
    };
  }, [id]);

  if (loading) return <div className="py-12 text-center text-zinc-500 uppercase tracking-widest font-bold text-xs">Loading Match...</div>;
  if (!schedule) return <div className="py-12 flex flex-col items-center justify-center text-zinc-500 uppercase tracking-widest font-bold text-xs"><p>Match not found or deleted.</p><button onClick={() => navigate('/')} className="mt-4 bg-lime-400 text-zinc-950 px-4 py-2 rounded-full">Go Back</button></div>;

  const goalkeepers = participants.filter(p => p.role === 'Goalkeeper');
  const players = participants.filter(p => p.role === 'Player');
  
  const isJoined = participants.some(p => p.userId === user?.uid);
  const myParticipantRecord = participants.find(p => p.userId === user?.uid);
  const isCreator = isAdmin;

  const costPerPerson = participants.length > 0 
    ? Math.ceil(schedule.totalCost / participants.length) 
    : schedule.totalCost;

  const handleJoin = async (role: 'Goalkeeper' | 'Player') => {
    if (!user || !id) return;
    try {
      const partRef = doc(db, 'schedules', id, 'participants', user.uid);
      await setDoc(partRef, {
        userId: user.uid,
        name: user.displayName || 'Unknown',
        role,
        joinedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `schedules/${id}/participants`);
    }
  };

  const handleLeave = async () => {
    if (!user || !id) return;
    try {
      const partRef = doc(db, 'schedules', id, 'participants', user.uid);
      await deleteDoc(partRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `schedules/${id}/participants`);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!user || !id || !isCreator) return;
    if (window.confirm('Are you sure you want to delete this match? This cannot be undone.')) {
      setIsDeleting(true);
      try {
        await deleteDoc(doc(db, 'schedules', id));
        navigate('/');
      } catch (err) {
        setIsDeleting(false);
        handleFirestoreError(err, OperationType.DELETE, `schedules/${id}`);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !chatText.trim() || !isJoined) return;
    
    try {
      const msgRef = doc(collection(db, 'schedules', id, 'messages'));
      await setDoc(msgRef, {
        userId: user.uid,
        name: user.displayName || 'Unknown',
        text: chatText.trim(),
        timestamp: serverTimestamp()
      });
      setChatText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `schedules/${id}/messages`);
    }
  };

  const isPast = schedule.timestamp < Date.now();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="bg-zinc-900/50 px-4 py-1.5 rounded-full flex items-center gap-2 border border-zinc-800"> 
            <div className={`w-2 h-2 rounded-full ${isPast ? 'bg-zinc-600' : 'bg-lime-400 animate-pulse'}`}></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{isPast ? 'Completed' : 'Upcoming Match'}</span>
          </div>
        </div>
        
        {isCreator && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Edit Match"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={handleDeleteSchedule}
              disabled={isDeleting}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-red-900/50 hover:border-red-500/50 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-50"
              title="Delete Match"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-4 min-h-[600px] md:min-h-0 pb-4 md:pb-0">
        
        {/* Main Schedule Info Box (Col 8, Row 3) */}
        <div className="md:col-span-8 md:row-span-3 bg-zinc-900/50 rounded-3xl border border-zinc-800 p-6 flex flex-col justify-between overflow-hidden relative shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] font-black text-8xl italic pointer-events-none uppercase tracking-tighter mix-blend-overlay">
            {format(schedule.timestamp, 'MMM').toUpperCase()}
          </div>
          
          <div className="z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-lime-400/10 text-lime-400 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-lime-400/20">
                Match Details
              </div>
              <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800/50">
                {format(schedule.timestamp, "d MMM yyyy", { locale: idLocale })}
              </span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-black italic mb-2 tracking-tighter uppercase line-clamp-2 pr-10">
              {schedule.location}
            </h2>
            
            <div className="flex flex-wrap gap-6 md:gap-10 mt-6 md:mt-8">
              <div className="flex flex-col">
                <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-1">Title</span>
                <span className="text-base md:text-xl font-bold text-zinc-200">{schedule.title}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-1">Time</span>
                <span className="text-base md:text-xl font-bold text-lime-400">{format(schedule.timestamp, "HH:mm")}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 md:mt-8 grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-zinc-800/80 pt-6">
            <div className="bg-zinc-950/50 p-3 md:p-4 rounded-2xl border border-zinc-800/50">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 tracking-widest">Field Rent</p>
              <p className="text-sm md:text-lg font-bold text-zinc-300">Rp {schedule.fieldCost.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-zinc-950/50 p-3 md:p-4 rounded-2xl border border-zinc-800/50 hidden md:block">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 tracking-widest">Drinks/Add-ons</p>
              <p className="text-sm md:text-lg font-bold text-zinc-300">Rp {schedule.otherCost.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-lime-400 p-3 md:p-4 rounded-2xl text-zinc-950 shadow-[0_0_20px_rgba(163,230,53,0.15)] col-span-1 md:col-span-1 flex flex-col justify-center">
              <p className="text-[10px] opacity-70 uppercase font-bold mb-0.5 tracking-widest">Cost/Person</p>
              <div className="flex items-baseline gap-1">
                <p className="text-lg md:text-2xl font-black italic tracking-tight">Rp {costPerPerson.toLocaleString('id-ID')}</p>
                <span className="text-[10px] font-bold opacity-70">/{Math.max(1, participants.length)}pax</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Roster / Squad Box (Col 4, Row 6) */}
        <div className="md:col-span-4 md:row-span-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 md:p-6 flex flex-col shadow-2xl relative min-h-[400px]">
          <div className="flex justify-between items-center mb-6 shrink-0 flex-wrap gap-2">
            <h3 className="font-black uppercase italic tracking-tighter text-xl flex items-center gap-2">
              Squad <span className="text-lime-400 text-sm font-bold bg-lime-400/10 px-2 py-0.5 rounded-md not-italic tracking-normal">({participants.length})</span>
            </h3>
            {!isJoined ? (
              <div className="flex gap-2">
                 <button onClick={() => handleJoin('Goalkeeper')} className="bg-orange-500 hover:bg-orange-400 text-zinc-950 text-[10px] font-bold py-2 px-3 rounded-full transition-all uppercase tracking-widest shadow-sm">+ GK</button>
                 <button onClick={() => handleJoin('Player')} className="bg-lime-400 hover:bg-lime-300 text-zinc-950 text-[10px] font-bold py-2 px-3 rounded-full transition-all uppercase tracking-widest shadow-sm">+ FP</button>
              </div>
            ) : (
              <button onClick={handleLeave} className="bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:text-red-400 text-zinc-400 text-[10px] font-bold py-2 px-4 rounded-full transition-all uppercase tracking-widest">Leave</button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {/* Goalkeepers */}
            {goalkeepers.map(p => (
               <div key={p.id} className={`flex items-center justify-between p-3 bg-zinc-950 rounded-2xl border-l-4 border-orange-500 ${p.userId === user?.uid ? 'ring-1 ring-orange-500/30' : ''}`}>
                 <div className="flex items-center gap-3">
                   <span className="text-[10px] font-black text-orange-500 tracking-widest bg-orange-500/10 px-2 py-1 rounded">GK</span>
                   <span className="font-medium text-sm text-zinc-200">{p.name} {p.userId === user?.uid && <span className="text-orange-500 text-[10px] ml-1 uppercase font-bold">(You)</span>}</span>
                 </div>
               </div>
            ))}
            {/* Players */}
            {players.map(p => (
               <div key={p.id} className={`flex items-center justify-between p-3 bg-zinc-800/30 rounded-2xl border-l-4 border-lime-400 ${p.userId === user?.uid ? 'ring-1 ring-lime-400/30 bg-lime-400/5' : ''}`}>
                 <div className="flex items-center gap-3">
                   <span className="text-[10px] font-black text-lime-400 tracking-widest bg-lime-400/10 px-2 py-1 rounded">FP</span>
                   <span className="font-medium text-sm text-zinc-200">{p.name} {p.userId === user?.uid && <span className="text-lime-400 text-[10px] ml-1 uppercase font-bold">(You)</span>}</span>
                 </div>
               </div>
            ))}
            {participants.length === 0 && (
               <div className="h-full min-h-[200px] flex flex-col items-center justify-center opacity-50 py-10">
                 <div className="w-12 h-12 border-2 border-dashed border-zinc-700 rounded-full mb-3 flex items-center justify-center">
                   <Users className="w-5 h-5 text-zinc-600" />
                 </div>
                 <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">No participants yet</p>
               </div>
            )}
          </div>
        </div>
        
        {/* Chat Box (Col 8, Row 3) */}
        <div className="md:col-span-8 md:row-span-3 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col shadow-lg overflow-hidden min-h-[350px]">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 border-l-2 border-zinc-700 pl-3 shrink-0">Squad Coordination</h4>
          
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-3 flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                 <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold bg-zinc-950 px-4 py-2 rounded-full border border-zinc-800/50">Say hi to the squad</span>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.userId === user?.uid;
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const showName = !prevMsg || prevMsg.userId !== msg.userId;
                
                return (
                  <div key={msg.id} className={`flex flex-col gap-1 max-w-[85%] md:max-w-[70%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                    {!isMe && showName && <span className="text-[9px] text-zinc-500 font-bold ml-2 uppercase tracking-wide">{msg.name}</span>}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-lime-400 text-zinc-950 rounded-tr-[4px] font-medium' : 'bg-zinc-800/80 text-zinc-200 rounded-tl-[4px] border border-zinc-700/50'}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="mt-auto shrink-0 relative">
            {!isJoined ? (
              <div className="bg-zinc-950 border border-zinc-800/50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Join match to participate in chat</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input 
                  type="text" 
                  value={chatText}
                  onChange={e => setChatText(e.target.value)}
                  placeholder="Type coordination..." 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-full py-3 pl-4 pr-14 text-sm focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 text-zinc-200 placeholder-zinc-600 transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!chatText.trim()}
                  className="absolute right-1.5 w-9 h-9 bg-lime-400 hover:bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-full flex items-center justify-center text-zinc-950 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            )}
          </div>
        </div>
        
      </div>

      {isCreator && (
        <EditScheduleModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          schedule={schedule}
        />
      )}
    </div>
  );
}
