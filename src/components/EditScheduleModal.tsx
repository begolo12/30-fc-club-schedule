import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { format } from 'date-fns';

interface Schedule {
  id: string;
  title: string;
  timestamp: number;
  location: string;
  fieldCost: number;
  otherCost: number;
  totalCost: number;
  status: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule;
}

export default function EditScheduleModal({ isOpen, onClose, schedule }: Props) {
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [location, setLocation] = useState('');
  const [fieldCost, setFieldCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (schedule) {
      setTitle(schedule.title);
      const date = new Date(schedule.timestamp);
      setDateText(format(date, 'yyyy-MM-dd'));
      setTimeText(format(date, 'HH:mm'));
      setLocation(schedule.location);
      setFieldCost(schedule.fieldCost.toString());
      setOtherCost(schedule.otherCost.toString());
      setStatus(schedule.status);
    }
  }, [schedule, isOpen]);
  
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Parse date and time
    const [year, month, day] = dateText.split('-');
    const [hours, minutes] = timeText.split(':');
    const timestamp = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes)).getTime();

    const parsedFieldCost = parseInt(fieldCost) || 0;
    const parsedOtherCost = parseInt(otherCost) || 0;

    try {
      const scheduleRef = doc(db, 'schedules', schedule.id);
      await updateDoc(scheduleRef, {
        title,
        dateText: `${dateText} ${timeText}`,
        timestamp,
        location,
        fieldCost: parsedFieldCost,
        otherCost: parsedOtherCost,
        totalCost: parsedFieldCost + parsedOtherCost,
        status,
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `schedules/${schedule.id}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-zinc-100">Edit Match</h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors focus:outline-none">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="overflow-y-auto px-6 py-5">
          <form id="edit-schedule-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Title</label>
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-lime-400 focus:border-lime-400 text-sm text-zinc-100 outline-none transition-colors" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Date</label>
                <input required type="date" value={dateText} onChange={e => setDateText(e.target.value)} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-lime-400 focus:border-lime-400 text-sm text-zinc-100 outline-none transition-colors [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Time</label>
                <input required type="time" value={timeText} onChange={e => setTimeText(e.target.value)} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-lime-400 focus:border-lime-400 text-sm text-zinc-100 outline-none transition-colors [color-scheme:dark]" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Location</label>
              <input required type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-lime-400 focus:border-lime-400 text-sm text-zinc-100 outline-none transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Field Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-zinc-500 text-xs font-bold uppercase">Rp</span>
                  <input required type="number" min="0" value={fieldCost} onChange={e => setFieldCost(e.target.value)} className="w-full pl-9 pr-3 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-lime-400 focus:border-lime-400 text-sm text-zinc-100 outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Other Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-zinc-500 text-xs font-bold uppercase">Rp</span>
                  <input required type="number" min="0" value={otherCost} onChange={e => setOtherCost(e.target.value)} className="w-full pl-9 pr-3 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-lime-400 focus:border-lime-400 text-sm text-zinc-100 outline-none transition-colors" />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Status</label>
              <select required value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-lime-400 focus:border-lime-400 text-sm text-zinc-100 outline-none transition-colors">
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="bg-lime-400/10 border border-lime-400/20 text-lime-400 p-4 rounded-xl text-sm flex justify-between items-center mt-2 shadow-[inset_0_0_15px_rgba(163,230,53,0.05)]">
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Total Required</span>
              <span className="font-black italic text-lg tracking-tight">Rp {((parseInt(fieldCost) || 0) + (parseInt(otherCost) || 0)).toLocaleString('id-ID')}</span>
            </div>
          </form>
        </div>
        
        <div className="px-6 py-5 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/50">
          <button type="button" onClick={onClose} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors">Cancel</button>
          <button type="submit" form="edit-schedule-form" className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-950 bg-lime-400 hover:bg-lime-300 rounded-full transition-all shadow-[0_0_15px_rgba(163,230,53,0.3)]">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
