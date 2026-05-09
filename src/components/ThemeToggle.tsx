import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="relative w-14 h-7 rounded-full border border-zinc-800 bg-zinc-900 p-0.5 transition-all hover:border-lime-400/50 group"
      title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
    >
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-md",
        theme === 'dark' ? "translate-x-0 bg-zinc-800" : "translate-x-7 bg-lime-400"
      )}>
        {theme === 'dark' ? (
          <span className="text-[11px]">🌙</span>
        ) : (
          <span className="text-[11px]">☀️</span>
        )}
      </div>
    </button>
  );
}
