import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Clock, Trash2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { format } from 'date-fns';

interface OtherCost {
  description: string;
  amount: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schedule: any;
}

export default function EditScheduleModal({ isOpen, onClose, schedule }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    datetime: '',
    fieldCost: 0,
    dpCost: 0,
    otherCosts: [] as OtherCost[]
  });

  const [formattedFieldCost, setFormattedFieldCost] = useState('0');
  const [formattedDpCost, setFormattedDpCost] = useState('0');

  useEffect(() => {
    if (schedule && isOpen) {
      setFormData({
        title: schedule.title || '',
        location: schedule.location || '',
        datetime: schedule.timestamp ? format(schedule.timestamp, "yyyy-MM-dd'T'HH:mm") : '',
        fieldCost: schedule.fieldCost || 0,
        dpCost: schedule.dpCost || 0,
        otherCosts: schedule.otherCosts || []
      });
      setFormattedFieldCost((schedule.fieldCost || 0).toLocaleString('id-ID'));
      setFormattedDpCost((schedule.dpCost || 0).toLocaleString('id-ID'));
    }
  }, [schedule, isOpen]);

  if (!isOpen) return null;

  const parseNumber = (val: string) => parseInt(val.replace(/\./g, '')) || 0;
  const formatNumber = (num: number) => num.toLocaleString('id-ID');

  const handleCostChange = (val: string, field: 'fieldCost' | 'dpCost') => {
    const numeric = parseNumber(val);
    setFormData(prev => ({ ...prev, [field]: numeric }));
    if (field === 'fieldCost') setFormattedFieldCost(formatNumber(numeric));
    else setFormattedDpCost(formatNumber(numeric));
  };

  const addOtherCost = () => {
    setFormData(prev => ({
      ...prev,
      otherCosts: [...prev.otherCosts, { description: '', amount: 0 }]
    }));
  };

  const updateOtherCost = (index: number, field: keyof OtherCost, value: string) => {
    const newCosts = [...formData.otherCosts];
    if (field === 'amount') {
      newCosts[index].amount = parseNumber(value);
    } else {
      newCosts[index].description = value;
    }
    setFormData(prev => ({ ...prev, otherCosts: newCosts }));
  };

  const removeOtherCost = (index: number) => {
    setFormData(prev => ({
      ...prev,
      otherCosts: prev.otherCosts.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    const others = formData.otherCosts.reduce((acc, curr) => acc + curr.amount, 0);
    return formData.fieldCost + others;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalCost = calculateTotal();
      const timestamp = new Date(formData.datetime).getTime();

      await updateDoc(doc(db, 'schedules', schedule.id), {
        title: formData.title,
        location: formData.location,
        timestamp,
        fieldCost: formData.fieldCost,
        dpCost: formData.dpCost,
        otherCosts: formData.otherCosts,
        totalCost
      });

      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'schedules');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-xl font-black italic uppercase tracking-tighter text-lime-400">Edit Laga</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Judul Pertandingan</label>
              <input
                required
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:border-lime-400 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Lokasi / Lapangan</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    required
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-lime-400 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Waktu Kick-off</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    required
                    type="datetime-local"
                    value={formData.datetime}
                    onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-lime-400 outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Sewa Lapangan (Rp)</label>
                <input
                  required
                  type="text"
                  value={formattedFieldCost}
                  onChange={(e) => handleCostChange(e.target.value, 'fieldCost')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm font-bold text-zinc-100 focus:border-lime-400 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">DP Dibayar (Rp)</label>
                <input
                  required
                  type="text"
                  value={formattedDpCost}
                  onChange={(e) => handleCostChange(e.target.value, 'dpCost')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm font-bold text-lime-400 focus:border-lime-400 outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Biaya Tambahan</label>
                <button type="button" onClick={addOtherCost} className="text-[10px] font-black uppercase text-lime-400">+ Tambah</button>
              </div>
              {formData.otherCosts.map((cost, index) => (
                <div key={index} className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                  <input
                    type="text"
                    value={cost.description}
                    onChange={(e) => updateOtherCost(index, 'description', e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs focus:border-lime-400 outline-none"
                    placeholder="Uraian"
                  />
                  <input
                    type="text"
                    value={cost.amount.toLocaleString('id-ID')}
                    onChange={(e) => updateOtherCost(index, 'amount', e.target.value)}
                    className="w-32 bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs font-bold focus:border-lime-400 outline-none"
                  />
                  <button type="button" onClick={() => removeOtherCost(index)} className="p-2 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-zinc-950 py-4 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all"
          >
            {loading ? 'Memproses...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </div>
  );
}
