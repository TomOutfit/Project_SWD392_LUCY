// src/pages/DashboardPage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Mic, Gift, Pin, Clock, ArrowUpRight, Award, BarChart2, Shield, Eye, BookOpen, TrendingUp } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { roomsApi, sessionsApi } from '@/lib/api';
import { Room } from '@/types/index';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { getAnonymousName } from '@/utils/anonymous';

const giftStats = [
  { type: 'Crown 👑', count: 4, value: 400, color: 'text-amber' },
  { type: 'Rocket 🚀', count: 8, value: 200, color: 'text-magenta' },
  { type: 'Diamond 💎', count: 15, value: 750, color: 'text-cyan' },
  { type: 'Star ⭐', count: 32, value: 320, color: 'text-yellow-400' },
  { type: 'Heart ❤️', count: 64, value: 320, color: 'text-red-500' },
];

interface StudySession {
  id: string;
  roomId: string;
  hostId: number;
  hostName: string;
  language: string;
  levelName: string;
  totalDurationSec: number;
  createdAt: string;
  closedAt: string;
  mySpeakingTimeSec: number;   // raw display time
  myValidatedTimeSec: number; // XP-validated time
  myXpEarned: number;
  totalParticipants: number;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'gifts' | 'materials' | 'history'>('overview');
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [sessionHistory, setSessionHistory] = useState<StudySession[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [totalSpeakingSec, setTotalSpeakingSec] = useState(0);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === 'LUCY') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    let active = true;
    const fetchActiveRooms = async () => {
      try {
        const res = await roomsApi.active();
        if (active) {
          setActiveRooms(res.data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch active rooms:', err);
        if (active) setLoading(false);
      }
    };
    fetchActiveRooms();
    const interval = setInterval(fetchActiveRooms, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Load persisted study sessions from DB
  useEffect(() => {
    if (!user?.id) return;
    sessionsApi.history(user.id)
      .then(r => {
        const sessions = (r.data?.sessions || []).map((s: any) => ({
          ...s,
          hostName: getAnonymousName(s.hostId, 'LUCY'),
        }));
        setSessionHistory(sessions);
        setTotalXp(r.data?.totalXp || 0);
        setTotalSpeakingSec(r.data?.totalSpeakingSec || 0);
      })
      .catch(() => {});
  }, [user?.id]);

  const filteredActiveRooms = user?.role === 'SUPER'
    ? activeRooms
    : activeRooms.filter(r => r.hostId === user?.id);

  // Filter based on selected room
  const selectedRooms = selectedRoomId === 'all'
    ? filteredActiveRooms
    : filteredActiveRooms.filter(r => r.id === selectedRoomId);

  const activeStudents = selectedRooms.flatMap(room =>
    (room.participants || []).map(p => ({
      id: p.oderId,
      name: getAnonymousName(p.oderId, p.oderRole ?? 'LUCY'),
      role: p.oderRole as 'LUCY' | 'PRO' | 'SUPER',
      personaId: p.oderPersonaId,
      joinedDurationMin: Math.max(1, Math.round((Date.now() - new Date(p.joinedAt).getTime()) / 60000)),
      speakingTimeSec: p.speakingDurationSec || 0,
      status: (!p.isMuted && p.isSpeaking) ? 'active' as const : p.isMuted ? 'muted' as const : 'active' as const,
      giftsSent: 0,
      pointsEarned: (p.speakingDurationSec || 0) * 2, // 2 XP per speaking second
      roomName: room.name,
    }))
  );

  const totalSpeakingTime = activeStudents.reduce((acc, curr) => acc + curr.speakingTimeSec, 0);
  const totalGifts = filteredActiveRooms.reduce((acc, r) => acc + ((r.participants || []).length > 0 ? 5 : 0), 0);
  const averageEngagement = activeStudents.length > 0
    ? Math.round(activeStudents.reduce((acc, curr) => acc + curr.joinedDurationMin, 0) / activeStudents.length)
    : 0;

  const pinnedMaterials = filteredActiveRooms
    .filter(r => r.pinnedContent !== null)
    .map(r => ({
      roomName: r.name,
      ...r.pinnedContent!,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-[#F0F4FF] min-h-screen relative overflow-hidden bg-[#0B0B1A]">
      {/* Background Cyber Glow */}
      <div className="absolute top-[10%] right-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.06),transparent_50%)] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(123,47,255,0.06),transparent_50%)] blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8 pb-6 border-b border-ghost/40">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-orbitron font-black text-3xl tracking-wider bg-gradient-to-r from-cyan to-violet bg-clip-text text-transparent">
              Lobby Operations Center
            </h1>
            {user && (
              <Badge variant={user.role === 'SUPER' ? 'magenta' : 'violet'} className="text-[10px] font-bold tracking-wider uppercase animate-pulse">
                {user.role === 'SUPER' ? 'Creator - Global View' : 'Pro - Host View'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-mist font-exo mt-1 uppercase tracking-widest font-semibold text-cyan">
            {user?.role === 'SUPER' ? 'Real-time global analytics for all classrooms' : 'Real-time analytics for your hosted classrooms'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-navy p-1 rounded-xl border border-ghost">
          {(['overview', 'students', 'gifts', 'materials', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-exo font-black capitalize transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-cyan text-void shadow-[0_0_15px_rgba(0,245,255,0.3)]'
                  : 'text-mist hover:text-[#F0F4FF]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Room Selector */}
      {filteredActiveRooms.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 bg-navy/40 p-4 rounded-2xl border border-ghost">
          <span className="text-xs font-exo font-bold text-mist uppercase tracking-widest flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-cyan" /> Classroom Filter:
          </span>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="bg-[#0c0c1e] border border-ghost text-xs text-[#F0F4FF] rounded-lg px-4 py-2 focus:border-cyan outline-none transition-all cursor-pointer font-exo font-semibold"
          >
            <option value="all">All Active Rooms ({filteredActiveRooms.length})</option>
            {filteredActiveRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.levelName})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Empty State */}
      {filteredActiveRooms.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center p-16 text-center glass border border-ghost rounded-3xl relative overflow-hidden mt-6 max-w-xl mx-auto">
          <span className="text-6xl mb-4">🎙️</span>
          <h2 className="font-orbitron font-extrabold text-xl text-[#F0F4FF] mb-2 uppercase tracking-wide">No active rooms found</h2>
          <p className="text-sm text-mist mb-6 leading-relaxed">
            There are currently no active speaking sessions. Real-time statistics, speaking duration counters, and pinned documents will appear once a classroom is started.
          </p>
          <a
            href="/create-room"
            className="px-6 py-3 rounded-xl bg-cyan text-void text-xs font-exo font-bold hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all shadow-md"
          >
            Launch Speaking Room
          </a>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan border-t-transparent animate-spin mb-3" />
          <p className="text-xs text-mist">Connecting to real-time analytics...</p>
        </div>
      )}

      {!loading && filteredActiveRooms.length > 0 && (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-5 flex items-center justify-between border border-ghost bg-navy/35 hover:border-cyan/50 transition-all duration-300">
                  <div>
                    <p className="text-xs font-bold text-mist uppercase font-exo tracking-wider">Active Students</p>
                    <h3 className="font-orbitron font-black text-2xl mt-1 text-[#F0F4FF]">{activeStudents.length}</h3>
                    <span className="text-[10px] text-cyan flex items-center gap-1 mt-1 font-exo font-semibold">
                      Live speaking room <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-cyan/10 flex items-center justify-center border border-cyan/20">
                    <Users className="w-5 h-5 text-cyan" />
                  </div>
                </div>

                <div className="card p-5 flex items-center justify-between border border-ghost bg-navy/35 hover:border-violet/50 transition-all duration-300">
                  <div>
                    <p className="text-xs font-bold text-mist uppercase font-exo tracking-wider">Speaking Time</p>
                    <h3 className="font-orbitron font-black text-2xl mt-1 text-[#F0F4FF]">{Math.floor(totalSpeakingTime / 60)}m {totalSpeakingTime % 60}s</h3>
                    <span className="text-[10px] text-violet flex items-center gap-1 mt-1 font-exo font-semibold">
                      Total student audio streams <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-violet/10 flex items-center justify-center border border-violet/20">
                    <Mic className="w-5 h-5 text-violet" />
                  </div>
                </div>

                <div className="card p-5 flex items-center justify-between border border-ghost bg-navy/35 hover:border-magenta/50 transition-all duration-300">
                  <div>
                    <p className="text-xs font-bold text-mist uppercase font-exo tracking-wider">Gifts Contributed</p>
                    <h3 className="font-orbitron font-black text-2xl mt-1 text-[#F0F4FF]">{totalGifts}</h3>
                    <span className="text-[10px] text-magenta flex items-center gap-1 mt-1 font-exo font-semibold">
                      From active listeners <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-magenta/10 flex items-center justify-center border border-magenta/20">
                    <Gift className="w-5 h-5 text-magenta" />
                  </div>
                </div>

                <div className="card p-5 flex items-center justify-between border border-ghost bg-navy/35 hover:border-amber/50 transition-all duration-300">
                  <div>
                    <p className="text-xs font-bold text-mist uppercase font-exo tracking-wider">Avg. Attendance</p>
                    <h3 className="font-orbitron font-black text-2xl mt-1 text-[#F0F4FF]">{averageEngagement} mins</h3>
                    <span className="text-[10px] text-amber flex items-center gap-1 mt-1 font-exo font-semibold">
                      Across active sessions <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber/10 flex items-center justify-center border border-amber/20">
                    <Clock className="w-5 h-5 text-amber" />
                  </div>
                </div>
              </div>

              {/* Quick Analytics & Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 bg-navy/20 border border-ghost rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6 pb-2 border-b border-ghost/45">
                      <h3 className="font-exo font-bold text-sm text-[#F0F4FF] flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-cyan" /> Voice Engagement & Speaking Performance
                      </h3>
                      <span className="text-[10px] text-mist font-mono">Real-time update</span>
                    </div>
                    {activeStudents.length === 0 ? (
                      <p className="text-xs text-mist/50 italic p-6 text-center">No students currently joined in this view.</p>
                    ) : (
                      <div className="space-y-4">
                        {activeStudents.map((s) => {
                          const percentage = Math.min(100, Math.round((s.speakingTimeSec / 300) * 100));
                          return (
                            <div key={s.id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-mist flex items-center gap-1.5">
                                  <Shield className="w-3.5 h-3.5 text-cyan" /> {s.name} ({s.role}) <span className="text-[10px] text-mist/50">· {s.roomName}</span>
                                </span>
                                <span className="font-semibold text-cyan font-mono">{s.speakingTimeSec}s</span>
                              </div>
                              <div className="w-full h-2 rounded bg-navy/60 overflow-hidden border border-ghost/30">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan to-violet transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-navy/20 border border-ghost rounded-2xl">
                  <h3 className="font-exo font-bold text-sm text-[#F0F4FF] flex items-center gap-2 mb-4 pb-2 border-b border-ghost/45">
                    <Award className="w-4 h-4 text-magenta animate-bounce" /> Top Engaged Students
                  </h3>
                  {activeStudents.length === 0 ? (
                    <p className="text-xs text-mist/50 italic p-6 text-center">No active students.</p>
                  ) : (
                    <div className="space-y-3">
                      {activeStudents
                        .sort((a, b) => b.pointsEarned - a.pointsEarned)
                        .slice(0, 3)
                        .map((s, idx) => (
                          <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#0c0c22] border border-ghost/45">
                            <div className="font-orbitron font-bold text-sm text-cyan w-4">#{idx + 1}</div>
                            <Avatar personaId={s.personaId} name={s.name} size="sm" role={s.role} />
                            <div className="flex-1 truncate">
                              <p className="text-xs font-bold text-[#F0F4FF] truncate">{s.name}</p>
                              <p className="text-[10px] text-mist font-mono mt-0.5">{s.pointsEarned} XP earned</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Students List Tab */}
          {activeTab === 'students' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-navy/20 border border-ghost rounded-2xl overflow-hidden shadow-inner"
            >
              <div className="p-5 border-b border-ghost flex items-center justify-between bg-navy/40">
                <h3 className="font-exo font-bold text-sm text-[#F0F4FF] uppercase tracking-wider">Student Activity Log</h3>
                <Badge variant="cyan" className="font-bold">{activeStudents.length} Active</Badge>
              </div>
              {activeStudents.length === 0 ? (
                <p className="text-xs text-mist/50 italic p-12 text-center">No students currently active in the selected room.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-ghost/60 bg-navy/45 text-mist text-[10px] uppercase font-exo tracking-wider">
                        <th className="p-4">Student</th>
                        <th className="p-4">Room Name</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Connected Duration</th>
                        <th className="p-4">Speaking Duration</th>
                        <th className="p-4">Accrued XP</th>
                        <th className="p-4 text-center">Audio State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ghost/30">
                      {activeStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-navy/35 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <Avatar personaId={student.personaId} name={student.name} size="sm" />
                            <span className="text-xs font-bold text-[#F0F4FF]">{student.name}</span>
                          </td>
                          <td className="p-4 text-xs text-mist truncate max-w-[150px]">{student.roomName}</td>
                          <td className="p-4">
                            <Badge variant={student.role === 'SUPER' ? 'magenta' : student.role === 'PRO' ? 'violet' : 'cyan'} className="text-[10px] font-bold">
                              {student.role}
                            </Badge>
                          </td>
                          <td className="p-4 text-xs font-mono text-mist">{student.joinedDurationMin} mins</td>
                          <td className="p-4 text-xs font-mono text-cyan">{student.speakingTimeSec}s</td>
                          <td className="p-4 text-xs font-mono text-violet font-semibold">{student.pointsEarned} XP</td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-exo font-bold uppercase tracking-wider ${
                              student.status === 'active' ? 'bg-cyan/15 text-cyan border border-cyan/30' :
                              'bg-amber/15 text-amber border border-amber/30'
                            }`}>
                              {student.status === 'active' ? '🎙️ Speaking' : '🔇 Muted'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* Gifts Tab */}
          {activeTab === 'gifts' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-navy/20 border border-ghost rounded-2xl">
                  <h3 className="font-exo font-bold text-sm text-[#F0F4FF] flex items-center gap-2 mb-6 pb-2 border-b border-ghost/45">
                    <Gift className="w-4 h-4 text-magenta" /> Gift Valuation Matrix
                  </h3>
                  <div className="space-y-4">
                    {giftStats.map((gift) => {
                      const percent = Math.min(100, Math.round((gift.value / 1000) * 100));
                      return (
                        <div key={gift.type} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-exo">
                            <span className={`font-bold ${gift.color}`}>{gift.type}</span>
                            <span className="text-mist font-mono">{gift.count} tips (${gift.value} total)</span>
                          </div>
                          <div className="w-full h-2 rounded bg-navy/50 overflow-hidden border border-ghost/30">
                            <div
                              className="h-full bg-gradient-to-r from-magenta to-violet transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6 bg-navy/20 border border-ghost rounded-2xl">
                  <h3 className="font-exo font-bold text-sm text-[#F0F4FF] flex items-center gap-2 mb-6 pb-2 border-b border-ghost/45">
                    <Users className="w-4 h-4 text-cyan" /> Gift Contributors
                  </h3>
                  <div className="space-y-4">
                    {activeStudents.length === 0 ? (
                      <p className="text-xs text-mist/50 italic p-6 text-center">No active student logs.</p>
                    ) : (
                      activeStudents
                        .slice(0, 5)
                        .map((donor, idx) => (
                          <div key={donor.id} className="flex items-center justify-between p-3 rounded-xl bg-navy/40 border border-ghost/50">
                            <div className="flex items-center gap-3">
                              <div className="font-orbitron font-bold text-xs text-mist w-4">#{idx + 1}</div>
                              <Avatar personaId={donor.personaId} name={donor.name} size="sm" />
                              <div>
                                <p className="text-xs font-bold text-[#F0F4FF]">{donor.name}</p>
                                <Badge variant="cyan" className="text-[8px] font-bold mt-0.5">{donor.role}</Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-mono font-bold text-magenta">+{Math.floor(donor.pointsEarned / 10) + 1} tips</p>
                              <p className="text-[9px] text-mist font-exo">Sender</p>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Pinned Materials Tab */}
          {activeTab === 'materials' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 bg-navy/20 border border-ghost rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-mist uppercase font-exo tracking-wider">Total Materials Pinned</p>
                    <h3 className="font-orbitron font-black text-2xl text-[#F0F4FF] mt-1">{pinnedMaterials.length}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-cyan/10 border border-cyan/35 flex items-center justify-center">
                    <Pin className="w-5 h-5 text-cyan" />
                  </div>
                </div>

                <div className="p-5 bg-navy/20 border border-ghost rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-mist uppercase font-exo tracking-wider">Active Watchers</p>
                    <h3 className="font-orbitron font-black text-2xl text-[#F0F4FF] mt-1">{activeStudents.length}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-violet/10 border border-violet/35 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-violet" />
                  </div>
                </div>

                <div className="p-5 bg-navy/20 border border-ghost rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-mist uppercase font-exo tracking-wider">Virtual Classrooms</p>
                    <h3 className="font-orbitron font-black text-2xl text-[#F0F4FF] mt-1">{activeRooms.length}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-magenta/10 border border-magenta/35 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-magenta" />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-navy/20 border border-ghost rounded-2xl">
                <h3 className="font-exo font-bold text-sm text-[#F0F4FF] mb-4 pb-2 border-b border-ghost/45">Pinned PDF/Slide Material Feed</h3>
                {pinnedMaterials.length === 0 ? (
                  <p className="text-xs text-mist/50 italic p-8 text-center border border-dashed border-ghost rounded-xl">
                    No documents or learning materials have been pinned in active rooms yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pinnedMaterials.map((pin, idx) => (
                      <div key={`${pin.id}-${idx}`} className="p-4 rounded-xl bg-[#0c0c22] border border-ghost/50 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-cyan">{pin.title}</p>
                          <p className="text-[10px] text-mist font-inter mt-0.5">
                            Type: {pin.type} | Room: {pin.roomName}
                          </p>
                        </div>
                        <div className="text-right">
                          {pin.url.startsWith('/uploads/') ? (
                            <a
                              href={`${import.meta.env.VITE_NJS_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')}${pin.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-violet hover:text-cyan font-bold transition-colors"
                            >
                              📥 Download Asset
                            </a>
                          ) : (
                            <span className="text-xs text-mist font-mono truncate max-w-[200px] inline-block">{pin.url}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* History Tab — Persisted Study Sessions */}
          {activeTab === 'history' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Summary stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-5 flex items-center justify-between border border-ghost bg-navy/35">
                  <div>
                    <p className="text-xs font-bold text-mist uppercase font-exo tracking-wider">Total XP Earned</p>
                    <h3 className="font-orbitron font-black text-2xl mt-1 text-[#F0F4FF]">{totalXp.toLocaleString()}</h3>
                    <span className="text-[10px] text-violet flex items-center gap-1 mt-1 font-exo font-semibold">
                      <TrendingUp className="w-3 h-3" /> From speaking sessions
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-violet/10 flex items-center justify-center border border-violet/20">
                    <Award className="w-5 h-5 text-violet" />
                  </div>
                </div>

                <div className="card p-5 flex items-center justify-between border border-ghost bg-navy/35">
                  <div>
                    <p className="text-xs font-bold text-mist uppercase font-exo tracking-wider">Speaking Time</p>
                    <h3 className="font-orbitron font-black text-2xl mt-1 text-[#F0F4FF]">
                      {Math.floor(totalSpeakingSec / 3600)}h {Math.floor((totalSpeakingSec % 3600) / 60)}m
                    </h3>
                    <span className="text-[10px] text-cyan flex items-center gap-1 mt-1 font-exo font-semibold">
                      <Mic className="w-3 h-3" /> Total speaking practice
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-cyan/10 flex items-center justify-center border border-cyan/20">
                    <Clock className="w-5 h-5 text-cyan" />
                  </div>
                </div>

                <div className="card p-5 flex items-center justify-between border border-ghost bg-navy/35">
                  <div>
                    <p className="text-xs font-bold text-mist uppercase font-exo tracking-wider">Sessions Attended</p>
                    <h3 className="font-orbitron font-black text-2xl mt-1 text-[#F0F4FF]">{sessionHistory.length}</h3>
                    <span className="text-[10px] text-magenta flex items-center gap-1 mt-1 font-exo font-semibold">
                      <BookOpen className="w-3 h-3" /> Speaking rooms completed
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-magenta/10 flex items-center justify-center border border-magenta/20">
                    <Users className="w-5 h-5 text-magenta" />
                  </div>
                </div>
              </div>

              {/* Session history table */}
              <div className="bg-navy/20 border border-ghost rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-ghost flex items-center justify-between bg-navy/40">
                  <h3 className="font-exo font-bold text-sm text-[#F0F4FF] uppercase tracking-wider">Session History</h3>
                  <Badge variant="violet" className="font-bold">{sessionHistory.length} sessions</Badge>
                </div>
                {sessionHistory.length === 0 ? (
                  <p className="text-xs text-mist/50 italic p-12 text-center">
                    No completed sessions yet. Join a speaking room and start practicing to see your history here.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-ghost/60 bg-navy/45 text-mist text-[10px] uppercase font-exo tracking-wider">
                          <th className="p-4">Room</th>
                          <th className="p-4">Language</th>
                          <th className="p-4">Level</th>
                          <th className="p-4">Participants</th>
                          <th className="p-4">Session Duration</th>
                          <th className="p-4">Speaking Time</th>
                          <th className="p-4 text-right">XP Earned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ghost/30">
                        {sessionHistory.map((s) => (
                          <tr key={s.id} className="hover:bg-navy/35 transition-colors">
                            <td className="p-4 text-xs text-[#F0F4FF] font-semibold">{s.hostName}'s Room</td>
                            <td className="p-4"><Badge variant="cyan" className="text-[10px] font-bold">{s.language}</Badge></td>
                            <td className="p-4 text-xs text-mist">{s.levelName}</td>
                            <td className="p-4 text-xs text-mist">{s.totalParticipants}</td>
                            <td className="p-4 text-xs font-mono text-mist">
                              {Math.floor(s.totalDurationSec / 60)}m {s.totalDurationSec % 60}s
                            </td>
                            <td className="p-4 text-xs font-mono text-cyan">
                              {Math.floor(s.mySpeakingTimeSec / 60)}m {s.mySpeakingTimeSec % 60}s
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-xs font-mono font-bold text-violet">+{s.myXpEarned} XP</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
