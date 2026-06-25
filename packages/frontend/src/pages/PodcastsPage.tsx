// src/pages/PodcastsPage.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic2, Play, Clock } from 'lucide-react';
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
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-orbitron font-bold text-2xl text-[#F0F4FF]">Podcasts</h1>
            <p className="text-mist text-sm mt-1">Recorded sessions from LUCY Super creators</p>
          </div>
          {user?.role === 'SUPER' && (
            <Badge variant="magenta">🎙️ Record in any room</Badge>
          )}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card space-y-3">
                <div className="h-32 skeleton rounded-xl" />
                <div className="h-4 skeleton w-3/4 rounded" />
                <div className="h-3 skeleton w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : podcasts.length === 0 ? (
          <div className="text-center py-20">
            <Mic2 className="w-16 h-16 text-ghost mx-auto mb-4" />
            <h3 className="font-orbitron font-bold text-xl text-mist mb-2">No Podcasts Yet</h3>
            <p className="text-sm text-mist/60">LUCY Super hosts will record sessions here</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {podcasts.map((podcast, i) => (
              <motion.div key={podcast.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }} className="card group cursor-pointer">
                <div className="relative h-32 rounded-xl bg-gradient-to-br from-violet-600/40 to-cyan-600/40 mb-4 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full glass flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-cyan ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 rounded px-2 py-0.5">
                    <Clock className="w-3 h-3 text-white/70" />
                    <span className="text-xs text-white/70 font-mono">{formatDuration(podcast.durationSec)}</span>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant="cyan">{LANG_FLAGS[podcast.language]}</Badge>
                  </div>
                </div>

                <h3 className="font-exo font-bold text-[#F0F4FF] text-sm mb-1 line-clamp-2">{podcast.title}</h3>
                <p className="text-xs text-mist mb-2">{podcast.creatorName} · {podcast.levelName}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-mist">{podcast.listenCount} plays</span>
                  <span className="text-xs text-mist">{new Date(podcast.createdAt).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
