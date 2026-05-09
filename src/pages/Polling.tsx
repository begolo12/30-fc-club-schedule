import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, arrayUnion, arrayRemove, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface Poll {
  id: string;
  question: string;
  options: { text: string; votes: string[] }[];
  createdBy: string;
  createdAt: Timestamp | number;
  closed?: boolean;
}

export default function Polling() {
  const { user, isAdmin, nickname } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  useEffect(() => {
    const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPolls(snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll)));
    });
    return unsub;
  }, []);

  const handleCreate = async () => {
    const validOptions = options.filter(o => o.trim());
    if (!question.trim() || validOptions.length < 2) return;
    try {
      await addDoc(collection(db, 'polls'), {
        question: question.trim(),
        options: validOptions.map(o => ({ text: o.trim(), votes: [] })),
        createdBy: nickname || user?.displayName || 'Admin',
        createdAt: serverTimestamp(),
        closed: false
      });
      setQuestion('');
      setOptions(['', '']);
      setShowForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'polls');
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!user) return;
    const poll = polls.find(p => p.id === pollId);
    if (!poll || poll.closed) return;

    // Remove previous vote if any
    const updatedOptions = poll.options.map((opt, i) => ({
      text: opt.text,
      votes: i === optionIndex
        ? opt.votes.includes(user.uid) ? opt.votes.filter(v => v !== user.uid) : [...opt.votes, user.uid]
        : opt.votes.filter(v => v !== user.uid)
    }));

    try {
      await updateDoc(doc(db, 'polls', pollId), { options: updatedOptions });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'poll-vote');
    }
  };

  const handleClosePoll = async (pollId: string) => {
    try {
      await updateDoc(doc(db, 'polls', pollId), { closed: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'poll-close');
    }
  };

  const getTotalVotes = (poll: Poll) => poll.options.reduce((a, o) => a + o.votes.length, 0);

  return (
    <div className="flex-1 flex flex-col gap-6 pb-24 md:pb-12">
      <header className="flex justify-between items-start px-1">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-lime-400">Polling</h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Vote & Tentukan Bersama</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-lime-400 text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            {showForm ? 'Batal' : '+ Buat Poll'}
          </button>
        )}
      </header>

      {/* Create Poll Form */}
      {isAdmin && showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Poll Baru</h4>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Pertanyaan (misal: Main jam berapa?)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 font-bold outline-none focus:border-lime-400/50 placeholder:text-zinc-700"
            />
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Opsi ${i + 1}`}
                  value={opt}
                  onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n); }}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 outline-none focus:border-lime-400/50 placeholder:text-zinc-700"
                />
                {options.length > 2 && (
                  <button onClick={() => setOptions(options.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-red-400 px-2">✕</button>
                )}
              </div>
            ))}
            <button onClick={() => setOptions([...options, ''])} className="text-[9px] font-black text-lime-400 uppercase tracking-widest self-start hover:text-lime-300">+ Tambah Opsi</button>
            <button
              onClick={handleCreate}
              disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
              className="w-full bg-lime-400 text-zinc-950 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30 hover:bg-lime-300 transition-all mt-2"
            >
              Buat Poll
            </button>
          </div>
        </div>
      )}

      {/* Polls List */}
      <div className="space-y-4">
        {polls.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-3xl p-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Belum ada polling</p>
          </div>
        ) : polls.map(poll => {
          const total = getTotalVotes(poll);
          const myVote = poll.options.findIndex(o => o.votes.includes(user?.uid || ''));
          return (
            <div key={poll.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-sm font-black text-zinc-100 uppercase italic tracking-tight">{poll.question}</h4>
                  <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">
                    {poll.createdBy} • {poll.createdAt && format(poll.createdAt instanceof Timestamp ? poll.createdAt.toDate() : poll.createdAt, 'd MMM yyyy', { locale: idLocale })}
                    {poll.closed && <span className="ml-2 text-red-400">• DITUTUP</span>}
                  </p>
                </div>
                {isAdmin && !poll.closed && (
                  <button onClick={() => handleClosePoll(poll.id)} className="text-[10px] font-black text-zinc-600 uppercase hover:text-red-400">Tutup</button>
                )}
              </div>
              <div className="space-y-2">
                {poll.options.map((opt, i) => {
                  const pct = total > 0 ? Math.round((opt.votes.length / total) * 100) : 0;
                  const isMyVote = myVote === i;
                  return (
                    <button
                      key={i}
                      onClick={() => !poll.closed && handleVote(poll.id, i)}
                      disabled={poll.closed}
                      className={cn(
                        "w-full relative overflow-hidden rounded-xl border p-3 text-left transition-all",
                        isMyVote ? "border-lime-400/50 bg-lime-400/5" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700",
                        poll.closed && "cursor-default"
                      )}
                    >
                      <div className="absolute inset-0 bg-lime-400/10 transition-all duration-500" style={{ width: `${pct}%` }} />
                      <div className="relative flex items-center justify-between">
                        <span className={cn("text-xs font-bold", isMyVote ? "text-lime-400" : "text-zinc-300")}>{opt.text}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-zinc-500">{opt.votes.length}</span>
                          <span className="text-[10px] font-black text-zinc-600">{pct}%</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-zinc-600 font-bold mt-3 text-right uppercase">{total} vote</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
