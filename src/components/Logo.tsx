import React from 'react';
import { Heart, Activity } from 'lucide-react';

interface LogoProps {
  className?: string;
  iconSize?: number;
  hideText?: boolean;
}

export default function Logo({ className = '', iconSize = 24, hideText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="p-2.5 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <Heart size={iconSize} className="text-white/40" fill="currentColor" />
            <Activity 
              size={iconSize * 0.7} 
              className="absolute text-red-500 animate-[pulse_2s_ease-in-out_infinite]" 
              strokeWidth={3}
            />
          </div>
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-white" />
      </div>
      {!hideText && (
        <div className="leading-tight">
          <h1 className="font-mono text-base font-black tracking-tighter text-natural-text uppercase leading-none">LIFELINE</h1>
          <p className="text-[10px] text-muted uppercase tracking-[0.2em] font-bold mt-1">Health Guardian</p>
        </div>
      )}
    </div>
  );
}
