// src/pages/DashboardPage.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Mic, Gift, Pin, Clock, ArrowUpRight, Award, BarChart2, Shield, Eye } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

interface StudentData {
  id: number;
  name: string;
  role: 'LUCY' | 'PRO' | 'SUPER';
  personaId: number;
  joinedDurationMin: number;
  speakingTimeSec: number;
  status: 'active' | 'muted' | 'offline';
  giftsSent: number;
  pointsEarned: number;
}

const mockStudents: StudentData[] = [
  { id: 101, name: 'Alex Johnson', role: 'LUCY', personaId: 1, joinedDurationMin: 45, speakingTimeSec: 120, status: 'active', giftsSent: 3, pointsEarned: 240 },
  { id: 102, name: 'Minh Nguyen', role: 'PRO', personaId: 2, joinedDurationMin: 50, speakingTimeSec: 280, status: 'muted', giftsSent: 8, pointsEarned: 450 },
  { id: 103, name: 'Yuki Sato', role: 'LUCY', personaId: 3, joinedDurationMin: 35, speakingTimeSec: 80, status: 'active', giftsSent: 0, pointsEarned: 110 },
  { id: 104, name: 'Emma Watson', role: 'SUPER', personaId: 4, joinedDurationMin: 55, speakingTimeSec: 420, status: 'active', giftsSent: 12, pointsEarned: 780 },
  { id: 105, name: 'Carlos Gomez', role: 'LUCY', personaId: 5, joinedDurationMin: 12, speakingTimeSec: 15, status: 'offline', giftsSent: 1, pointsEarned: 45 },
];

const giftStats = [
  { type: 'Crown 👑', count: 4, value: 400, color: 'text-amber' },
  { type: 'Rocket 🚀', count: 8, value: 200, color: 'text-magenta' },
  { type: 'Diamond 💎', count: 15, value: 750, color: 'text-cyan' },
  { type: 'Star ⭐', count: 32, value: 320, color: 'text-yellow-400' },
  { type: 'Heart ❤️', count: 64, value: 320, color: 'text-red-500' },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'gifts' | 'materials'>('overview');

  const totalSpeakingTime = mockStudents.reduce((acc, curr) => acc + curr.speakingTimeSec, 0);
  const totalGifts = mockStudents.reduce((acc, curr) => acc + curr.giftsSent, 0);
  const averageEngagement = Math.round(mockStudents.reduce((acc, curr) => acc + curr.joinedDurationMin, 0) / mockStudents.length);

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

      {/* Overview Cards */}
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
                <h3 className="font-orbitron font-bold text-2xl mt-1 text-[#F0F4FF]">{mockStudents.filter(s => s.status !== 'offline').length} / {mockStudents.length}</h3>
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

          {/* Quick Analytics & Charts Mock */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 bg-navy/30 border border-ghost flex flex-col justify-between rounded-2xl">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-exo font-bold text-sm text-[#F0F4FF] flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-cyan" /> Voice Engagement & Speaking Performance
                  </h3>
                  <span className="text-[10px] text-mist">Updated 1m ago</span>
                </div>
                <div className="space-y-4">
                  {mockStudents.map((s) => {
                    const percentage = Math.min(100, Math.round((s.speakingTimeSec / 500) * 100));
                    return (
                      <div key={s.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-mist flex items-center gap-1.5">
                            <Shield className="w-3 h-3 text-cyan" /> {s.name} ({s.role})
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
              </div>
            </div>

            <div className="p-6 bg-navy/30 border border-ghost rounded-2xl">
              <h3 className="font-exo font-bold text-sm text-[#F0F4FF] flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-magenta" /> Top Engaged Students
              </h3>
              <div className="space-y-3">
                {mockStudents
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
            <Badge variant="cyan">{mockStudents.length} Students Total</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ghost/60 bg-navy/30 text-mist text-[10px] uppercase font-exo tracking-wider">
                  <th className="p-4">Student</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Speaking Time</th>
                  <th className="p-4">XP Points</th>
                  <th className="p-4">Gifts Sent</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ghost/30">
                {mockStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-navy/40 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <Avatar personaId={student.personaId} name={student.name} size="sm" />
                      <span className="text-xs font-semibold text-[#F0F4FF]">{student.name}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant={student.role === 'SUPER' ? 'magenta' : student.role === 'PRO' ? 'violet' : 'cyan'}>
                        {student.role}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs font-mono">{student.joinedDurationMin} mins</td>
                    <td className="p-4 text-xs font-mono">{student.speakingTimeSec}s</td>
                    <td className="p-4 text-xs font-mono text-cyan">{student.pointsEarned} XP</td>
                    <td className="p-4 text-xs font-mono text-magenta">{student.giftsSent}</td>
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
        </motion.div>
      )}

      {/* Gifts Analytics Tab */}
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
                {mockStudents
                  .filter(s => s.giftsSent > 0)
                  .sort((a, b) => b.giftsSent - a.giftsSent)
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
                        <p className="text-xs font-mono font-bold text-magenta">{donor.giftsSent} gifts</p>
                        <p className="text-[9px] text-mist">Support Sponsor</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pinned Materials & Content Tab */}
      {activeTab === 'materials' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-navy/30 border border-ghost rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-mist uppercase font-exo">Total Documents Pinned</p>
                <Pin className="w-4 h-4 text-cyan" />
              </div>
              <h3 className="font-orbitron font-bold text-2xl text-[#F0F4FF]">14</h3>
              <p className="text-[10px] text-mist mt-1">Across beginner & intermediate sublevels</p>
            </div>

            <div className="p-5 bg-navy/30 border border-ghost rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-mist uppercase font-exo">Student View Count</p>
                <Eye className="w-4 h-4 text-violet" />
              </div>
              <h3 className="font-orbitron font-bold text-2xl text-[#F0F4FF]">156 views</h3>
              <p className="text-[10px] text-cyan mt-1">87% completion / download rate</p>
            </div>

            <div className="p-5 bg-navy/30 border border-ghost rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-mist uppercase font-exo">Avg. Pin Duration</p>
                <Clock className="w-4 h-4 text-magenta" />
              </div>
              <h3 className="font-orbitron font-bold text-2xl text-[#F0F4FF]">8m 45s</h3>
              <p className="text-[10px] text-mist mt-1">Aligned with auto-stage progressions</p>
            </div>
          </div>

          <div className="p-6 bg-navy/30 border border-ghost rounded-2xl">
            <h3 className="font-exo font-bold text-sm text-[#F0F4FF] mb-4">Pinned Learning Materials Statistics</h3>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-navy border border-ghost flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-cyan">Vocabulary - Beginner Level 1 (Greetings)</p>
                  <p className="text-[10px] text-mist mt-0.5">Type: vocabulary | Pinned by: Professor LUCY</p>
                </div>
                <div className="text-right">
                  <Badge variant="cyan">45 Views</Badge>
                  <p className="text-[9px] text-mist mt-1">Pinned for 10m 00s</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-navy border border-ghost flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-cyan">Discussion Prompt - Level 2 (Order Food)</p>
                  <p className="text-[10px] text-mist mt-0.5">Type: conversation | Pinned by: Professor LUCY</p>
                </div>
                <div className="text-right">
                  <Badge variant="cyan">32 Views</Badge>
                  <p className="text-[9px] text-mist mt-1">Pinned for 9m 12s</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#141430] border border-ghost/40 flex items-center justify-between opacity-60">
                <div>
                  <p className="text-xs font-semibold text-mist">Grammar Pattern - Level 3 (Basic Verbs)</p>
                  <p className="text-[10px] text-mist mt-0.5">Type: grammar | Pinned by: Professor LUCY</p>
                </div>
                <div className="text-right">
                  <Badge variant="cyan" className="opacity-60">18 Views</Badge>
                  <p className="text-[9px] text-mist mt-1">Pinned for 6m 45s</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
