import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Room {
  id: string;
  name: string;
  tag: string;
  participants: string[];
  created_by: string;
  created_at: string;
}

interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  loading: boolean;
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (room: Room | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  currentRoom: null,
  loading: true,
  setRooms: (rooms) => set({ rooms, loading: false }),
  setCurrentRoom: (currentRoom) => set({ currentRoom }),
  setLoading: (loading) => set({ loading }),
}));

export const fetchRooms = async () => {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching rooms:', error);
    return;
  }

  useRoomStore.getState().setRooms(data as Room[]);
};

// Subscribe to real-time room updates
export const subscribeToRooms = () => {
  const channel = supabase
    .channel('public:rooms')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
      fetchRooms();
    })
    .subscribe();

  fetchRooms(); // Initial fetch
  return () => {
    supabase.removeChannel(channel);
  };
};
