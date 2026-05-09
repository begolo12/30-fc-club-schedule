import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit, doc, setDoc, getDoc, getDocs, where, collectionGroup } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Wallet, TrendingUp, TrendingDown, Clock, User, Download, Settings, Save, FileText, X, Check, ArrowLeft, QrCode, Banknote } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import ConfirmDialog from '../components/ConfirmDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  userName?: string;
  timestamp: number;
  matchId?: string;
}

export default function Finance() {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [initialBalance, setInitialBalance] = useState(0);
  const [isEditingInitial, setIsEditingInitial] = useState(false);
  const [newInitial, setNewInitial] = useState('0');
  
  // PDF Export state
  const [exportMonth, setExportMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    // 1. Fetch initial balance from settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'finance'), (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.data().initialBalance || 0;
        setInitialBalance(val);
        setNewInitial(val.toString());
      }
    });

    // 2. Fetch transactions
    const q = query(collection(db, 'finance'), orderBy('timestamp', 'desc'), limit(100));
    const unsubFinance = onSnapshot(q, (snapshot) => {
      const data: Transaction[] = [];
      let txTotal = 0;
      snapshot.forEach(doc => {
        const tx = { id: doc.id, ...doc.data() } as Transaction;
        data.push(tx);
        if (tx.type === 'income') txTotal += tx.amount;
        else txTotal -= tx.amount;
      });
      setTransactions(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'finance'));

    return () => {
      unsubSettings();
      unsubFinance();
    };
  }, []);

  // Calculate real current balance
  useEffect(() => {
    const txTotal = transactions.reduce((acc, tx) => {
      return tx.type === 'income' ? acc + tx.amount : acc - tx.amount;
    }, 0);
    setBalance(txTotal + initialBalance);
  }, [transactions, initialBalance]);

  const handleUpdateInitial = async () => {
    try {
      await setDoc(doc(db, 'settings', 'finance'), {
        initialBalance: parseInt(newInitial) || 0,
        updatedAt: Date.now()
      }, { merge: true });
      setIsEditingInitial(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/finance');
    }
  };

  const exportToPDF = () => {
    const docPdf = new jsPDF();
    const dateObj = parseISO(exportMonth + '-01');
    const monthTitle = format(dateObj, 'MMMM yyyy', { locale: idLocale });
    
    // Header
    docPdf.setFontSize(20);
    docPdf.text('LAPORAN KEUANGAN 30 FC', 105, 15, { align: 'center' });
    docPdf.setFontSize(12);
    docPdf.text(`Periode: ${monthTitle}`, 105, 22, { align: 'center' });

    // Filter transactions for that month
    const start = startOfMonth(dateObj).getTime();
    const end = endOfMonth(dateObj).getTime();
    const filtered = transactions.filter(t => t.timestamp >= start && t.timestamp <= end).reverse();

    const tableData = filtered.map(t => [
      format(t.timestamp, 'dd/MM/yyyy'),
      t.description,
      t.userName || '-',
      t.type === 'income' ? `Rp ${t.amount.toLocaleString('id-ID')}` : '-',
      t.type === 'expense' ? `Rp ${t.amount.toLocaleString('id-ID')}` : '-'
    ]);

    const totalIncome = filtered.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const totalExpense = filtered.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    const endBalance = initialBalance + transactions.filter(t => t.timestamp <= end).reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);

    autoTable(docPdf, {
      startY: 30,
      head: [['Tanggal', 'Keterangan', 'Nama', 'Masuk', 'Keluar']],
      body: tableData,
      foot: [
        ['', 'TOTAL PERIODE', '', `Rp ${totalIncome.toLocaleString('id-ID')}`, `Rp ${totalExpense.toLocaleString('id-ID')}`],
        ['', 'SALDO AKHIR PERIODE', '', '', `Rp ${endBalance.toLocaleString('id-ID')}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [163, 230, 53], textColor: [0, 0, 0] },
      footStyles: { fillColor: [244, 244, 245], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    docPdf.save(`Laporan_Keuangan_30FC_${exportMonth}.pdf`);
  };

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [unpaidMatches, setUnpaidMatches] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [showQrisImage, setShowQrisImage] = useState(false);
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [financeTab, setFinanceTab] = useState<'kas' | 'piutang' | 'riwayat'>('kas');
  const [myPayments, setMyPayments] = useState<{matchId: string; matchTitle: string; status: string; timestamp: number}[]>([]);
  const [piutang, setPiutang] = useState<{name: string; count: number; total: number}[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'club_info'), (snap) => {
      if (snap.exists()) setQrisUrl(snap.data().qrisUrl || null);
    });
    return unsub;
  }, []);

  // Fetch user's payment history across all matches
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'schedules'), orderBy('timestamp', 'desc'), limit(20));
    const unsub = onSnapshot(q, async (snapshot) => {
      const payments: {matchId: string; matchTitle: string; status: string; timestamp: number}[] = [];
      for (const s of snapshot.docs) {
        const pDoc = await getDoc(doc(db, 'schedules', s.id, 'participants', user.uid));
        if (pDoc.exists()) {
          payments.push({
            matchId: s.id,
            matchTitle: s.data().title,
            status: pDoc.data().paymentStatus || 'unpaid',
            timestamp: s.data().timestamp
          });
        }
      }
      setMyPayments(payments);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'schedules'), where('status', '==', 'upcoming'));
    const unsub = onSnapshot(q, (snapshot) => {
      const matches: any[] = [];
      snapshot.forEach(async (docSnap) => {
        const pDoc = await getDoc(doc(db, 'schedules', docSnap.id, 'participants', user.uid));
        if (pDoc.exists() && pDoc.data().paymentStatus === 'unpaid') {
          matches.push({ id: docSnap.id, ...docSnap.data() });
          setUnpaidMatches([...matches]);
        }
      });
    });
    return unsub;
  }, [user]);

  // Admin: Fetch all pending approvals
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collectionGroup(db, 'participants'), where('paymentStatus', '==', 'pending_qris'));
    const qCash = query(collectionGroup(db, 'participants'), where('paymentStatus', '==', 'pending_cash'));

    const unsubQr = onSnapshot(q, async (snapshot) => {
      const pending: any[] = [];
      for (const docSnap of snapshot.docs) {
        const matchId = docSnap.ref.parent.parent?.id;
        if (matchId) {
          const matchSnap = await getDoc(doc(db, 'schedules', matchId));
          pending.push({
            id: docSnap.id,
            matchId,
            matchTitle: matchSnap.data()?.title || 'Laga',
            ...docSnap.data()
          });
        }
      }
      setPendingApprovals((prev) => {
        const others = prev.filter(p => p.paymentStatus !== 'pending_qris');
        return [...others, ...pending];
      });
    }, (error) => console.error('Index required (QRIS):', error));

    const unsubCash = onSnapshot(qCash, async (snapshot) => {
      const pending: any[] = [];
      for (const docSnap of snapshot.docs) {
        const matchId = docSnap.ref.parent.parent?.id;
        if (matchId) {
          const matchSnap = await getDoc(doc(db, 'schedules', matchId));
          pending.push({
            id: docSnap.id,
            matchId,
            matchTitle: matchSnap.data()?.title || 'Laga',
            ...docSnap.data()
          });
        }
      }
      setPendingApprovals((prev) => {
        const others = prev.filter(p => p.paymentStatus !== 'pending_cash');
        return [...others, ...pending];
      });
    }, (error) => console.error('Index required (Cash):', error));

    return () => {
      unsubQr();
      unsubCash();
    };
  }, [isAdmin]);

  // Admin: Fetch outstanding debts (piutang)
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'schedules'), orderBy('timestamp', 'desc'), limit(20));
    const unsub = onSnapshot(q, async (snapshot) => {
      const debts: Record<string, {name: string; count: number}> = {};
      for (const s of snapshot.docs) {
        const partsSnapshot = await getDocs(collection(db, 'schedules', s.id, 'participants'));
        partsSnapshot.forEach(p => {
          const data = p.data();
          if (data.paymentStatus === 'unpaid') {
            const key = data.userId || p.id;
            if (!debts[key]) debts[key] = { name: data.name || data.nickname || 'Unknown', count: 0 };
            debts[key].count++;
          }
        });
      }
      setPiutang(Object.values(debts).filter(d => d.count > 0).map(d => ({ ...d, total: d.count * 25000 })).sort((a, b) => b.count - a.count));
    });
    return unsub;
  }, [isAdmin]);

  const handlePay = async (matchId: string, method: 'pending_qris' | 'pending_cash') => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'schedules', matchId, 'participants', user.uid), {
        paymentStatus: method
      }, { merge: true });
      setIsPaymentModalOpen(false);
      setSelectedMatch(null);
      setShowQrisImage(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'payment');
    }
  };

  const handleApprove = async (p: any) => {
    if (!isAdmin) return;
    setConfirmDialog({
      title: 'Konfirmasi Pembayaran',
      message: `Konfirmasi pembayaran ${p.name} sudah masuk?`,
      onConfirm: () => { setConfirmDialog(null); doApprove(p); }
    });
  };

  const doApprove = async (p: any) => {
    try {
      const pDoc = await getDoc(doc(db, 'schedules', p.matchId, 'participants', p.userId));
      const currentStatus = pDoc.data()?.paymentStatus;
      if (currentStatus === 'paid_qris' || currentStatus === 'paid_cash') return;

      const finalStatus = p.paymentStatus === 'pending_qris' ? 'paid_qris' : 'paid_cash';
      await setDoc(doc(db, 'schedules', p.matchId, 'participants', p.userId), {
        paymentStatus: finalStatus
      }, { merge: true });

      await setDoc(doc(collection(db, 'finance')), {
        amount: 25000,
        type: 'income',
        description: `Iuran ${finalStatus === 'paid_qris' ? 'QRIS' : 'Tunai'}: ${p.matchTitle}`,
        userName: p.name,
        userId: p.userId,
        matchId: p.matchId,
        timestamp: Date.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'approval');
    }
  };

  const handleReject = async (p: any) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'schedules', p.matchId, 'participants', p.userId), {
        paymentStatus: 'unpaid'
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'rejection');
    }
  };

  const handleAddExpense = async () => {
    if (!isAdmin || !expenseDesc.trim() || !expenseAmount) return;
    try {
      await setDoc(doc(collection(db, 'finance')), {
        amount: parseInt(expenseAmount),
        type: 'expense',
        description: expenseDesc.trim(),
        timestamp: Date.now()
      });
      setExpenseDesc('');
      setExpenseAmount('');
      setShowExpenseForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'expense');
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="px-1 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-lime-400 leading-none">Keuangan Klub</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Arus Kas & Laporan Bulanan</p>
          </div>
          {!isAdmin && (
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="bg-lime-400 text-zinc-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-lime-400/20"
            >
              Bayar Iuran
            </button>
          )}
        </div>
        
        {isAdmin && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input 
                type="month" 
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-lime-400/50 [color-scheme:dark]"
              />
              <button 
                onClick={exportToPDF}
                className="flex items-center gap-2 bg-lime-400 text-zinc-950 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
            <button 
              onClick={() => setShowExpenseForm(!showExpenseForm)}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500/20"
            >
              <TrendingDown className="w-3.5 h-3.5" /> {showExpenseForm ? 'Tutup Form' : 'Tambah Pengeluaran'}
            </button>
          </div>
        )}
      </header>

      {/* Tab Bar */}
      <div className="flex bg-zinc-900 border border-zinc-800 rounded-2xl p-1 mx-1">
        <button onClick={() => setFinanceTab('kas')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${financeTab === 'kas' ? 'bg-lime-400 text-zinc-950 shadow-lg' : 'text-zinc-500'}`}>Kas</button>
        <button onClick={() => setFinanceTab('piutang')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${financeTab === 'piutang' ? 'bg-lime-400 text-zinc-950 shadow-lg' : 'text-zinc-500'}`}>Piutang</button>
        <button onClick={() => setFinanceTab('riwayat')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${financeTab === 'riwayat' ? 'bg-lime-400 text-zinc-950 shadow-lg' : 'text-zinc-500'}`}>Riwayat</button>
      </div>

      {financeTab === 'kas' && (<>
      {/* Compact Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform">
            <Wallet className="w-20 h-20 text-lime-400" />
          </div>
          <div className="relative z-10">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Total Saldo Kas</span>
            <h3 className="text-3xl md:text-5xl font-black text-zinc-100 mt-1 tracking-tighter italic">
              Rp {balance.toLocaleString('id-ID')}
            </h3>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Saldo Awal</span>
            {isAdmin && (
              <button 
                onClick={() => setIsEditingInitial(!isEditingInitial)}
                className="text-zinc-600 hover:text-lime-400"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {isEditingInitial ? (
            <div className="flex gap-2">
              <input 
                type="number"
                value={newInitial}
                onChange={(e) => setNewInitial(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-bold outline-none"
              />
              <button onClick={handleUpdateInitial} className="bg-lime-400 text-zinc-950 p-2 rounded-lg"><Save className="w-4 h-4" /></button>
            </div>
          ) : (
            <h4 className="text-xl font-black italic text-zinc-400">Rp {initialBalance.toLocaleString('id-ID')}</h4>
          )}
        </div>
      </div>

      {/* Expense Form */}
      {isAdmin && showExpenseForm && (
        <div className="bg-zinc-900 border border-red-500/20 rounded-3xl p-5 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-4">Tambah Pengeluaran</h4>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Deskripsi (misal: Beli bola, Air minum)"
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 font-bold outline-none focus:border-red-400/50 placeholder:text-zinc-700"
            />
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-zinc-600 font-black">Rp</span>
                <input
                  type="number"
                  placeholder="0"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-zinc-100 font-bold outline-none focus:border-red-400/50 placeholder:text-zinc-700"
                />
              </div>
              <button
                onClick={handleAddExpense}
                disabled={!expenseDesc.trim() || !expenseAmount}
                className="bg-red-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-red-400 transition-all"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Pending Approvals */}
      {isAdmin && pendingApprovals.length > 0 && (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Persetujuan Iuran (Pending)</h4>
            <span className="text-[8px] font-black text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-400/20 uppercase tracking-widest">
              {pendingApprovals.length} PERLU APPROVAL
            </span>
          </div>
          <div className="space-y-2">
            {pendingApprovals.map(p => (
              <div key={`${p.matchId}-${p.userId}`} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex flex-col gap-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500">
                      {p.paymentStatus === 'pending_qris' ? <QrCode className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-zinc-100 uppercase tracking-tight line-clamp-1">{p.name}</h5>
                      <p className="text-[8px] text-zinc-500 font-bold uppercase mt-0.5">{p.matchTitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black italic text-zinc-100">Rp 25.000</span>
                    <p className="text-[7px] text-orange-400 font-black uppercase tracking-widest mt-0.5">{p.paymentStatus === 'pending_qris' ? 'VIA QRIS' : 'VIA TUNAI'}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button 
                    onClick={() => handleApprove(p)}
                    className="flex-1 bg-lime-400 text-zinc-950 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-lime-300 transition-all"
                  >
                    Sudah Bayar ✓
                  </button>
                  <button 
                    onClick={() => handleReject(p)}
                    className="flex-1 bg-zinc-800 text-zinc-400 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center hover:bg-zinc-700 transition-all"
                  >
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Riwayat Transaksi</h4>
          <span className="text-[8px] font-black text-zinc-700 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 uppercase tracking-widest">
            {transactions.length} DATA
          </span>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-700 animate-pulse">Sinkronisasi...</div>
          ) : transactions.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-3xl p-10 text-center">
              <Clock className="w-8 h-8 text-zinc-800 mx-auto mb-2 opacity-50" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Belum ada data</p>
            </div>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className="bg-zinc-900/40 border border-zinc-800/30 rounded-2xl p-4 flex items-center justify-between group transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${tx.type === 'income' ? 'bg-lime-400/5 text-lime-400 border-lime-400/20' : 'bg-red-400/5 text-red-400 border-red-400/20'}`}>
                    {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-zinc-200 uppercase tracking-tight line-clamp-1">{tx.description}</h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      {tx.userName && <span className="text-[8px] text-zinc-500 font-bold uppercase">{tx.userName}</span>}
                      <span className="text-[8px] text-zinc-600 font-medium uppercase">{format(tx.timestamp, 'd MMM, HH:mm')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-black italic tracking-tighter ${tx.type === 'income' ? 'text-lime-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </>)}

      {/* Piutang Tab */}
      {financeTab === 'piutang' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Piutang Iuran</h4>
            <span className="text-[8px] font-black text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20 uppercase tracking-widest">
              Total: Rp {piutang.reduce((a, p) => a + p.total, 0).toLocaleString('id-ID')}
            </span>
          </div>
          {piutang.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-3xl p-10 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Tidak ada piutang 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {piutang.map(p => (
                <div key={p.name} className="bg-zinc-900/40 border border-zinc-800/30 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center justify-center text-red-400 font-black text-[10px]">
                      {p.count}x
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-zinc-200 uppercase tracking-tight">{p.name}</h5>
                      <span className="text-[8px] text-zinc-600 font-bold uppercase">{p.count} match belum bayar</span>
                    </div>
                  </div>
                  <span className="text-xs font-black italic text-red-400">Rp {p.total.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Riwayat Tab */}
      {financeTab === 'riwayat' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Riwayat Bayar Saya</h4>
            <span className="text-[8px] font-black text-zinc-700 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 uppercase tracking-widest">
              {myPayments.filter(p => p.status === 'paid_qris' || p.status === 'paid_cash').length}/{myPayments.length} Lunas
            </span>
          </div>
          {myPayments.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-3xl p-10 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Belum ada riwayat</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myPayments.map(p => (
                <div key={p.matchId} className="bg-zinc-900/40 border border-zinc-800/30 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <h5 className="text-[11px] font-black text-zinc-200 uppercase tracking-tight line-clamp-1">{p.matchTitle}</h5>
                    <span className="text-[8px] text-zinc-600 font-bold uppercase">{format(p.timestamp, 'd MMM yyyy')}</span>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-lg border ${
                    p.status === 'paid_qris' || p.status === 'paid_cash' 
                      ? 'text-lime-400 bg-lime-400/10 border-lime-400/20' 
                      : p.status === 'pending_qris' || p.status === 'pending_cash'
                      ? 'text-orange-400 bg-orange-400/10 border-orange-400/20'
                      : 'text-red-400 bg-red-400/10 border-red-400/20'
                  }`}>
                    {p.status === 'paid_qris' || p.status === 'paid_cash' ? 'Lunas' : p.status.includes('pending') ? 'Pending' : 'Belum Bayar'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" onClick={() => setIsPaymentModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-lime-400">Bayar Iuran</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              {selectedMatch ? (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => setSelectedMatch(null)}
                      className="text-[8px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-1 hover:text-zinc-400"
                    >
                      <ArrowLeft className="w-3 h-3" /> Kembali ke Daftar
                    </button>
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                      <h4 className="text-sm font-black italic uppercase tracking-tighter text-lime-400">{selectedMatch.title}</h4>
                      <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{selectedMatch.location}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Pilih Metode Pembayaran</p>
                    
                    {showQrisImage ? (
                      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
                        <button 
                          onClick={() => setShowQrisImage(false)}
                          className="text-[8px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-1 hover:text-zinc-400 self-start"
                        >
                          <ArrowLeft className="w-3 h-3" /> Kembali
                        </button>
                        {qrisUrl ? (
                          <img src={qrisUrl} alt="QRIS" className="w-full max-w-[240px] rounded-2xl border border-zinc-800" />
                        ) : (
                          <p className="text-[10px] text-zinc-500 font-bold py-8">QRIS belum diupload oleh admin</p>
                        )}
                        <button 
                          onClick={() => { handlePay(selectedMatch.id, 'pending_qris'); setShowQrisImage(false); }}
                          className="w-full bg-lime-400 text-zinc-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-lime-300 transition-all"
                        >
                          Sudah Bayar
                        </button>
                      </div>
                    ) : (
                    <>
                    <button 
                      onClick={() => setShowQrisImage(true)}
                      className="w-full bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4 hover:border-lime-400 group transition-all"
                    >
                      <div className="w-12 h-12 bg-lime-400/10 rounded-xl flex items-center justify-center text-lime-400 group-hover:scale-110 transition-transform">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-black italic uppercase tracking-tighter text-zinc-100 block">QRIS (Otomatis)</span>
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Verifikasi oleh Admin</span>
                      </div>
                    </button>

                    <button 
                      onClick={() => handlePay(selectedMatch.id, 'pending_cash')}
                      className="w-full bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center gap-4 hover:border-lime-400 group transition-all"
                    >
                      <div className="w-12 h-12 bg-orange-400/10 rounded-xl flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                        <Banknote className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-black italic uppercase tracking-tighter text-zinc-100 block">Bayar Tunai / Cash</span>
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Serahkan ke Bendahara</span>
                      </div>
                    </button>
                    </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Pilih Jadwal Pertandingan</p>
                  {unpaidMatches.length === 0 ? (
                    <div className="text-center py-8 opacity-40">
                      <p className="text-[10px] font-bold uppercase tracking-widest">Tidak ada jadwal yang belum dibayar</p>
                    </div>
                  ) : (
                    unpaidMatches.map(match => (
                      <button 
                        key={match.id}
                        onClick={() => setSelectedMatch(match)}
                        className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-2 hover:border-lime-400/50 transition-all text-left"
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-black italic uppercase tracking-tighter text-zinc-100">{match.title}</h4>
                          <span className="text-[10px] font-black text-lime-400">Rp 25.000</span>
                        </div>
                        <div className="flex items-center gap-2 text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                          <span>{format(match.timestamp, 'EEEE, d MMM', { locale: idLocale })}</span>
                          <span>•</span>
                          <span>{match.location}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
