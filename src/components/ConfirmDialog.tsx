import React from 'react';
import { cn } from '../lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ isOpen, title, message, confirmText = 'Ya', cancelText = 'Batal', variant = 'default', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-sm font-black italic uppercase tracking-tighter text-zinc-100">{title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">{message}</p>
        <div className="flex gap-2 pt-2">
          <button onClick={onCancel} className="flex-1 bg-zinc-800 text-zinc-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all">{cancelText}</button>
          <button onClick={onConfirm} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", variant === 'danger' ? "bg-red-500 text-white hover:bg-red-400" : "bg-lime-400 text-zinc-950 hover:bg-lime-300")}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
