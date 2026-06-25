// src/pages/LeaderboardPage.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { LeaderboardEntry } from '@/types/index';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.leaderboard()
      .then(r => setEntries(r.data))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-amber-400 to-yellow-600';
    if (rank === 2) return 'from-gray-300 to-gray-500';
    if (rank === 3) return 'from-orange-400 to-amber-600';
    return 'from-midnight to-navy';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-7 h-7 text-amber" />
          <h1 className="font-orbitron font-bold text-2xl text-[#F0F4FF]">Leaderboard</h1>
        </div>
        <p className="text-mist text-sm mb-8">Top mentors ranked by virtual gift value received</p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="card flex items-center gap-4">
                <div className="w-10 h-10 skeleton rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton w-32 rounded" />
                </div>
                <div className="h-5 skeleton w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-16 h-16 text-ghost mx-auto mb-4" />
            <h3 className="font-orbitron font-bold text-xl text-mist mb-2">No rankings yet</h3>
            <p className="text-sm text-mist/60">Be the first to receive gifts!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 0, 2].map(idx => {
                  const e = entries[idx];
                  if (!e) return null;
                  return (
                    <motion.div key={e.rank} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`card text-center py-6 ${idx === 0 ? 'order-2 ring-2 ring-amber/30' : ''}`}>
                      <div className="relative inline-block mb-3">
                        <Avatar personaId={e.personaId} name={e.displayName} size="xl" showBadge role={e.role} />
                        <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br ${getRankColor(e.rank)} flex items-center justify-center`}>
                          <span className="text-white font-orbitron font-black text-xs">
                            {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : '🥉'}
                          </span>
                        </div>
                      </div>
                      <p className="font-exo font-bold text-[#F0F4FF]">{e.displayName}</p>
                      <Badge variant={e.role === 'SUPER' ? 'magenta' : e.role === 'PRO' ? 'violet' : 'cyan'}>{e.role}</Badge>
                      <p className="text-amber font-mono font-bold text-lg mt-2">${e.totalReceived.toFixed(0)}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {entries.slice(3).map((e, i) => (
              <motion.div key={e.userId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (i + 3) * 0.05 }} className="card flex items-center gap-4 py-3">
                <div className="w-8 text-center">
                  <span className="font-mono font-bold text-mist">{e.rank}</span>
                </div>
                <Avatar personaId={e.personaId} name={e.displayName} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-exo font-semibold text-[#F0F4FF]">{e.displayName}</p>
                  <Badge variant={e.role === 'SUPER' ? 'magenta' : e.role === 'PRO' ? 'violet' : 'cyan'}>{e.role}</Badge>
                </div>
                <div className="flex items-center gap-1 text-amber">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="font-mono font-bold text-sm">${e.totalReceived.toFixed(0)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
