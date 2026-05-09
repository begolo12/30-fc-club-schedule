import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<{ toast: (message: string, type?: ToastType) => void }>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 md:bottom-8">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              "px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300 whitespace-nowrap",
              t.type === 'success' && "bg-lime-400 text-zinc-950",
              t.type === 'error' && "bg-red-500 text-white",
              t.type === 'info' && "bg-zinc-800 text-zinc-100 border border-zinc-700"
            )}
          >
            {t.type === 'success' && '✓ '}{t.type === 'error' && '✗ '}{t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
