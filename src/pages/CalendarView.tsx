import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, Plus, Wallet, ArrowRight } from 'lucide-react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import CreateScheduleModal from '../components/CreateScheduleModal';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useAuth } from '../contexts/AuthContext';

interface Schedule {
  id: string;
  title: string;
  timestamp: number;
  location: string;
  totalCost: number;
  status: string;
}

export default function CalendarView() {
  const { isAdmin } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    const q = query(
      collection(db, 'schedules'), 
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Schedule[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Schedule);
      });
      const validSchedules = data.filter(s => s.status !== 'cancelled');
      setSchedules(validSchedules);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schedules'));

    return unsubscribe;
  }, []);

  const filteredSchedules = schedules.filter(s => {
    if (selectedDate) {
      return isSameDay(new Date(s.timestamp), selectedDate);
    }
    return s.timestamp >= startOfDay(new Date()).getTime();
  });

  const scheduledDays = schedules.map(s => new Date(s.timestamp));

  return (
    <div className="flex-1 flex flex-col h-full gap-4 md:gap-6">
      <header className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-lime-400 leading-none">Kalender Laga</h2>
          <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-1">Pilih tanggal untuk melihat jadwal</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-lime-400 hover:bg-lime-300 text-zinc-950 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Buat Laga
          </button>
        )}
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Calendar */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-4 md:p-6 flex flex-col shadow-xl items-center justify-center w-full">
            <style>{`
              .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #a3e635; --rdp-background-color: rgba(163, 230, 53, 0.1); --rdp-selected-color: #09090b; margin: 0; }
              .rdp-day { border-radius: 0.75rem; transition: all 0.2s; font-size: 0.8rem; }
              .rdp-day_selected { background-color: #a3e635; color: #09090b; font-weight: 900; }
              .my-has-schedule::after { content: ''; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 50%; background-color: #a3e635; }
              .rdp-day_selected.my-has-schedule::after { background-color: #09090b; }
              .rdp-head_cell { text-transform: uppercase; font-size: 0.6rem; font-weight: 900; color: #52525b; letter-spacing: 0.1em; }
              .rdp-caption_label { text-transform: uppercase; font-weight: 900; font-style: italic; letter-spacing: 0.05em; font-size: 1rem; }
            `}</style>
            <DayPicker 
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ hasSchedule: scheduledDays }}
              modifiersClassNames={{ hasSchedule: 'my-has-schedule' }}
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate(undefined)} 
                className="mt-4 text-[9px] uppercase font-black tracking-widest text-zinc-600 hover:text-zinc-400"
              >
                Hapus Pilihan
              </button>
            )}
          </div>
        </div>

        {/* Right Col: Schedule List */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] border-l-2 border-lime-400 pl-2">
              {selectedDate ? `Laga pada ${format(selectedDate, 'd MMM', { locale: idLocale })}` : 'Semua Laga'}
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {loading ? (
              <div className="col-span-full h-40 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-700 animate-pulse">Sinkronisasi...</div>
            ) : filteredSchedules.length === 0 ? (
              <div className="col-span-full bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-3xl p-10 text-center">
                <CalendarIcon className="w-8 h-8 text-zinc-800 mx-auto mb-2 opacity-50" />
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Tidak ada jadwal</p>
              </div>
            ) : (
              filteredSchedules.map(schedule => {
                const isPast = schedule.timestamp < Date.now();
                return (
                  <Link 
                    key={schedule.id}
                    to={`/schedule/${schedule.id}`}
                    className={`group relative flex flex-col bg-zinc-900/40 border ${isPast ? 'border-zinc-800/20 opacity-60' : 'border-zinc-800/50'} rounded-2xl p-4 transition-all hover:bg-zinc-900 shadow-md`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-black tracking-widest text-lime-400 mb-1">
                          {format(schedule.timestamp, "EEE, d MMM", { locale: idLocale })}
                        </span>
                        <h3 className="text-sm font-black italic uppercase text-zinc-100 group-hover:text-lime-400 truncate pr-6 transition-colors">
                          {schedule.title}
                        </h3>
                      </div>
                      <span className="text-[9px] font-black text-zinc-500">{format(schedule.timestamp, 'HH:mm')}</span>
                    </div>
                    
                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-zinc-800/30">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <MapPin className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase truncate max-w-[100px]">{schedule.location}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-lime-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>

      <CreateScheduleModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
}
