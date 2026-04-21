import { supabase } from './supabase';

export type UserStatus = 'Idle' | 'Locked In' | 'Break' | 'Offline';

export interface PresenceState {
  user_id: string;
  name: string;
  avatar: string;
  status: UserStatus;
  current_timer: number;
}

export const createPresenceChannel = (roomId: string, userId: string, initialData: Partial<PresenceState>) => {
  const channel = supabase.channel(`room:${roomId}`, {
    config: {
      presence: {
        key: userId,
      },
    },
  });

  return channel;
};

export const syncPresence = (channel: any, data: Partial<PresenceState>) => {
  return channel.track(data);
};
