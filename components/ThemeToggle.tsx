'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
        isDark
          ? 'border-slate-700 bg-slate-800 text-amber-300 hover:bg-slate-700 shadow-xs'
          : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-xs'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 stroke-[2.2] animate-in zoom-in-75 duration-200" />
      ) : (
        <Moon className="w-4 h-4 stroke-[2.2] animate-in zoom-in-75 duration-200" />
      )}
    </button>
  );
}
