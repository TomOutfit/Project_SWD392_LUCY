// src/pages/BrowseRoomsPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, RefreshCw, Mic2, Plus } from 'lucide-react';
import { roomsApi } from '@/lib/api';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { RoomCard } from '@/components/RoomCard';
import { RoomCardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import type { Room, Language } from '@/types/index';
import { LANG_FLAGS, LANG_NAMES } from '@/types/index';
import toast from 'react-hot-toast';

export default function BrowseRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [langFilter, setLangFilter] = useState<Language | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { connectSocket, joinRoom, currentRoom } = useRoomStore();
  const { user } = useAuthStore();
  const [roomCodeInput, setRoomCodeInput] = useState('');

  const handleJoinByCode = async () => {
    const code = roomCodeInput.trim().toLowerCase();
    if (!code) {
      toast.error('Please enter a room code!');
      return;
    }
    const regex = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
    if (!regex.test(code)) {
      toast.error('Invalid format. Use: abc-defg-hij');
      return;
    }
    
    let exists = rooms.some(r => r.id === code);
    if (!exists) {
      try {
        const { data } = await roomsApi.active();
        exists = data.some((r: any) => r.id === code);
      } catch (err) {
        console.error('Failed to verify room code', err);
      }
    }
    
    if (!exists) {
      toast.error('Room not found or has been closed!');
      return;
    }
    
    joinRoom(code);
    navigate(`/speaking/${code}`);
  };

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

  if (currentRoom) return <Navigate to={`/speaking/${currentRoom.id}`} replace />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative">
      {/* Background Cyber Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.05),transparent_50%)] blur-[100px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-ghost/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pulse animate-pulse" />
              <h1 className="font-orbitron font-black text-3xl text-[#F0F4FF] tracking-wider">Live Lobby browser</h1>
            </div>
            <p className="text-mist text-sm mt-1">
              Currently hosting <strong className="text-cyan font-mono">{rooms.length}</strong> active audio rooms
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mist" />
              <input
                className="input-field pl-11 pr-4 py-2.5 w-64 text-sm bg-navy/40 border-ghost focus:border-cyan text-[#F0F4FF] outline-none rounded-xl"
                placeholder="Search rooms or level..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Join by Code Input */}
            <div className="flex items-center gap-2">
              <input
                className="input-field px-4 py-2.5 w-40 text-sm bg-navy/40 border-ghost focus:border-cyan text-[#F0F4FF] outline-none rounded-xl font-mono text-center"
                placeholder="abc-defg-hij"
                value={roomCodeInput}
                onChange={e => setRoomCodeInput(e.target.value)}
              />
              <Button
                onClick={handleJoinByCode}
                className="bg-cyan text-void font-bold text-xs h-[42px] px-4 whitespace-nowrap shadow-[0_0_15px_rgba(0,245,255,0.15)] hover:shadow-[0_0_25px_rgba(0,245,255,0.3)] transition-all"
              >
                Join Code
              </Button>
            </div>

            {/* Language Selection Filter */}
            <div className="flex items-center p-1 rounded-xl bg-navy border border-ghost">
              {(['ALL', 'EN', 'ZH', 'JA'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLangFilter(lang as Language | 'ALL')}
                  className={`px-4 py-2 rounded-lg text-xs font-exo font-bold transition-all duration-300 ${
                    langFilter === lang
                      ? 'bg-cyan text-void shadow-[0_0_15px_rgba(0,245,255,0.3)]'
                      : 'text-mist hover:text-[#F0F4FF]'
                  }`}
                >
                  {lang === 'ALL' ? '🌐 All' : `${LANG_FLAGS[lang as Language]} ${lang}`}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={fetchRooms}
                className="p-3 rounded-xl border border-ghost bg-navy/40 text-mist hover:text-cyan hover:border-cyan hover:bg-cyan/5 transition-all duration-300"
                title="Refresh rooms"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {user && user.role !== 'LUCY' && (
                <Link to="/create-room">
                  <Button className="bg-violet text-[#F0F4FF] shadow-[0_0_15px_rgba(123,47,255,0.3)] hover:shadow-[0_0_25px_rgba(123,47,255,0.5)] font-bold">
                    <Plus className="w-4 h-4 mr-1.5" /> Host Room
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Room grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <RoomCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border border-ghost/40 max-w-xl mx-auto">
            <div className="text-6xl mb-5">🎙️</div>
            <h3 className="font-orbitron font-bold text-xl text-[#F0F4FF] mb-2">No Active Lobbies</h3>
            <p className="text-mist text-sm max-w-sm mx-auto mb-6">
              {langFilter !== 'ALL' ? `No active ${LANG_NAMES[langFilter as Language]} rooms found. ` : 'There are currently no lobbies broadcasting. '}
              Start a custom room to host conversational practice!
            </p>
            {user && user.role !== 'LUCY' && (
              <Link to="/create-room">
                <Button className="bg-cyan text-void shadow-[0_0_15px_rgba(0,245,255,0.2)] font-bold">
                  <Mic2 className="w-4 h-4 mr-2" /> Open First Lobby
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((room, i) => (
              <motion.div key={room.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <RoomCard room={room} onJoin={(r) => {
                  if (user) {
                    joinRoom(r.id);
                    navigate(`/speaking/${r.id}`);
                  }
                }} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
