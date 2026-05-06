import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit, doc, setDoc, getDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Wallet, TrendingUp, TrendingDown, Clock, User, Download, Settings, Save, FileText } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { useAuth } from '../contexts/AuthContext';
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

    autoTable(docPdf, {
      startY: 30,
      head: [['Tanggal', 'Keterangan', 'Nama', 'Masuk', 'Keluar']],
      body: tableData,
      foot: [['', 'TOTAL', '', `Rp ${totalIncome.toLocaleString('id-ID')}`, `Rp ${totalExpense.toLocaleString('id-ID')}`]],
      theme: 'grid',
      headStyles: { fillColor: [163, 230, 53], textColor: [0, 0, 0] },
      footStyles: { fillColor: [244, 244, 245], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    docPdf.save(`Laporan_Keuangan_30FC_${exportMonth}.pdf`);
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="px-1">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-lime-400 leading-none">Keuangan Klub</h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Arus Kas & Laporan Bulanan</p>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="month" 
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-lime-400/50 [color-scheme:dark]"
          />
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-lime-400 text-zinc-950 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Cetak PDF
          </button>
        </div>
      </header>

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
    </div>
  );
}
