// src/pages/PodcastsPage.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic2, Play, Clock, Sparkles } from 'lucide-react';
import { podcastsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/Badge';
import { LANG_FLAGS } from '@/types/index';
import type { Podcast } from '@/types/index';

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    podcastsApi.all()
      .then(r => setPodcasts(r.data))
      .catch(() => setPodcasts([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative">
      <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.05),transparent_50%)] blur-[100px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-ghost/40">
          <div>
            <div className="flex items-center gap-2">
              <Mic2 className="w-6 h-6 text-cyan" />
              <h1 className="font-orbitron font-black text-3xl text-[#F0F4FF] tracking-wider">Podcast Archives</h1>
            </div>
            <p className="text-mist text-sm mt-1">Recorded educational content & speaking lobbies curated by Super hosts</p>
          </div>
          {user?.role === 'SUPER' && (
            <Badge variant="magenta" className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold shadow-[0_0_10px_rgba(255,0,245,0.2)]">
              <Sparkles className="w-3.5 h-3.5 animate-spin" /> Super Host Privilege Active
            </Badge>
          )}
        </div>

        {/* Podcast Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card space-y-4 bg-navy/20">
                <div className="h-36 skeleton rounded-xl bg-navy/30" />
                <div className="h-4 skeleton w-3/4 rounded" />
                <div className="h-3 skeleton w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : podcasts.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border border-ghost/40 max-w-md mx-auto">
            <Mic2 className="w-16 h-16 text-ghost/50 mx-auto mb-4" />
            <h3 className="font-orbitron font-bold text-xl text-[#F0F4FF] mb-2">No Podcasts Recorded</h3>
            <p className="text-sm text-mist">Lobbies hosted by Super members will appear here once saved.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {podcasts.map((podcast, i) => (
              <motion.div
                key={podcast.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card group cursor-pointer border border-ghost/50 hover:border-cyan/30 bg-navy/30 hover:scale-[1.02] transition-all duration-300"
              >
                {/* Image Cover/Gradient placeholder */}
                <div className="relative h-36 rounded-xl bg-gradient-to-br from-violet/30 to-cyan/30 mb-4 overflow-hidden shadow-inner">
                  <div className="absolute inset-0 flex items-center justify-center bg-void/25 group-hover:bg-void/40 transition-colors duration-300">
                    <div className="w-14 h-14 rounded-full glass border border-ghost/60 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-6 h-6 text-cyan ml-1 fill-current" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-void/70 rounded px-2.5 py-1 border border-ghost/40">
                    <Clock className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-[11px] text-white/80 font-mono font-bold">{formatDuration(podcast.durationSec)}</span>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant="cyan" className="text-[10px] font-bold py-0.5 px-2">
                      {LANG_FLAGS[podcast.language]} {podcast.language}
                    </Badge>
                  </div>
                </div>

                <h3 className="font-exo font-bold text-[#F0F4FF] text-base mb-1 line-clamp-2 leading-snug group-hover:text-cyan transition-colors">
                  {podcast.title}
                </h3>
                <p className="text-xs text-mist mb-4 font-inter">
                  Hosted by <strong className="text-violet font-semibold">{podcast.creatorName}</strong> • {podcast.levelName}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-ghost/40 text-xs text-mist font-mono">
                  <span>{podcast.listenCount} listens</span>
                  <span>{new Date(podcast.createdAt).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
