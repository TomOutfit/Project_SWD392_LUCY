// src/pages/BrowseRoomsPage.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw } from 'lucide-react';
import { roomsApi } from '@/lib/api';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { RoomCard } from '@/components/RoomCard';
import { RoomCardSkeleton } from '@/components/ui/Skeleton';
import { AgoraRoom } from '@/components/AgoraRoom';
import type { Room, Language } from '@/types/index';
import { LANG_FLAGS, LANG_NAMES } from '@/types/index';

export default function BrowseRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [langFilter, setLangFilter] = useState<Language | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const { connectSocket, joinRoom, currentRoom } = useRoomStore();
  const { user } = useAuthStore();

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const { data } = await roomsApi.all(langFilter === 'ALL' ? undefined : langFilter);
      setRooms(data);
    } catch {
      setRooms([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [langFilter]);

  useEffect(() => {
    if (user) {
      connectSocket(user.id, user.displayName, user.personaId, user.role);
    }
  }, [user?.id]);

  const filtered = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.levelName.toLowerCase().includes(search.toLowerCase())
  );

  if (currentRoom) return <AgoraRoom />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-orbitron font-bold text-2xl text-[#F0F4FF]">Live Rooms</h1>
            <p className="text-mist text-sm mt-1">{rooms.length} rooms active now</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist" />
              <input
                className="input-field pl-10 w-48 text-sm"
                placeholder="Search rooms..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-navy border border-ghost">
              {(['ALL', 'EN', 'ZH', 'JA'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLangFilter(lang as Language | 'ALL')}
                  className={`px-3 py-1.5 rounded-md text-xs font-exo font-semibold transition-all ${
                    langFilter === lang
                      ? 'bg-cyan/20 text-cyan'
                      : 'text-mist hover:text-[#F0F4FF]'
                  }`}
                >
                  {lang === 'ALL' ? '🌐 All' : `${LANG_FLAGS[lang as Language]} ${lang}`}
                </button>
              ))}
            </div>
            <button onClick={fetchRooms} className="p-2 rounded-lg border border-ghost text-mist hover:text-cyan hover:border-cyan transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <RoomCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎙️</div>
            <h3 className="font-orbitron font-bold text-xl text-[#F0F4FF] mb-2">No Rooms Found</h3>
            <p className="text-mist text-sm">
              {langFilter !== 'ALL' ? `No ${LANG_NAMES[langFilter as Language]} rooms yet. ` : ''}
              Be the first to create one!
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((room, i) => (
              <motion.div key={room.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <RoomCard room={room} onJoin={(r) => {
                  if (user) joinRoom(r.id);
                }} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
