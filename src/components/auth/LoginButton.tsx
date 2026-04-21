'use client';

import { useAuth } from '@/hooks/useAuth';
import { LogIn as LogInIcon, LogOut as LogOutIcon } from 'lucide-react';

export default function LoginButton() {
  const { user, loginWithGoogle, logout } = useAuth();

  if (user) {
    return (
      <button
        onClick={logout}
        className="flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/10 transition-all text-sm font-medium"
      >
        <LogOutIcon size={16} />
        Sign Out
      </button>
    );
  }

  return (
    <button
      onClick={loginWithGoogle}
      className="flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black transition-all font-bold shadow-lg shadow-emerald-500/20 active:scale-95"
    >
      <LogInIcon size={20} />
      Sign in with Google
    </button>
  );
}
