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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

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
        
        <div className="flex flex-col md:row md:items-center gap-6">
          <img src={userProfile?.avatar_url || ''} alt="" className="w-24 h-24 rounded-[2rem] border-2 border-emerald-500/20 shadow-2xl" />
          <div>
            <h1 className="text-4xl font-black mb-2">{userProfile?.full_name}</h1>
            <p className="text-gray-500 font-medium">Locked In since {new Date(stats?.created_at).toLocaleDateString()}</p>
          </div>
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
          value="6h 45m"
          trend="Achieved on Apr 12"
        />

        <div className="col-span-full mt-6">
          <h3 className="text-xl font-black mb-6">Recent Activity</h3>
          <div className="space-y-3">
             <ActivityItem title="Late Night Grind" duration="90m" status="completed" date="Today" />
             <ActivityItem title="Deep Work Session" duration="50m" status="completed" date="Yesterday" />
             <ActivityItem title="Quick Burst" duration="25m" status="failed" date="Yesterday" />
          </div>
        </div>
      </main>
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
