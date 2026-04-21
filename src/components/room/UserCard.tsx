'use client';

import { UserStatus } from '@/lib/presence';
import { Flame, Clock, Coffee, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserCardProps {
  name: string;
  avatar: string;
  status: UserStatus;
  timer: number;
}

export default function UserCard({ name, avatar, status, timer }: UserCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'Locked In': return <Flame size={14} className="text-emerald-500" />;
      case 'Break': return <Coffee size={14} className="text-blue-400" />;
      case 'Idle': return <Moon size={14} className="text-gray-500" />;
      default: return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'Locked In': return 'border-emerald-500/50 bg-emerald-500/5 text-emerald-500';
      case 'Break': return 'border-blue-500/50 bg-blue-500/5 text-blue-500';
      case 'Idle': return 'border-gray-500/50 bg-gray-500/5 text-gray-500';
      default: return 'border-white/10 bg-white/5 text-gray-400';
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass p-4 rounded-3xl border transition-all ${status === 'Locked In' ? 'locked-in-glow border-emerald-500/30' : ''}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <img src={avatar} alt={name} className="w-10 h-10 rounded-full bg-white/5" />
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${status === 'Locked In' ? 'bg-emerald-500' : status === 'Break' ? 'bg-blue-500' : status === 'Idle' ? 'bg-gray-500' : 'bg-gray-800'}`}></div>
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-bold truncate">{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {getStatusIcon()}
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{status}</span>
          </div>
        </div>
      </div>

      {status === 'Locked In' && timer > 0 && (
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <Clock size={12} />
            <span>Time Left</span>
          </div>
          <span className="text-xs font-black font-mono text-emerald-500">{formatTime(timer)}</span>
        </div>
      )}
    </motion.div>
  );
}
