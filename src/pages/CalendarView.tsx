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
      <header className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-lime-400">Match Calendar</h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Select date to view matches</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-lime-400 hover:bg-lime-300 text-zinc-950 px-4 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(163,230,53,0.3)] flex items-center gap-2 transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            New Match
          </button>
        )}
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left Col: Calendar */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 flex flex-col shadow-2xl items-center justify-center w-full sticky top-8">
            <style>{`
              .rdp { --rdp-cell-size: 48px; --rdp-accent-color: #a3e635; --rdp-background-color: rgba(163, 230, 53, 0.1); --rdp-accent-color-dark: #84cc16; --rdp-background-color-dark: rgba(163, 230, 53, 0.1); --rdp-outline: 2px solid var(--rdp-accent-color); --rdp-outline-selected: 3px solid var(--rdp-accent-color); --rdp-selected-color: #09090b; margin: 0; }
              .rdp-day { border-radius: 1rem; transition: all 0.2s; }
              .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: #a3e635; color: #09090b; font-weight: bold; scale: 1.05; }
              .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #27272a; }
              .my-has-schedule { font-weight: 900; color: #a3e635; position: relative; }
              .my-has-schedule::after { content: ''; position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; border-radius: 50%; background-color: #a3e635; }
              .rdp-day_selected.my-has-schedule::after { background-color: #09090b; }
              .rdp-head_cell { text-transform: uppercase; font-size: 0.7rem; font-weight: 900; color: #52525b; letter-spacing: 0.1em; }
              .rdp-caption_label { text-transform: uppercase; font-weight: 900; font-style: italic; letter-spacing: 0.05em; font-size: 1.125rem; }
            `}</style>
            <DayPicker 
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ hasSchedule: scheduledDays }}
              modifiersClassNames={{ hasSchedule: 'my-has-schedule' }}
              className="font-sans"
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate(undefined)} 
                className="mt-6 text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* Right Col: Schedule List */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] border-l-2 border-lime-400 pl-3">
              {selectedDate ? `Matches on ${format(selectedDate, 'MMM d, yyyy')}` : 'All Matches'}
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full h-40 flex items-center justify-center text-zinc-500 text-xs font-black uppercase tracking-[0.2em] animate-pulse">Memuat jadwal...</div>
            ) : filteredSchedules.length === 0 ? (
              <div className="col-span-full bg-zinc-900/40 border border-zinc-800/50 border-dashed rounded-[2.5rem] p-16 text-center">
                <CalendarIcon className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest">
                  {selectedDate ? `No matches on ${format(selectedDate, 'MMM d')}` : 'No matches yet'}
                </h3>
              </div>
            ) : (
              filteredSchedules.map(schedule => {
                const isPast = schedule.timestamp < Date.now();
                return (
                  <Link 
                    key={schedule.id}
                    to={`/schedule/${schedule.id}`}
                    className={`group relative flex flex-col bg-zinc-900/50 border ${isPast ? 'border-zinc-800/30 opacity-60' : 'border-zinc-800'} rounded-[2.5rem] p-6 transition-all hover:bg-zinc-900 hover:scale-[1.02] active:scale-[0.98] overflow-hidden shadow-xl`}
                  >
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity font-black text-6xl italic pointer-events-none uppercase tracking-tighter text-zinc-100">
                       {format(schedule.timestamp, 'HH:mm')}
                    </div>

                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black tracking-[0.2em] text-lime-400 mb-2">
                          {format(schedule.timestamp, "EEEE, d MMM", { locale: idLocale })}
                        </span>
                        <h3 className="text-xl font-black italic tracking-tighter uppercase text-zinc-100 group-hover:text-lime-400 transition-colors line-clamp-2 pr-8">
                          {schedule.title}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="mt-auto space-y-4">
                      <div className="flex items-center gap-3 text-zinc-500">
                        <div className="w-8 h-8 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-lime-400/30 transition-colors">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest line-clamp-1">{schedule.location}</span>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isPast ? 'bg-zinc-600' : 'bg-lime-400 animate-pulse'}`}></div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            {isPast ? 'Completed' : 'Booking Open'}
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 shadow-lg">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>

      <CreateScheduleModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
