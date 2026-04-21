'use client';

import LoginButton from '@/components/auth/LoginButton';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Flame, ShieldCheck, Users, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-black text-xl italic shadow-lg shadow-emerald-500/20">L</div>
          <span className="text-xl font-bold tracking-tighter">LOCKED IN</span>
        </div>
        <LoginButton />
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center pt-20 pb-32 px-6 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-emerald-400 mb-6">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            THE LIBRARY EFFECT, REDEFINED.
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Stay Focused. <br />
            <span className="text-gradient">Together.</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Locked In is a minimal Gen Z productivity platform where social pressure becomes a superpower. Join virtual rooms, start focus sessions, and never study alone again.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <LoginButton />
            <button className="px-6 py-3 rounded-full hover:bg-white/5 transition-all text-gray-400 text-sm font-medium">
              See how it works →
            </button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 max-w-7xl mx-auto pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<Users className="text-emerald-500" />}
            title="Library Effect"
            description="Real-time presence of others keeps you accountable. When they work, you work."
          />
          <FeatureCard 
            icon={<Flame className="text-orange-500" />}
            title="Lock-In Sessions"
            description="Timed focus blocks with early-exit penalties. No distractions, just grind."
          />
          <FeatureCard 
            icon={<ShieldCheck className="text-blue-500" />}
            title="Soft Competition"
            description="Room leaderboards and completion signals to keep the motivation high."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6 text-center text-gray-500 text-sm">
        <p>© 2026 Locked In. Build different.</p>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="glass p-8 rounded-3xl hover:border-emerald-500/30 transition-all group">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-all">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed text-sm">{description}</p>
    </div>
  );
}
