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

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    // Add status filter to align with secure list rules and ensure only valid matches are shown
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
          <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase">Match Overview</h2>
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

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* Left Col: Calendar */}
        <div className="md:col-span-5 lg:col-span-4 flex justify-center md:justify-start flex-col">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 flex flex-col shadow-2xl items-center justify-center w-full max-w-sm mx-auto">
            <style>{`
              .rdp { --rdp-cell-size: 38px; --rdp-accent-color: #a3e635; --rdp-background-color: rgba(163, 230, 53, 0.1); --rdp-accent-color-dark: #84cc16; --rdp-background-color-dark: rgba(163, 230, 53, 0.1); --rdp-outline: 2px solid var(--rdp-accent-color); --rdp-outline-selected: 3px solid var(--rdp-accent-color); --rdp-selected-color: #09090b; margin: 0; }
              .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: #a3e635; color: #09090b; font-weight: bold; }
              .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #27272a; }
              .my-has-schedule { font-weight: 900; color: #a3e635; position: relative; }
              .my-has-schedule::after { content: ''; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 50%; background-color: #a3e635; }
              .rdp-day_selected.my-has-schedule::after { background-color: #09090b; }
            `}</style>
            <DayPicker 
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ hasSchedule: scheduledDays }}
              modifiersClassNames={{ hasSchedule: 'my-has-schedule' }}
              className="font-sans text-sm m-0"
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate(undefined)} 
                className="mt-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-zinc-300"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* Right Col: Schedule List */}
        <div className="md:col-span-7 lg:col-span-8 bg-zinc-900/40 border border-zinc-800 rounded-[2rem] p-6 flex flex-col shadow-lg overflow-hidden min-h-[400px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-l-2 border-lime-400 pl-3">
              {selectedDate ? `Matches on ${format(selectedDate, 'MMM d, yyyy')}` : 'Upcoming & Past Matches'}
            </h4>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm font-bold uppercase tracking-widest">Memuat jadwal...</div>
            ) : filteredSchedules.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-10">
                <div className="w-16 h-16 border-2 border-dashed border-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-6 h-6 text-zinc-600" />
                </div>
                <h3 className="text-sm font-bold text-zinc-300 mb-1 uppercase tracking-widest">
                  {selectedDate ? `No matches on ${format(selectedDate, 'MMM d')}` : 'No matches yet'}
                </h3>
                <p className="text-zinc-500 text-xs">Waiting for admin to create match.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredSchedules.map(schedule => {
                  const isPast = schedule.timestamp < Date.now();
                  return (
                    <Link 
                      key={schedule.id}
                      to={`/schedule/${schedule.id}`}
                      className={`block bg-zinc-950/50 hover:bg-zinc-800/80 border ${isPast ? 'border-zinc-800/50 opacity-60' : 'border-zinc-800'} rounded-2xl p-5 md:p-6 transition-all group relative overflow-hidden`}
                    >
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">
                            {format(schedule.timestamp, "d MMM yyyy", { locale: idLocale })}
                          </span>
                          <h3 className="font-black italic tracking-tight uppercase text-xl md:text-2xl text-zinc-100 line-clamp-1">{schedule.title}</h3>
                        </div>
                        <div className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${isPast ? 'bg-zinc-800 text-zinc-400' : 'bg-lime-400/10 text-lime-400'}`}>
                          {isPast ? 'Completed' : 'Upcoming'}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 bg-zinc-900 justify-self-stretch w-full p-3 rounded-xl border border-zinc-800/50 relative z-10">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Time</span>
                            <span className="text-sm font-bold text-zinc-100">{format(schedule.timestamp, "HH:mm")}</span>
                          </div>
                          <div className="w-px h-6 bg-zinc-800"></div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Location</span>
                            <span className="text-sm font-bold text-zinc-100 line-clamp-1 max-w-[150px] sm:max-w-xs">{schedule.location}</span>
                          </div>
                        </div>
                        <div className="w-8 h-8 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-lime-400 group-hover:text-zinc-950 transition-colors">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
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
