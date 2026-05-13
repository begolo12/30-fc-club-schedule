import React, { useEffect, useState, type ButtonHTMLAttributes } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, Plus, ArrowRight } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import CreateScheduleModal from '../components/CreateScheduleModal';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { DayPicker } from 'react-day-picker';
import type { CalendarDay, Modifiers } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface Schedule {
  id: string;
  title: string;
  timestamp: number;
  location: string;
  type?: 'latihan' | 'sparing';
  status: string;
}

export default function CalendarView() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (searchParams.get('view') === 'list') {
      setSelectedDate(undefined);
    }
  }, [searchParams]);

  useEffect(() => {
    const q = query(collection(db, 'schedules'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Schedule[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Schedule));
      setSchedules(data.filter(s => s.status !== 'cancelled'));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schedules'));
    return unsubscribe;
  }, []);

  const filteredSchedules = schedules.filter(s => {
    if (selectedDate) {
      const sDate = startOfDay(new Date(s.timestamp));
      const pDate = startOfDay(selectedDate);
      return sDate.getTime() === pDate.getTime();
    }
    return s.timestamp >= startOfDay(new Date()).getTime();
  });

  // Helper to get schedules for a specific date
  const getSchedulesForDate = (date: Date) => {
    return schedules.filter(s => {
      const sDate = new Date(s.timestamp);
      return sDate.getDate() === date.getDate() &&
             sDate.getMonth() === date.getMonth() &&
             sDate.getFullYear() === date.getFullYear();
    });
  };

  // Custom DayButton for react-day-picker v9
  const CustomDayButton = (props: {
    day: CalendarDay;
    modifiers: Modifiers;
  } & ButtonHTMLAttributes<HTMLButtonElement>) => {
    const { day, modifiers, children, ...buttonProps } = props;
    const date = day.date;
    const daySchedules = getSchedulesForDate(date);
    const count = daySchedules.length;
    const hasSparing = daySchedules.some(s => s.type === 'sparing');

    return (
      <button {...buttonProps}>
        <span>{children}</span>
        {count > 0 && (
          <span
            className="flex items-center gap-px justify-center"
            style={{
              position: 'absolute',
              bottom: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '1px',
              background: '#09090b',
              padding: '0 3px',
              borderRadius: '9999px',
              border: '1px solid #27272a',
              zIndex: 10,
            }}
          >
            <span
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: hasSparing ? '#ef4444' : '#10b981',
              }}
            />
            <span
              style={{
                fontSize: '7px',
                fontWeight: 900,
                lineHeight: 1,
                color: hasSparing ? '#f87171' : '#34d399',
              }}
            >
              {count}
            </span>
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full gap-4 md:gap-6">
      <header className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-lime-400 leading-none">Kalender Laga</h2>
          <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-1">Titik <span className="text-emerald-400">Hijau (Latihan)</span> & <span className="text-red-400">Merah (Sparing)</span></p>
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
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 flex flex-col shadow-2xl items-center justify-center w-full relative">
            <style>{`
              .rdp { --rdp-cell-size: 44px; --rdp-accent-color: #a3e635; --rdp-background-color: rgba(163, 230, 53, 0.1); --rdp-selected-color: #09090b; margin: 0; }
              .rdp-day { position: relative; overflow: visible !important; }
              .rdp-day button { position: relative; overflow: visible !important; border-radius: 1rem; transition: all 0.2s; font-size: 0.9rem; font-weight: 700; }
              .rdp-day_selected button, .rdp-selected button, [data-selected] button { background-color: #a3e635 !important; color: #09090b !important; font-weight: 900; }
              .rdp-head_cell { text-transform: uppercase; font-size: 0.65rem; font-weight: 900; color: #52525b; letter-spacing: 0.1em; padding-bottom: 1rem; }
              .rdp-caption_label { text-transform: uppercase; font-weight: 900; font-style: italic; letter-spacing: 0.05em; font-size: 1.1rem; color: #f4f4f5; }
              .rdp-nav_button { color: #a3e635; }
              td { overflow: visible !important; }
              td > div { overflow: visible !important; }
            `}</style>
            <DayPicker 
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              components={{
                DayButton: CustomDayButton
              }}
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate(undefined)} 
                className="mt-6 text-[9px] uppercase font-black tracking-[0.2em] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Hapus Pilihan
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] border-l-2 border-lime-400 pl-3">
              {selectedDate ? `Jadwal ${format(selectedDate, 'd MMMM yyyy', { locale: idLocale })}` : 'Daftar Semua Laga'}
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full h-40 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-700 animate-pulse italic">Sinkronisasi Data...</div>
            ) : filteredSchedules.length === 0 ? (
              <div className="col-span-full bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-[2rem] p-12 text-center">
                <CalendarIcon className="w-10 h-10 text-zinc-800 mx-auto mb-4 opacity-50" />
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">Tidak ada jadwal pertandingan</p>
              </div>
            ) : (
              filteredSchedules.map(schedule => {
                const isPast = schedule.timestamp < Date.now();
                const isSparing = schedule.type === 'sparing';
                return (
                  <Link 
                    key={schedule.id}
                    to={`/schedule/${schedule.id}`}
                    className={cn(
                      "group relative flex flex-col bg-zinc-900/60 border rounded-3xl p-5 transition-all hover:bg-zinc-900 shadow-xl",
                      isPast ? "border-zinc-800/20 opacity-50" : isSparing ? "border-red-500/20 hover:border-red-500/40" : "border-emerald-500/20 hover:border-emerald-500/40"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest italic",
                            isSparing ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                          )}>
                            {isSparing ? 'Sparing' : 'Latihan'}
                          </span>
                          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
                            {format(schedule.timestamp, "EEE, d MMM", { locale: idLocale })}
                          </span>
                        </div>
                        <h3 className="text-base font-black italic uppercase text-zinc-100 group-hover:text-lime-400 transition-colors line-clamp-1">
                          {schedule.title}
                        </h3>
                      </div>
                      <div className="bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                        <span className="text-[10px] font-black text-zinc-400">{format(schedule.timestamp, 'HH:mm')}</span>
                      </div>
                    </div>
                    
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-800/30">
                      <div className="flex items-center gap-2.5 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                        <MapPin className={cn("w-3.5 h-3.5", isSparing ? "text-red-400" : "text-emerald-400")} />
                        <span className="text-[10px] font-bold uppercase truncate max-w-[140px] tracking-tight">{schedule.location}</span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:bg-lime-400 group-hover:text-zinc-950 transition-all">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
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
