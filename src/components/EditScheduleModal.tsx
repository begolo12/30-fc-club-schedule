import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Clock, Trash2, User } from 'lucide-react';
import { doc, updateDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { findVenueReference, getVenueMapsUrl, getVenueSuggestions, type VenueReference } from '../lib/venueLinks';

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
  const { isAdmin, role } = useAuth();
  const canAssignResponsible = isAdmin || role === 'Ketua Club' || role === 'Sekretaris';
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    locationUrl: '',
    datetime: '',
    type: 'latihan' as 'latihan' | 'sparing',
    fieldCost: 0,
    dpCost: 0,
    feePerPlayer: 0,
    responsibleUserId: '',
    responsibleName: '',
    otherCosts: [] as OtherCost[]
  });

  const [formattedFieldCost, setFormattedFieldCost] = useState('0');
  const [formattedDpCost, setFormattedDpCost] = useState('0');
  const [formattedFeePerPlayer, setFormattedFeePerPlayer] = useState('0');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [savedVenueRefs, setSavedVenueRefs] = useState<VenueReference[]>([]);
  const locationSuggestions = getVenueSuggestions(formData.location, 5, savedVenueRefs);
  const matchedVenue = findVenueReference(formData.location, savedVenueRefs);

  useEffect(() => {
    if (schedule && isOpen) {
      const tsValue = typeof schedule.timestamp === 'number'
        ? schedule.timestamp
        : schedule.timestamp?.toMillis?.() ?? null;

      setFormData({
        title: schedule.title || '',
        location: schedule.location || '',
        locationUrl: schedule.locationUrl || '',
        datetime: tsValue ? format(tsValue, "yyyy-MM-dd'T'HH:mm") : '',
        type: schedule.type || 'latihan',
        fieldCost: schedule.fieldCost || 0,
        dpCost: schedule.dpCost || 0,
        feePerPlayer: schedule.feePerPlayer || 0,
        responsibleUserId: schedule.responsibleUserId || '',
        responsibleName: schedule.responsibleName || '',
        otherCosts: schedule.otherCosts || []
      });

      setFormattedFieldCost((schedule.fieldCost || 0).toLocaleString('id-ID'));
      setFormattedDpCost((schedule.dpCost || 0).toLocaleString('id-ID'));
      setFormattedFeePerPlayer((schedule.feePerPlayer || 0).toLocaleString('id-ID'));
    }
  }, [schedule, isOpen]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!canAssignResponsible) return;
      try {
        const snap = await getDocs(collection(db, 'users'));
        const data: { id: string; name: string }[] = [];
        snap.forEach((d) => {
          const userData = d.data() as any;
          data.push({ id: d.id, name: userData.nickname || userData.displayName || 'User' });
        });
        setUsers(data);
      } catch (err) {
        console.warn('Gagal memuat user untuk penanggung jawab', err);
      }
    };
    fetchUsers();
  }, [canAssignResponsible]);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const seen = new Set<string>();
      const refs: VenueReference[] = [];

      snapshot.forEach((d) => {
        const data = d.data() as { location?: string; locationUrl?: string };
        const location = data.location?.trim();
        if (!location) return;
        const key = location.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        refs.push({
          id: `schedule-${d.id}`,
          label: location,
          mapsUrl: getVenueMapsUrl(location, data.locationUrl),
          aliases: [location],
        });
      });

      setSavedVenueRefs(refs);
    });

    return unsubscribe;
  }, [isOpen]);

  if (!isOpen) return null;

  const parseNumber = (val: string) => parseInt(val.replace(/\./g, '')) || 0;
  const formatNumber = (num: number) => num.toLocaleString('id-ID');

  const handleCostChange = (val: string, field: 'fieldCost' | 'dpCost' | 'feePerPlayer') => {
    const numeric = parseNumber(val);
    setFormData(prev => ({ ...prev, [field]: numeric }));
    if (field === 'fieldCost') setFormattedFieldCost(formatNumber(numeric));
    else if (field === 'dpCost') setFormattedDpCost(formatNumber(numeric));
    else setFormattedFeePerPlayer(formatNumber(numeric));
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
      if (!schedule?.id) throw new Error('Schedule tidak valid');
      if (!formData.datetime) throw new Error('Waktu kick-off wajib diisi');
      const totalCost = calculateTotal();
      const timestamp = new Date(formData.datetime).getTime();
      if (Number.isNaN(timestamp)) throw new Error('Format waktu tidak valid');

      await updateDoc(doc(db, 'schedules', schedule.id), {
        title: formData.title,
        location: formData.location,
        locationUrl: formData.locationUrl || getVenueMapsUrl(formData.location, undefined, savedVenueRefs),
        timestamp,
        type: formData.type,
        fieldCost: formData.fieldCost,
        dpCost: formData.dpCost,
        feePerPlayer: formData.feePerPlayer,
        responsibleUserId: formData.responsibleUserId,
        responsibleName: formData.responsibleName,
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
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 block">Jenis Laga</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'latihan' })}
                  className={cn(
                    "py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all",
                    formData.type === 'latihan' 
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                      : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                  )}
                >
                  Latihan
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'sparing' })}
                  className={cn(
                    "py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all",
                    formData.type === 'sparing' 
                      ? "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                      : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                  )}
                >
                  Sparing
                </button>
              </div>
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Lokasi / Lapangan</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    required
                    type="text"
                    value={formData.location}
                    onChange={(e) => {
                      const location = e.target.value;
                      const matched = findVenueReference(location);
                      setFormData({
                        ...formData,
                        location,
                        locationUrl: matched?.mapsUrl || ''
                      });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-lime-400 outline-none"
                  />
                </div>
                {locationSuggestions.length > 0 && !matchedVenue && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-20 rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
                    <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                      Referensi tempat
                    </div>
                    <div className="max-h-44 overflow-y-auto">
                      {locationSuggestions.map((venue) => (
                        <button
                          key={venue.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            location: venue.label,
                            locationUrl: venue.mapsUrl
                          }))}
                          className="w-full text-left px-4 py-3 hover:bg-zinc-900 transition-colors border-b border-zinc-900 last:border-b-0"
                        >
                          <div className="text-sm font-bold text-zinc-100">{venue.label}</div>
                          <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-1">
                            Klik untuk isi lokasi + link Maps
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {matchedVenue && (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-lime-400">
                    Link Maps siap: {matchedVenue.label}
                  </p>
                )}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Iuran / Orang (Rp)</label>
                <input
                  required
                  type="text"
                  value={formattedFeePerPlayer}
                  onChange={(e) => handleCostChange(e.target.value, 'feePerPlayer')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm font-bold text-amber-300 focus:border-lime-400 outline-none"
                  placeholder="Contoh: 25000"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Biaya Tambahan</label>
                <button type="button" onClick={addOtherCost} className="text-[10px] font-black uppercase text-lime-400">+ Tambah</button>
              </div>
              {canAssignResponsible && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Penanggung Jawab</label>
                    <div className="relative">
                      <select
                        value={formData.responsibleUserId}
                        onChange={(e) => {
                          const selected = users.find(u => u.id === e.target.value);
                          setFormData(prev => ({
                            ...prev,
                            responsibleUserId: e.target.value,
                            responsibleName: selected?.name || ''
                          }));
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:border-lime-400 outline-none text-zinc-100"
                      >
                        <option value="" className="bg-zinc-900">Pilih user</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id} className="bg-zinc-900">{u.name}</option>
                        ))}
                      </select>
                      <User className="w-4 h-4 text-zinc-500 absolute right-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
              )}
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
