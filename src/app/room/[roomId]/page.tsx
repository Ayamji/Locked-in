'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { createPresenceChannel, syncPresence, UserStatus } from '@/lib/presence';
import UserCard from '@/components/room/UserCard';
import MusicPlayer from '@/components/room/MusicPlayer';
import { ArrowLeft, Flame, Coffee, Info, AlertTriangle, CheckCircle2, XCircle, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginButton from '@/components/auth/LoginButton';

export default function RoomPage() {
  const { roomId } = useParams() as { roomId: string };
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();
  
  const [room, setRoom] = useState<any>(null);
  const [presence, setPresence] = useState<any>({});
  const [myStatus, setMyStatus] = useState<UserStatus>('Idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [signals, setSignals] = useState<{ id: string, msg: string, type: 'success' | 'fail' | 'info' | 'warn' }[]>([]);
  
  // Music State
  const [musicState, setMusicState] = useState({
    videoId: null as string | null,
    isPlaying: false,
    syncTime: 0
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);
  const isCreator = user?.id === room?.created_by;

  // 1. Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // 2. Room & Presence subscriptions
  useEffect(() => {
    if (!user || !roomId) return;

    // Fetch Room details
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (error || !data) {
        router.push('/dashboard');
        return;
      }
      setRoom(data);
    };
    fetchRoom();

    // Setup Presence Channel
    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: user.id } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const simplifiedState: any = {};
        Object.keys(state).forEach((key) => {
          simplifiedState[key] = state[key][0];
        });
        setPresence(simplifiedState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Handle join signals if needed
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Handle leave signals
      })
      .on('broadcast', { event: 'music-update' }, (payload) => {
        setMusicState({
          videoId: payload.payload.videoId,
          isPlaying: payload.payload.isPlaying,
          syncTime: payload.payload.currentTime
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
          syncPresence(channel, {
            user_id: user.id,
            name: user.user_metadata.full_name,
            avatar: user.user_metadata.avatar_url,
            status: 'Idle',
            current_timer: 0
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, roomId, router]);

  // 3. Presence Sync on status change
  useEffect(() => {
    if (channelRef.current && user) {
      syncPresence(channelRef.current, {
        user_id: user.id,
        name: user.user_metadata.full_name,
        avatar: user.user_metadata.avatar_url,
        status: myStatus,
        current_timer: timeLeft
      });
    }
  }, [myStatus, timeLeft, user]);

  // 4. Timer Logic (Background Proof via Web Worker)
  useEffect(() => {
    let worker: Worker | null = null;

    if (myStatus === 'Locked In' && endTimeRef.current) {
      const updateTimer = () => {
        if (endTimeRef.current) {
          const remainingMs = endTimeRef.current - Date.now();
          if (remainingMs <= 0) {
            handleSessionComplete();
            if (worker) worker.postMessage('stop');
          } else {
            setTimeLeft(Math.ceil(remainingMs / 1000));
          }
        }
      };

      updateTimer(); // Initial calculation

      // Create an inline Web Worker so the browser doesn't throttle the timer in background tabs
      const blob = new Blob([`
        let interval = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            interval = setInterval(() => self.postMessage('tick'), 250);
          } else if (e.data === 'stop') {
            clearInterval(interval);
          }
        };
      `], { type: 'application/javascript' });

      worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = () => {
        updateTimer();
      };
      worker.postMessage('start');

    } else {
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
    }

    return () => {
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
    };
  }, [myStatus]);

  const addSignal = (msg: string, type: 'success' | 'fail' | 'info' | 'warn') => {
    const id = Math.random().toString(36).substr(2, 9);
    setSignals((prev) => [{ id, msg, type }, ...prev].slice(0, 5));
    setTimeout(() => {
      setSignals((prev) => prev.filter((s) => s.id !== id));
    }, 5000);
  };

  const handleLockIn = () => {
    const durationMs = selectedDuration * 60 * 1000;
    endTimeRef.current = Date.now() + durationMs;
    setTimeLeft(selectedDuration * 60);
    setMyStatus('Locked In');
    addSignal(`${user?.user_metadata.full_name} just locked in 🔥`, 'info');
  };

  const handleSessionComplete = async () => {
    setMyStatus('Idle');
    setTimeLeft(0);
    endTimeRef.current = null;
    addSignal(`${user?.user_metadata.full_name} completed a session ✅`, 'success');
    
    // Update Profile in Supabase
    if (user) {
      await supabase.rpc('increment_focus_stats', { 
        user_id: user.id, 
        minutes: selectedDuration 
      });
    }
  };

  const handleBreak = () => {
    if (myStatus === 'Locked In') {
      if (confirm('Are you sure? Your streak will reset and session will fail.')) {
        setMyStatus('Break');
        setTimeLeft(0);
        endTimeRef.current = null;
        addSignal(`${user?.user_metadata.full_name} left early 💀`, 'fail');
      }
    } else {
      setMyStatus(myStatus === 'Break' ? 'Idle' : 'Break');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleMusicStateChange = (state: { isPlaying: boolean; currentTime: number }) => {
    if (!isCreator || !channelRef.current) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'music-update',
      payload: { 
        videoId: musicState.videoId,
        isPlaying: state.isPlaying, 
        currentTime: state.currentTime 
      }
    });

    setMusicState(prev => ({ ...prev, isPlaying: state.isPlaying, syncTime: state.currentTime }));
  };

  const handleVideoSelect = async (videoId: string) => {
    if (!isCreator || !channelRef.current) return;

    // Update DB
    await supabase
      .from('rooms')
      .update({ current_video_id: videoId })
      .eq('id', roomId);

    channelRef.current.send({
      type: 'broadcast',
      event: 'music-update',
      payload: { videoId, isPlaying: true, currentTime: 0 }
    });

    setMusicState({ videoId, isPlaying: true, syncTime: 0 });
  };

  useEffect(() => {
    if (room?.current_video_id) {
      setMusicState(prev => ({ ...prev, videoId: room.current_video_id }));
    }
  }, [room]);

  if (authLoading || !room) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="px-6 py-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-lg z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-white/5 rounded-full transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black">{room.name}</h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">{room.tag || 'General'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end mr-4">
            <span className="text-[10px] font-black text-gray-500 uppercase">Focusing</span>
            <span className="text-sm font-bold">{Object.keys(presence).length} Users</span>
          </div>
          <LoginButton />
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* User Grid */}
        <section className="md:col-span-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(presence).map(([uid, data]: [string, any]) => (
              <UserCard 
                key={uid}
                name={data.name || 'Researcher'} 
                avatar={data.avatar || ''}
                status={data.status}
                timer={data.current_timer}
              />
            ))}
          </div>
        </section>

        {/* Sidebar / Controls */}
        <aside className="space-y-6">
          {/* My Control Panel */}
          <div className={`glass p-6 rounded-[2rem] border transition-all ${myStatus === 'Locked In' ? 'locked-in-glow border-emerald-500/40' : 'border-white/10'}`}>
            <h3 className="text-lg font-black mb-6 flex items-center gap-2">
              {myStatus === 'Locked In' ? <Flame className="text-emerald-500" /> : <Info className="text-gray-400" />}
              {myStatus === 'Locked In' ? 'Locked In' : 'Ready?'}
            </h3>

            {myStatus === 'Locked In' ? (
              <div className="space-y-6">
                <div className="text-5xl font-black font-mono text-center py-4 bg-white/5 rounded-3xl border border-white/5">
                  {formatTime(timeLeft)}
                </div>
                <button 
                  onClick={handleBreak}
                  className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold transition-all"
                >
                  Take a break
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[25, 50, 90].map((d) => (
                    <button 
                      key={d}
                      onClick={() => setSelectedDuration(d)}
                      className={`py-3 rounded-2xl text-xs font-black transition-all ${selectedDuration === d ? 'bg-emerald-500 text-black' : 'bg-white/5 hover:bg-white/10'}`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
                <button 
                  onClick={handleLockIn}
                  className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  LOCK IN
                </button>
              </div>
            )}
          </div>

          {/* Leaderboard (Minimal) */}
          <div className="glass p-6 rounded-[2rem] border border-white/10">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 px-1">Top Focus</h3>
            <div className="space-y-4">
              {Object.entries(presence)
                .sort((a: any, b: any) => (b[1].current_timer || 0) - (a[1].current_timer || 0))
                .slice(0, 3)
                .map(([uid, data]: [string, any], index) => (
                  <div key={uid} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-emerald-500 w-4">#{index + 1}</span>
                       <span className="text-xs font-bold truncate max-w-[80px] text-gray-300">{data.name}</span>
                    </div>
                    <span className="text-xs font-mono text-gray-500">{formatTime(data.current_timer || 0)}</span>
                  </div>
                ))}
              {Object.keys(presence).length === 0 && (
                <p className="text-[10px] text-gray-600 text-center uppercase font-bold">Waiting for legends...</p>
              )}
            </div>
          </div>

          {/* Activity Signals */}
          <div className="glass p-6 rounded-[2rem] border border-white/10 h-64 flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 px-1">Live Signals</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <AnimatePresence>
                {signals.map((s) => (
                  <motion.div 
                    key={s.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5 text-[11px] font-medium leading-tight"
                  >
                    {s.type === 'success' && <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />}
                    {s.type === 'fail' && <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />}
                    {s.type === 'info' && <Flame size={14} className="text-emerald-500 shrink-0 mt-0.5" />}
                    <span className="text-gray-300">{s.msg}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </main>

      {/* Music Player */}
      <MusicPlayer 
        videoId={musicState.videoId}
        isPlaying={musicState.isPlaying}
        syncTime={musicState.syncTime}
        isCreator={isCreator}
        onStateChange={handleMusicStateChange}
        onVideoSelect={handleVideoSelect}
      />
    </div>
  );
}
