'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Clock, Flame, Calendar, Trophy, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [bestDailyRecord, setBestDailyRecord] = useState<{ time: string, date: string }>({ time: '0h 0m', date: 'No completed sessions' });
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) throw profileError;
        setStats(profileData);

        const { data: sessionData, error: sessionError } = await supabase
          .from('focus_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (sessionError) throw sessionError;

        if (sessionData && sessionData.length > 0) {
          setRecentSessions(sessionData.slice(0, 5));

          // Calculate best daily record
          const dailyTotals: Record<string, number> = {};
          sessionData.forEach((s: any) => {
            if (s.status === 'completed') {
              const dateStr = new Date(s.created_at).toLocaleDateString();
              dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + s.duration;
            }
          });

          let bestDate = 'No completed sessions';
          let maxDuration = 0;
          Object.entries(dailyTotals).forEach(([date, duration]) => {
            if (duration > maxDuration) {
              maxDuration = duration;
              bestDate = date;
            }
          });

          if (maxDuration > 0) {
            const h = Math.floor(maxDuration / 60);
            const m = maxDuration % 60;
            setBestDailyRecord({
              time: h > 0 ? `${h}h ${m}m` : `${m}m`,
              date: `Achieved on ${bestDate}`
            });
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    setSavingProfile(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { target_profile: selectedProfile }
      });
      if (error) throw error;
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const userProfile = user?.user_metadata;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col p-6 md:p-10">
      <header className="max-w-4xl mx-auto w-full mb-10">
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-all mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Library</span>
        </button>
        
        <div className="flex flex-col md:row md:items-center justify-between gap-6">
          <div className="flex flex-col md:row md:items-center gap-6">
            <img src={userProfile?.avatar_url || ''} alt="" className="w-24 h-24 rounded-[2rem] border-2 border-emerald-500/20 shadow-2xl" />
            <div>
              <h1 className="text-4xl font-black mb-2">{userProfile?.full_name}</h1>
              <p className="text-gray-500 font-medium">Locked In since {stats?.created_at ? new Date(stats.created_at).toLocaleDateString() : 'Today'}</p>
              {userProfile?.target_profile && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold uppercase tracking-widest border border-emerald-500/20">
                  Target: {userProfile.target_profile}
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={() => {
              setSelectedProfile(userProfile?.target_profile || '');
              setIsEditingProfile(true);
            }}
            className="px-6 py-2.5 rounded-full border-2 border-white/10 hover:border-emerald-500 hover:bg-emerald-500/10 text-white font-bold transition-all text-sm w-fit"
          >
            Edit Goal
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatsCard 
          icon={<Clock className="text-emerald-500" />}
          label="Total Focus Time"
          value={`${Math.round((stats?.focus_time || 0) / 60)}h ${Math.round((stats?.focus_time || 0) % 60)}m`}
          trend="+12% from last week"
        />
        <StatsCard 
          icon={<Flame className="text-orange-500" />}
          label="Current Streak"
          value={`${stats?.streak || 0} Days`}
          trend="Highest: 14 days"
        />
        
        <StatsCard 
          icon={<Trophy className="text-yellow-500" />}
          label="Sessions Completed"
          value={`${stats?.sessions_completed || 0}`}
          trend="8 this week"
        />
        <StatsCard 
          icon={<Calendar className="text-blue-500" />}
          label="Best Daily Record"
          value={bestDailyRecord.time}
          trend={bestDailyRecord.date}
        />

        <div className="col-span-full mt-6">
          <h3 className="text-xl font-black mb-6">Recent Activity</h3>
          <div className="space-y-3">
             {recentSessions.length > 0 ? recentSessions.map((session: any) => (
               <ActivityItem 
                 key={session.id}
                 title={session.room_name} 
                 duration={`${session.duration}m`} 
                 status={session.status} 
                 date={new Date(session.created_at).toLocaleDateString()} 
               />
             )) : (
               <div className="text-center p-6 glass rounded-3xl border border-white/5">
                 <p className="text-gray-500 font-bold">No recent activity found. Go lock in!</p>
               </div>
             )}
          </div>
        </div>
      </main>

      {/* Edit Goal Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => setIsEditingProfile(false)}
          ></motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg glass p-8 md:p-10 rounded-[2rem] shadow-2xl border border-emerald-500/20"
          >
            <h2 className="text-3xl font-black mb-2 text-center">Change Goal</h2>
            <p className="text-gray-400 text-center mb-8">Update your target to get better room recommendations.</p>
            
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {['JEE', 'NEET', 'UPSC', 'CA / CS', 'Working Professional', 'Other'].map(profile => (
                  <button
                    key={profile}
                    type="button"
                    onClick={() => setSelectedProfile(profile)}
                    className={`py-4 px-4 rounded-2xl border-2 transition-all font-bold ${
                      selectedProfile === profile 
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' 
                      : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/30'
                    }`}
                  >
                    {profile}
                  </button>
                ))}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedProfile || savingProfile}
                  className="flex-1 py-4 rounded-2xl bg-emerald-500 text-black font-black text-lg hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/20"
                >
                  {savingProfile ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend: string }) {
  return (
    <div className="glass p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all scale-150">
        {icon}
      </div>
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        {icon}
      </div>
      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-3xl font-black mb-4">{value}</h3>
      <p className="text-xs font-medium text-emerald-500/80">{trend}</p>
    </div>
  );
}

function ActivityItem({ title, duration, status, date }: { title: string, duration: string, status: string, date: string }) {
  return (
    <div className="flex items-center justify-between p-5 rounded-3xl glass border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full ${status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
        <div>
          <h4 className="font-bold text-sm tracking-tight">{title}</h4>
          <p className="text-xs text-gray-500">{date} • {duration}</p>
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-700" />
    </div>
  );
}
