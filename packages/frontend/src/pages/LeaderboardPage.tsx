// src/pages/LeaderboardPage.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Sparkles, Medal } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { LeaderboardEntry } from '@/types/index';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.leaderboard()
      .then(r => {
        const mapped = (r.data || []).map((item: any, idx: number) => ({
          rank: idx + 1,
          userId: item.id,
          displayName: item.displayName,
          personaId: item.personaId,
          role: item.role,
          totalReceived: item.totalGiftsReceived || 0,
        }));
        setEntries(mapped);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const getRankGlow = (rank: number) => {
    if (rank === 1) return 'border-amber shadow-[0_0_20px_rgba(255,191,0,0.25)] ring-1 ring-amber/50';
    if (rank === 2) return 'border-slate-350 shadow-[0_0_15px_rgba(200,200,200,0.15)] ring-1 ring-slate-350/40';
    if (rank === 3) return 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/40';
    return 'border-ghost/50';
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'bg-amber text-void font-bold shadow-[0_0_10px_rgba(255,191,0,0.4)]';
    if (rank === 2) return 'bg-slate-400 text-void font-bold';
    if (rank === 3) return 'bg-orange-500 text-[#F0F4FF] font-bold';
    return 'bg-[#15152a] text-mist';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      <div className="absolute top-[5%] right-[5%] w-[40%] h-[40%] bg-[radial-gradient(circle_at_center,rgba(255,191,0,0.06),transparent_50%)] blur-[90px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header Block */}
        <div className="flex items-center gap-3.5 mb-2">
          <Trophy className="w-8 h-8 text-amber animate-bounce" />
          <h1 className="font-orbitron font-black text-3xl text-[#F0F4FF] tracking-wider">Hall of Mentors</h1>
        </div>
        <p className="text-mist text-sm mb-10">Top speakers ranked by virtual gift tips received inside Speaking Lobbies</p>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map(i => <div key={i} className="h-44 skeleton rounded-2xl bg-navy/30" />)}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 skeleton rounded-xl bg-navy/30" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border border-ghost/40">
            <Trophy className="w-16 h-16 text-ghost/50 mx-auto mb-4" />
            <h3 className="font-orbitron font-bold text-xl text-[#F0F4FF] mb-2">No active rankings</h3>
            <p className="text-sm text-mist max-w-xs mx-auto">Receive tips from students inside Speaking Rooms to earn your place on the leaderboard!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Podium for top 3 */}
            {entries.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 items-end mb-8 pt-4">
                {/* 2nd place */}
                {entries[1] && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className={`card py-6 text-center order-1 bg-navy/40 flex flex-col items-center relative ${getRankGlow(2)}`}
                  >
                    <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                      <Medal className="w-3.5 h-3.5 text-slate-400" /> #2
                    </div>
                    <div className="relative inline-block mb-3 mt-2">
                      <Avatar personaId={entries[1].personaId} name={entries[1].displayName} size="xl" role={entries[1].role} />
                    </div>
                    <p className="font-exo font-bold text-sm text-[#F0F4FF] line-clamp-1 mb-1">{entries[1].displayName}</p>
                    <Badge variant={entries[1].role === 'SUPER' ? 'magenta' : entries[1].role === 'PRO' ? 'violet' : 'cyan'} className="text-[10px]">
                      {entries[1].role}
                    </Badge>
                    <p className="text-slate-400 font-mono font-bold text-lg mt-3">${entries[1].totalReceived.toFixed(0)}</p>
                  </motion.div>
                )}

                {/* 1st place */}
                {entries[0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className={`card py-8 text-center order-2 bg-navy/60 flex flex-col items-center relative scale-[1.05] ${getRankGlow(1)}`}
                  >
                    <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] text-amber font-bold uppercase">
                      <Sparkles className="w-3.5 h-3.5 text-amber animate-spin" /> Champion
                    </div>
                    <div className="relative inline-block mb-3 mt-1">
                      <Avatar personaId={entries[0].personaId} name={entries[0].displayName} size="xl" role={entries[0].role} />
                      <div className="absolute -top-3.5 -right-3.5 w-8 h-8 rounded-full bg-amber/15 border border-amber flex items-center justify-center shadow-lg">
                        <span className="text-base">👑</span>
                      </div>
                    </div>
                    <p className="font-exo font-bold text-base text-[#F0F4FF] line-clamp-1 mb-1">{entries[0].displayName}</p>
                    <Badge variant={entries[0].role === 'SUPER' ? 'magenta' : entries[0].role === 'PRO' ? 'violet' : 'cyan'} className="text-[10px]">
                      {entries[0].role}
                    </Badge>
                    <p className="text-amber font-mono font-bold text-xl mt-3">${entries[0].totalReceived.toFixed(0)}</p>
                  </motion.div>
                )}

                {/* 3rd place */}
                {entries[2] && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className={`card py-6 text-center order-3 bg-navy/40 flex flex-col items-center relative ${getRankGlow(3)}`}
                  >
                    <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] text-orange-500 font-bold uppercase">
                      <Medal className="w-3.5 h-3.5 text-orange-500" /> #3
                    </div>
                    <div className="relative inline-block mb-3 mt-2">
                      <Avatar personaId={entries[2].personaId} name={entries[2].displayName} size="xl" role={entries[2].role} />
                    </div>
                    <p className="font-exo font-bold text-sm text-[#F0F4FF] line-clamp-1 mb-1">{entries[2].displayName}</p>
                    <Badge variant={entries[2].role === 'SUPER' ? 'magenta' : entries[2].role === 'PRO' ? 'violet' : 'cyan'} className="text-[10px]">
                      {entries[2].role}
                    </Badge>
                    <p className="text-orange-500 font-mono font-bold text-lg mt-3">${entries[2].totalReceived.toFixed(0)}</p>
                  </motion.div>
                )}
              </div>
            )}

            {/* List for the rest */}
            <div className="space-y-2">
              {entries.slice(entries.length >= 3 ? 3 : 0).map((e, i) => (
                <motion.div
                  key={e.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card flex items-center justify-between py-3.5 bg-navy/20 border-ghost/40 hover:border-ghost transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-orbitron font-bold text-xs ${getRankBadgeClass(e.rank)}`}>
                      {e.rank}
                    </div>
                    <Avatar personaId={e.personaId} name={e.displayName} size="sm" />
                    <div>
                      <p className="text-sm font-exo font-semibold text-[#F0F4FF]">{e.displayName}</p>
                      <div className="mt-0.5">
                        <Badge variant={e.role === 'SUPER' ? 'magenta' : e.role === 'PRO' ? 'violet' : 'cyan'} className="text-[9px] px-1.5 py-0">
                          {e.role}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-amber">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-mono font-bold text-sm">${e.totalReceived.toFixed(0)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
