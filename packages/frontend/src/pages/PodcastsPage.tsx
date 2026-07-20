// src/pages/PodcastsPage.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic2, Play, Pause, Clock, Sparkles, Volume2, VolumeX, X, Radio } from 'lucide-react';
import { podcastsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/Badge';
import { LANG_FLAGS } from '@/types/index';
import type { Podcast } from '@/types/index';

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Audio player state
  const [activePodcast, setActivePodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (user && user.role === 'LUCY') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    podcastsApi.all()
      .then(r => setPodcasts(r.data))
      .catch(() => setPodcasts([]))
      .finally(() => setLoading(false));
  }, []);

  // Handle active audio source loading
  useEffect(() => {
    if (!audioRef.current) return;

    if (activePodcast) {
      const audioUrl = activePodcast.fileUrl.startsWith('http')
        ? activePodcast.fileUrl
        : `${import.meta.env.VITE_NJS_URL || ''}${activePodcast.fileUrl}`;
      
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.warn('[PodcastsPage] Playback failed or interrupted:', err);
          setIsPlaying(false);
        });
    } else {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsPlaying(false);
    }
  }, [activePodcast]);

  const handlePlayPodcast = async (podcast: Podcast) => {
    if (activePodcast?.id === podcast.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play()
          .then(() => setIsPlaying(true))
          .catch(console.error);
      }
      return;
    }

    setActivePodcast(podcast);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(podcast.durationSec || 0);

    // Call API to register list count increment
    try {
      await podcastsApi.listen(podcast.id);
      setPodcasts(prev =>
        prev.map(p => p.id === podcast.id ? { ...p, listenCount: (p.listenCount || 0) + 1 } : p)
      );
    } catch (err) {
      console.warn('[PodcastsPage] Failed to log listen event:', err);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || activePodcast?.durationSec || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (val: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      audioRef.current.muted = nextMute;
    }
  };

  const formatDuration = (sec: number) => {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative pb-32">
      <style>{`
        @keyframes bounce-bar {
          0%, 100% { height: 4px; }
          50% { height: 18px; }
        }
        .audio-bar-1 { animation: bounce-bar 0.7s ease-in-out infinite; }
        .audio-bar-2 { animation: bounce-bar 0.7s ease-in-out infinite 0.15s; }
        .audio-bar-3 { animation: bounce-bar 0.7s ease-in-out infinite 0.3s; }
        .audio-bar-4 { animation: bounce-bar 0.7s ease-in-out infinite 0.45s; }
      `}</style>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

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
            {podcasts.map((podcast, i) => {
              const isActive = activePodcast?.id === podcast.id;
              return (
                <motion.div
                  key={podcast.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handlePlayPodcast(podcast)}
                  className={`card group cursor-pointer border hover:scale-[1.02] transition-all duration-300 ${
                    isActive
                      ? 'border-cyan bg-cyan/5 shadow-[0_0_20px_rgba(0,245,255,0.15)]'
                      : 'border-ghost/50 hover:border-cyan/30 bg-navy/30'
                  }`}
                >
                  {/* Image Cover/Gradient placeholder */}
                  <div className="relative h-36 rounded-xl bg-gradient-to-br from-violet/20 to-cyan/20 mb-4 overflow-hidden shadow-inner">
                    <div className="absolute inset-0 flex items-center justify-center bg-void/25 group-hover:bg-void/40 transition-colors duration-300">
                      <div className={`w-14 h-14 rounded-full glass border flex items-center justify-center shadow-lg transition-transform duration-300 ${
                        isActive ? 'border-cyan scale-105' : 'border-ghost/60 group-hover:scale-110'
                      }`}>
                        {isActive && isPlaying ? (
                          <Pause className="w-6 h-6 text-cyan fill-current" />
                        ) : (
                          <Play className="w-6 h-6 text-cyan ml-1 fill-current" />
                        )}
                      </div>
                    </div>
                    {isActive && isPlaying && (
                      <div className="absolute bottom-2 left-3 flex items-end gap-0.5 h-6">
                        <span className="w-1 bg-cyan rounded-full audio-bar-1" />
                        <span className="w-1 bg-cyan rounded-full audio-bar-2" />
                        <span className="w-1 bg-cyan rounded-full audio-bar-3" />
                        <span className="w-1 bg-cyan rounded-full audio-bar-4" />
                      </div>
                    )}
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

                  <h3 className={`font-exo font-bold text-base mb-1 line-clamp-2 leading-snug transition-colors ${
                    isActive ? 'text-cyan' : 'text-[#F0F4FF] group-hover:text-cyan'
                  }`}>
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
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Floating Audio Player Control Panel */}
      <AnimatePresence>
        {activePodcast && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:w-[680px] md:-translate-x-1/2 z-50 rounded-2xl glass border border-cyan/40 bg-[#0C0C1E]/95 shadow-[0_10px_30px_rgba(0,245,255,0.15)] p-4 flex flex-col md:flex-row items-center gap-4"
          >
            {/* Title & Info */}
            <div className="flex items-center gap-3 w-full md:w-auto md:min-w-[180px] md:max-w-[220px]">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan/30 to-violet/30 flex items-center justify-center relative flex-shrink-0">
                <Radio className={`w-5 h-5 text-cyan ${isPlaying ? 'animate-pulse' : ''}`} />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-exo font-bold text-[#F0F4FF] truncate leading-tight">{activePodcast.title}</h4>
                <p className="text-[10px] text-mist truncate">By {activePodcast.creatorName}</p>
              </div>
            </div>

            {/* Play controls and progress */}
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsPlaying(prev => {
                    if (prev) audioRef.current?.pause();
                    else audioRef.current?.play().catch(console.error);
                    return !prev;
                  })}
                  className="w-8 h-8 rounded-full bg-cyan text-void hover:bg-cyan-300 active:scale-95 transition-all flex items-center justify-center"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
              </div>

              {/* Progress Slider */}
              <div className="flex items-center gap-2 text-[10px] font-mono text-mist">
                <span>{formatDuration(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan bg-ghost/40 h-1 rounded-lg cursor-pointer outline-none transition-all hover:h-1.5"
                />
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Volume controls & close */}
            <div className="flex items-center justify-between w-full md:w-auto gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-ghost/40">
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-mist hover:text-cyan transition-colors">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 accent-cyan bg-ghost/40 h-1 rounded cursor-pointer"
                />
              </div>

              <button
                onClick={() => setActivePodcast(null)}
                className="p-1 rounded-full hover:bg-ghost/30 text-mist hover:text-white transition-all ml-auto md:ml-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
