import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { Plus, Trash2, Save, Users, ClipboardList, Edit2, X, CheckCircle2, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  condition: 'good' | 'needs_repair' | 'broken';
  assignedTo?: string;
  assignedUserId?: string;
  notes?: string;
  updatedAt?: number;
  createdAt?: number;
}

export default function Inventory() {
  const { isAdmin, role } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', quantity: 1, condition: 'good' as InventoryItem['condition'], assignedTo: '', assignedUserId: '', notes: '' });
  const [toast, setToast] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  const canEdit = isAdmin || role === 'Ketua Club' || role === 'Kasir' || role === 'Sekretaris';

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const data: InventoryItem[] = [];
      snapshot.forEach((d) => data.push({ id: d.id, ...d.data() } as InventoryItem));
      setItems(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inventory'));
    return unsub;
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const data = snapshot.docs.map((userDoc) => {
          const userData = userDoc.data() as { nickname?: string; displayName?: string };
          return {
            id: userDoc.id,
            name: userData.nickname || userData.displayName || 'Pemain'
          };
        });
        setUsers(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    };

    fetchUsers();
  }, []);

  const resetForm = () => {
    setForm({ name: '', quantity: 1, condition: 'good', assignedTo: '', assignedUserId: '', notes: '' });
    setEditId(null);
    setIsAdding(false);
  };

  const saveItem = async () => {
    if (!form.name.trim()) return;
    try {
      if (editId) {
        await updateDoc(doc(db, 'inventory', editId), {
          ...form,
          quantity: Number(form.quantity) || 0,
          updatedAt: Date.now(),
        });
        setToast('Item diperbarui');
      } else {
        await addDoc(collection(db, 'inventory'), {
          ...form,
          quantity: Number(form.quantity) || 0,
          updatedAt: Date.now(),
          createdAt: Date.now(),
        });
        setToast('Item ditambahkan');
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inventory');
    }
  };

  const removeItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'inventory', id));
      setToast('Item dihapus');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'inventory');
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      quantity: item.quantity,
      condition: item.condition,
      assignedTo: item.assignedTo || '',
      assignedUserId: item.assignedUserId || '',
      notes: item.notes || ''
    });
    setIsAdding(true);
  };

  const conditionBadge = (condition: InventoryItem['condition']) => {
    switch (condition) {
      case 'good': return 'bg-lime-400/20 text-lime-300 border-lime-400/30';
      case 'needs_repair': return 'bg-amber-400/10 text-amber-300 border-amber-400/30';
      case 'broken': return 'bg-red-500/10 text-red-300 border-red-500/30';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-24 md:pb-12">
      <header className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-lime-400">Inventaris Klub</h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">Catat, awasi, dan assign tanggung jawab</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-lime-400 text-zinc-950 font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-[1.01] transition"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Batal' : 'Tambah'}
          </button>
        )}
      </header>

      {isAdding && canEdit && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nama Item</label>
                <input
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm focus:border-lime-400 outline-none"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Bola, rompi, cone"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Jumlah</label>
              <input
                type="number"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm focus:border-lime-400 outline-none"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Kondisi</label>
              <select
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm focus:border-lime-400 outline-none"
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value as InventoryItem['condition'] })}
              >
                <option value="good">Baik</option>
                <option value="needs_repair">Perlu Perbaikan</option>
                <option value="broken">Rusak</option>
              </select>
            </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Penanggung Jawab</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm focus:border-lime-400 outline-none"
                    value={form.assignedUserId}
                    onChange={(e) => {
                      const selected = users.find((userItem) => userItem.id === e.target.value);
                      setForm({
                        ...form,
                        assignedUserId: e.target.value,
                        assignedTo: selected?.name || ''
                      });
                    }}
                  >
                    <option value="">Pilih user</option>
                    {users.map((userItem) => (
                      <option key={userItem.id} value={userItem.id}>{userItem.name}</option>
                    ))}
                  </select>
                  <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                </div>
              </div>
            </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Catatan</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm focus:border-lime-400 outline-none"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Kondisi detail, kebutuhan penggantian, dsb."
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={resetForm}
              className="px-4 py-3 rounded-xl border border-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:border-zinc-700"
            >
              Batal
            </button>
            <button
              onClick={saveItem}
              className="px-4 py-3 rounded-xl bg-lime-400 text-zinc-950 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:scale-[1.01] transition"
            >
              <Save className="w-4 h-4" /> Simpan
            </button>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Daftar Inventaris</h3>
          <span className="text-[10px] text-zinc-600 font-bold uppercase">{items.length} item</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-lime-400/10 text-lime-300 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-lg text-zinc-100 truncate">{item.name}</h4>
                    <span className={cn("px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest", conditionBadge(item.condition))}>
                      {item.condition === 'good' ? 'Baik' : item.condition === 'needs_repair' ? 'Perlu Perbaikan' : 'Rusak'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{item.quantity} unit</p>
                  {item.assignedTo && (
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3" /> {item.assignedTo}
                    </p>
                  )}
                  {item.notes && <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{item.notes}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(item)} className="p-2 rounded-xl bg-zinc-800 text-zinc-200 hover:text-lime-300 transition" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="p-2 rounded-xl bg-zinc-800 text-red-300 hover:text-red-200 transition" title="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                <span>Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('id-ID') : '-'}</span>
                {item.createdAt && <span>Added: {new Date(item.createdAt).toLocaleDateString('id-ID')}</span>}
              </div>
            </div>
          ))}
        </div>

        {!loading && items.length === 0 && (
          <div className="text-center py-10 text-zinc-600 text-sm font-bold uppercase tracking-[0.2em]">Belum ada inventaris</div>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest text-lime-300 shadow-xl animate-in fade-in">
          <CheckCircle2 className="w-3 h-3 inline mr-2" /> {toast}
        </div>
      )}
    </div>
  );
}
