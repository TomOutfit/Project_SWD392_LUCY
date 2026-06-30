// src/pages/DashboardPage.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Mic, Gift, Pin, Clock, ArrowUpRight, Award, BarChart2, Shield, Eye } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { roomsApi } from '@/lib/api';
import { Room } from '@/types/index';

const giftStats = [
  { type: 'Crown 👑', count: 4, value: 400, color: 'text-amber' },
  { type: 'Rocket 🚀', count: 8, value: 200, color: 'text-magenta' },
  { type: 'Diamond 💎', count: 15, value: 750, color: 'text-cyan' },
  { type: 'Star ⭐', count: 32, value: 320, color: 'text-yellow-400' },
  { type: 'Heart ❤️', count: 64, value: 320, color: 'text-red-500' },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'gifts' | 'materials'>('overview');
  const [activeRooms, setActiveRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

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

  // Filter based on selected room
  const selectedRooms = selectedRoomId === 'all'
    ? activeRooms
    : activeRooms.filter(r => r.id === selectedRoomId);

  const activeStudents = selectedRooms.flatMap(room =>
    (room.participants || []).map(p => ({
      id: p.oderId,
      name: p.oderName,
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
  const totalGifts = activeRooms.reduce((acc, r) => acc + ((r.participants || []).length > 0 ? 5 : 0), 0);
  const averageEngagement = activeStudents.length > 0
    ? Math.round(activeStudents.reduce((acc, curr) => acc + curr.joinedDurationMin, 0) / activeStudents.length)
    : 0;

  const pinnedMaterials = activeRooms
    .filter(r => r.pinnedContent !== null)
    .map(r => ({
      roomName: r.name,
      ...r.pinnedContent!,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-[#F0F4FF] min-h-[calc(100vh-3.5rem)]">
      {/* Background decoration */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-violet/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-orbitron font-extrabold text-3xl tracking-tight bg-gradient-to-r from-cyan to-violet bg-clip-text text-transparent">
            Student Management Dashboard
          </h1>
          <p className="text-xs text-mist font-exo mt-1">
            Real-time learner insights, voice statistics, and level transition engagement trackers.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#161633] p-1 rounded-xl border border-ghost">
          {(['overview', 'students', 'gifts', 'materials'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-exo font-semibold capitalize transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-cyan/20 to-violet/20 border border-cyan/40 text-cyan'
                  : 'text-mist hover:text-[#F0F4FF] border border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Room Selector if rooms exist */}
      {activeRooms.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 bg-[#11112A] p-3 rounded-2xl border border-ghost">
          <span className="text-xs font-exo text-mist font-bold uppercase tracking-wider">Select Classroom:</span>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="bg-navy border border-ghost text-xs text-[#F0F4FF] rounded-lg px-3 py-1.5 focus:border-cyan outline-none transition-all cursor-pointer"
          >
            <option value="all">All Rooms ({activeRooms.length})</option>
            {activeRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} ({room.levelName})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Empty State */}
      {activeRooms.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center p-16 text-center glass border border-ghost rounded-3xl relative overflow-hidden mt-6">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-cyan/10 rounded-full blur-[50px] animate-pulse" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-violet/10 rounded-full blur-[50px] animate-pulse" />
          <span className="text-6xl mb-4">🎙️</span>
          <h2 className="font-orbitron font-extrabold text-xl text-[#F0F4FF] mb-2">No Active Speaking Rooms</h2>
          <p className="text-sm text-mist max-w-md mb-6 leading-relaxed">
            There are currently no active speaking sessions. Real-time statistics, speaking duration counters, and pinned documents will appear once a classroom is started.
          </p>
          <a
            href="/create-room"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan to-violet text-white text-xs font-exo font-bold hover:brightness-110 transition-all shadow-cyan"
          >
            Create a New Room
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

      {!loading && activeRooms.length > 0 && (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 flex items-center justify-between bg-navy/40 backdrop-blur-md border border-ghost hover:border-cyan/50 transition-all duration-300 rounded-2xl">
                  <div>
                    <p className="text-xs font-semibold text-mist uppercase font-exo">Total Active Students</p>
                    <h3 className="font-orbitron font-bold text-2xl mt-1 text-[#F0F4FF]">{activeStudents.length}</h3>
                    <span className="text-[10px] text-cyan flex items-center gap-1 mt-1 font-exo">
                      Live speaking room <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-cyan/10 flex items-center justify-center border border-cyan/20">
                    <Users className="w-5 h-5 text-cyan" />
                  </div>
                </div>

                <div className="p-5 flex items-center justify-between bg-navy/40 backdrop-blur-md border border-ghost hover:border-violet/50 transition-all duration-300 rounded-2xl">
                  <div>
                    <p className="text-xs font-semibold text-mist uppercase font-exo">Total Speaking Time</p>
                    <h3 className="font-orbitron font-bold text-2xl mt-1 text-[#F0F4FF]">{Math.floor(totalSpeakingTime / 60)}m {totalSpeakingTime % 60}s</h3>
                    <span className="text-[10px] text-violet flex items-center gap-1 mt-1 font-exo">
                      Total student audio streams <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-violet/10 flex items-center justify-center border border-violet/20">
                    <Mic className="w-5 h-5 text-violet" />
                  </div>
                </div>

                <div className="p-5 flex items-center justify-between bg-navy/40 backdrop-blur-md border border-ghost hover:border-magenta/50 transition-all duration-300 rounded-2xl">
                  <div>
                    <p className="text-xs font-semibold text-mist uppercase font-exo">Gifts Contributed</p>
                    <h3 className="font-orbitron font-bold text-2xl mt-1 text-[#F0F4FF]">{totalGifts}</h3>
                    <span className="text-[10px] text-magenta flex items-center gap-1 mt-1 font-exo">
                      From active listeners <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-magenta/10 flex items-center justify-center border border-magenta/20">
                    <Gift className="w-5 h-5 text-magenta" />
                  </div>
                </div>

                <div className="p-5 flex items-center justify-between bg-navy/40 backdrop-blur-md border border-ghost hover:border-amber/50 transition-all duration-300 rounded-2xl">
                  <div>
                    <p className="text-xs font-semibold text-mist uppercase font-exo">Avg. Attendance Time</p>
                    <h3 className="font-orbitron font-bold text-2xl mt-1 text-[#F0F4FF]">{averageEngagement} mins</h3>
                    <span className="text-[10px] text-amber flex items-center gap-1 mt-1 font-exo">
                      Across all sessions <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber/10 flex items-center justify-center border border-amber/20">
                    <Clock className="w-5 h-5 text-amber" />
                  </div>
                </div>
              </div>

              {/* Quick Analytics & Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 bg-navy/30 border border-ghost flex flex-col justify-between rounded-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-exo font-bold text-sm text-[#F0F4FF] flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-cyan" /> Voice Engagement & Speaking Performance
                      </h3>
                      <span className="text-[10px] text-mist">Live updates</span>
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
                                  <Shield className="w-3 h-3 text-cyan" /> {s.name} ({s.role}) <span className="text-[9px] text-mist/50">· {s.roomName}</span>
                                </span>
                                <span className="font-semibold">{s.speakingTimeSec}s speaking time</span>
                              </div>
                              <div className="w-full h-2 rounded bg-[#161633] overflow-hidden">
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

                <div className="p-6 bg-navy/30 border border-ghost rounded-2xl">
                  <h3 className="font-exo font-bold text-sm text-[#F0F4FF] flex items-center gap-2 mb-4">
                    <Award className="w-4 h-4 text-magenta" /> Top Engaged Students
                  </h3>
                  {activeStudents.length === 0 ? (
                    <p className="text-xs text-mist/50 italic p-6 text-center">No active students.</p>
                  ) : (
                    <div className="space-y-3">
                      {activeStudents
                        .sort((a, b) => b.pointsEarned - a.pointsEarned)
                        .slice(0, 3)
                        .map((s, idx) => (
                          <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-navy/55 border border-ghost/40">
                            <div className="font-orbitron font-bold text-xs text-cyan w-4">#{idx + 1}</div>
                            <Avatar personaId={s.personaId} name={s.name} size="sm" showBadge role={s.role} />
                            <div className="flex-1 truncate">
                              <p className="text-xs font-semibold text-[#F0F4FF] truncate">{s.name}</p>
                              <p className="text-[10px] text-mist">{s.pointsEarned} XP earned</p>
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
              className="bg-navy/20 border border-ghost rounded-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-ghost flex items-center justify-between">
                <h3 className="font-exo font-bold text-sm text-[#F0F4FF]">Student Directory & Participation Logs</h3>
                <Badge variant="cyan">{activeStudents.length} Students Active</Badge>
              </div>
              {activeStudents.length === 0 ? (
                <p className="text-xs text-mist/50 italic p-12 text-center">No students currently active in the selected room.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-ghost/60 bg-navy/30 text-mist text-[10px] uppercase font-exo tracking-wider">
                        <th className="p-4">Student</th>
                        <th className="p-4">Room</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Duration</th>
                        <th className="p-4">Speaking Time</th>
                        <th className="p-4">XP Points</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ghost/30">
                      {activeStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-navy/40 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <Avatar personaId={student.personaId} name={student.name} size="sm" />
                            <span className="text-xs font-semibold text-[#F0F4FF]">{student.name}</span>
                          </td>
                          <td className="p-4 text-xs text-mist truncate max-w-[120px]">{student.roomName}</td>
                          <td className="p-4">
                            <Badge variant={student.role === 'SUPER' ? 'magenta' : student.role === 'PRO' ? 'violet' : 'cyan'}>
                              {student.role}
                            </Badge>
                          </td>
                          <td className="p-4 text-xs font-mono">{student.joinedDurationMin} mins</td>
                          <td className="p-4 text-xs font-mono">{student.speakingTimeSec}s</td>
                          <td className="p-4 text-xs font-mono text-cyan">{student.pointsEarned} XP</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              student.status === 'active' ? 'bg-cyan/10 text-cyan border border-cyan/20' :
                              student.status === 'muted' ? 'bg-amber/10 text-amber border border-amber/20' :
                              'bg-mist/10 text-mist border border-ghost'
                            }`}>
                              {student.status}
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
                <div className="p-6 bg-navy/30 border border-ghost rounded-2xl">
                  <h3 className="font-exo font-bold text-sm text-[#F0F4FF] flex items-center gap-2 mb-6">
                    <Gift className="w-4 h-4 text-magenta" /> Virtual Gift Contribution Breakdown
                  </h3>
                  <div className="space-y-4">
                    {giftStats.map((gift) => {
                      const percent = Math.min(100, Math.round((gift.value / 2000) * 100));
                      return (
                        <div key={gift.type} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-semibold ${gift.color}`}>{gift.type}</span>
                            <span className="text-mist">{gift.count} received (${gift.value} value)</span>
                          </div>
                          <div className="w-full h-2 rounded bg-[#161633] overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-magenta to-violet transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6 bg-navy/30 border border-ghost rounded-2xl">
                  <h3 className="font-exo font-bold text-sm text-[#F0F4FF] flex items-center gap-2 mb-6">
                    <Users className="w-4 h-4 text-cyan" /> Gift Donors Leaderboard
                  </h3>
                  <div className="space-y-4">
                    {activeStudents.length === 0 ? (
                      <p className="text-xs text-mist/50 italic p-6 text-center">No current session donors.</p>
                    ) : (
                      activeStudents
                        .slice(0, 5)
                        .map((donor, idx) => (
                          <div key={donor.id} className="flex items-center justify-between p-3 rounded-lg bg-navy/40 border border-ghost/40">
                            <div className="flex items-center gap-3">
                              <div className="font-orbitron font-bold text-xs text-mist w-4">#{idx + 1}</div>
                              <Avatar personaId={donor.personaId} name={donor.name} size="sm" />
                              <div>
                                <p className="text-xs font-semibold text-[#F0F4FF]">{donor.name}</p>
                                <Badge variant="violet" className="text-[8px]">{donor.role}</Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-mono font-bold text-magenta">{Math.floor(donor.pointsEarned / 10) + 1} gifts</p>
                              <p className="text-[9px] text-mist">Support Sponsor</p>
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
                <div className="p-5 bg-navy/30 border border-ghost rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-mist uppercase font-exo">Total Materials Pinned</p>
                    <Pin className="w-4 h-4 text-cyan" />
                  </div>
                  <h3 className="font-orbitron font-bold text-2xl text-[#F0F4FF]">{pinnedMaterials.length}</h3>
                  <p className="text-[10px] text-mist mt-1">Across active speak sessions</p>
                </div>

                <div className="p-5 bg-navy/30 border border-ghost rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-mist uppercase font-exo">Active Students Tracking</p>
                    <Eye className="w-4 h-4 text-violet" />
                  </div>
                  <h3 className="font-orbitron font-bold text-2xl text-[#F0F4FF]">{activeStudents.length}</h3>
                  <p className="text-[10px] text-cyan mt-1">Live active connections</p>
                </div>

                <div className="p-5 bg-navy/30 border border-ghost rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-mist uppercase font-exo">Total Classrooms</p>
                    <Clock className="w-4 h-4 text-magenta" />
                  </div>
                  <h3 className="font-orbitron font-bold text-2xl text-[#F0F4FF]">{activeRooms.length}</h3>
                  <p className="text-[10px] text-mist mt-1">Active microservice room counts</p>
                </div>
              </div>

              <div className="p-6 bg-navy/30 border border-ghost rounded-2xl">
                <h3 className="font-exo font-bold text-sm text-[#F0F4FF] mb-4">Live Pinned Learning Materials</h3>
                {pinnedMaterials.length === 0 ? (
                  <p className="text-xs text-mist/50 italic p-6 text-center border border-dashed border-ghost rounded-lg">
                    No documents or learning materials have been pinned in active rooms yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {pinnedMaterials.map((pin, idx) => (
                      <div key={`${pin.id}-${idx}`} className="p-3 rounded-lg bg-navy border border-ghost flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-cyan">{pin.title}</p>
                          <p className="text-[10px] text-mist mt-0.5">
                            Type: {pin.type} | Room: {pin.roomName}
                          </p>
                        </div>
                        <div className="text-right">
                          {pin.url.startsWith('/uploads/') ? (
                            <a
                              href={`${import.meta.env.VITE_NJS_URL || 'http://localhost:3001'}${pin.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-violet hover:text-cyan hover:underline font-bold"
                            >
                              📥 Download File
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
        </>
      )}
    </div>
  );
}
