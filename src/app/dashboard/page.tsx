'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRoomStore, subscribeToRooms } from '@/store/useRoomStore';
import { useRouter } from 'next/navigation';
import LoginButton from '@/components/auth/LoginButton';
import { Plus, Hash, Users, ArrowRight, LayoutDashboard, Settings, UserCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuthStore();
  const { rooms, loading: roomsLoading } = useRoomStore();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTag, setNewRoomTag] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !user.user_metadata?.target_profile) {
      setIsProfileModalOpen(true);
    } else if (user?.user_metadata?.target_profile) {
      setIsProfileModalOpen(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToRooms();
      return () => unsubscribe();
    }
  }, [user]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name: newRoomName.trim(),
          tag: newRoomTag.trim() || 'General',
          created_by: user.id,
          participants: [],
        })
        .select()
        .single();

      if (error) throw error;

      setIsModalOpen(false);
      setNewRoomName('');
      setNewRoomTag('');
      router.push(`/room/${data.id}`);
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    setSavingProfile(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { target_profile: selectedProfile }
      });
      if (error) throw error;
      setIsProfileModalOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading || roomsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const userProfile = user?.user_metadata;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 border-r border-white/5 flex-col p-6 font-medium">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-black">L</div>
          <span className="text-xl font-bold tracking-tighter">LOCKED IN</span>
        </div>

        <div className="space-y-1 mb-10">
          <SidebarItem icon={<LayoutDashboard size={18} />} label="Explore" active onClick={() => router.push('/dashboard')} />
          <SidebarItem icon={<UserCircle size={18} />} label="My Stats" onClick={() => router.push('/profile')} />
          <SidebarItem icon={<Settings size={18} />} label="Settings" />
        </div>

        <div className="mt-auto">
          <div
            onClick={() => router.push('/profile')}
            className="flex items-center gap-3 p-3 rounded-2xl glass mb-4 cursor-pointer hover:bg-white/10 transition-all"
          >
            <img src={userProfile?.avatar_url || ''} alt="" className="w-8 h-8 rounded-full" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{userProfile?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">Locked In</p>
            </div>
          </div>
          <LoginButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto overflow-y-auto">
        <header className="flex flex-col md:row items-start md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black mb-2">The Library</h1>
            <p className="text-gray-500">Pick a room. Start your grind. ⚡</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus size={18} />
            Create Room
          </button>
        </header>

        {userProfile?.target_profile && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-emerald-500">✨</span> Recommended for {userProfile.target_profile}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms
                .filter(r => r.name.toLowerCase().includes(userProfile.target_profile.toLowerCase()) || r.tag?.toLowerCase().includes(userProfile.target_profile.toLowerCase()))
                .map((room) => (
                  <RoomCard 
                    key={room.id} 
                    room={room} 
                    currentUserId={user?.id}
                    onClick={() => router.push(`/room/${room.id}`)} 
                    onDelete={async (e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this room?')) {
                        try {
                          await supabase.from('rooms').delete().eq('id', room.id);
                          useRoomStore.getState().setRooms(useRoomStore.getState().rooms.filter(r => r.id !== room.id));
                        } catch (error: any) {
                          alert('Failed to delete room. Error: ' + error.message);
                        }
                      }
                    }}
                  />
              ))}
              {rooms.filter(r => r.name.toLowerCase().includes(userProfile.target_profile.toLowerCase()) || r.tag?.toLowerCase().includes(userProfile.target_profile.toLowerCase())).length === 0 && (
                <div className="col-span-full py-8 text-center bg-white/5 rounded-3xl border border-white/5">
                  <p className="text-gray-500 text-sm">No specific rooms found for your profile. Create one to get started!</p>
                </div>
              )}
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">All Rooms</h2>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <RoomCard 
              key={room.id} 
              room={room} 
              currentUserId={user?.id}
              onClick={() => router.push(`/room/${room.id}`)} 
              onDelete={async (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this room?')) {
                  try {
                    const { error } = await supabase.from('rooms').delete().eq('id', room.id);
                    if (error) {
                      throw error;
                    }
                    // Optimistically update or refetch
                    useRoomStore.getState().setRooms(useRoomStore.getState().rooms.filter(r => r.id !== room.id));
                  } catch (error: any) {
                    console.error('Error deleting room:', error);
                    alert('Failed to delete room. You might not have permission, or it was already deleted. Error: ' + error.message);
                  }
                }
              }}
            />
          ))}
          {rooms.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Hash className="text-gray-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">No rooms available</h3>
              <p className="text-gray-500">Be the first to create one and start focusing!</p>
            </div>
          )}
        </section>
      </main>

      {/* Create Room Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            ></motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass p-8 rounded-[2rem] shadow-2xl"
            >
              <h2 className="text-2xl font-black mb-6">Setup your room</h2>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Room Name</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. JEE Night Grind"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 outline-none focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Tag (Optional)</label>
                  <input
                    type="text"
                    value={newRoomTag}
                    onChange={(e) => setNewRoomTag(e.target.value)}
                    placeholder="e.g. UPSC, Tech, Reading"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-2xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all"
                  >
                    Launch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Setup Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            ></motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass p-8 md:p-10 rounded-[2rem] shadow-2xl border border-emerald-500/20"
            >
              <h2 className="text-3xl font-black mb-2 text-center">What are you studying for?</h2>
              <p className="text-gray-400 text-center mb-8">This helps us recommend the best focus rooms for you.</p>
              
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

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={!selectedProfile || savingProfile}
                    className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-black text-lg hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-emerald-500/20"
                  >
                    {savingProfile ? 'Saving...' : 'Lock In'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer ${active ? 'bg-emerald-500/10 text-emerald-500' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function RoomCard({ room, onClick, onDelete, currentUserId }: { room: any, onClick: () => void, onDelete: (e: React.MouseEvent) => void, currentUserId?: string }) {
  const isCreator = currentUserId === room.created_by;
  
  return (
    <motion.div
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="glass p-6 rounded-3xl cursor-pointer hover:border-emerald-500/30 group transition-all relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
        {isCreator && (
          <button 
            onClick={onDelete}
            className="p-1 text-red-500 hover:text-red-400 transition-colors z-10"
            title="Delete Room"
          >
            <Trash2 size={20} />
          </button>
        )}
        <div className="p-1">
          <ArrowRight size={20} className="text-emerald-500" />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">
          {room.tag || 'General'}
        </div>
      </div>
      <h3 className="text-xl font-bold mb-4 line-clamp-1">{room.name}</h3>
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <Users size={16} />
          <span>{room.participants?.length || 0} focusing</span>
        </div>
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
      </div>
    </motion.div>
  );
}
