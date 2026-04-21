'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Just initialize the hook to start listening to auth changes
  useAuth();
  
  return <>{children}</>;
}
