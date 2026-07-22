// src/pages/PodcastsPage.tsx
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Clock, Sparkles, Volume2, VolumeX, X, Radio, Pencil, Check, AlertCircle, Heart, Search, Music, Headphones, Disc, ShieldCheck, Unlock } from 'lucide-react';
import { podcastsApi, walletApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LANG_FLAGS } from '@/types/index';
import type { Podcast } from '@/types/index';
import toast from 'react-hot-toast';

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const { user } = useAuthStore();

  // Audio player state
  const [activePodcast, setActivePodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showSpotifyPlayer, setShowSpotifyPlayer] = useState(false);

  // Title editing state
  const [editingPodcastId, setEditingPodcastId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Support modal state
  const [supportModal, setSupportModal] = useState<{ podcast: Podcast; creatorName: string } | null>(null);
  const [supportAmount, setSupportAmount] = useState<number>(10);
  const [supportLoading, setSupportLoading] = useState(false);

  const SUPPORT_AMOUNTS = [5, 10, 25, 50];

  const LANG_FILTERS = [
    { id: 'ALL', label: 'All', flag: '🌐' },
    { id: 'EN', label: 'English', flag: '🇺🇸' },
    { id: 'JA', label: 'Japanese', flag: '🇯🇵' },
    { id: 'ZH', label: 'Mandarin', flag: '🇨🇳' },
    { id: 'ES', label: 'Spanish', flag: '🇪🇸' },
    { id: 'FR', label: 'French', flag: '🇫🇷' },
    { id: 'DE', label: 'German', flag: '🇩🇪' },
    { id: 'KO', label: 'Korean', flag: '🇰🇷' },
  ];

// All users (Free learners, PRO, and SUPER) are allowed to listen and learn freely!

  useEffect(() => {
    podcastsApi.all()
      .then(r => setPodcasts(r.data))
      .catch(() => setPodcasts([]))
      .finally(() => setLoading(false));
  }, []);

  // Determine the embed URL for the active podcast — YouTube takes priority, then Spotify
  const getEmbedUrl = (podcast: Podcast): { url: string | null; type: 'youtube' | 'spotify' | null } => {
    if (podcast.fileUrl) {
      if (podcast.fileUrl.includes('youtube.com') || podcast.fileUrl.includes('youtu.be')) {
        const videoId = extractYouTubeId(podcast.fileUrl);
        if (videoId) return { url: `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`, type: 'youtube' };
      }
      if (podcast.fileUrl.includes('open.spotify.com')) {
        return { url: podcast.fileUrl, type: 'spotify' };
      }
    }
    if (podcast.spotifyUrl) {
      if (podcast.spotifyUrl.includes('open.spotify.com')) {
        return { url: podcast.spotifyUrl, type: 'spotify' };
      }
    }
    return { url: null, type: null };
  };

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  };

  // Handle active audio source loading
  useEffect(() => {
    if (!audioRef.current) return;

    if (activePodcast) {
      const { url: embedUrl } = getEmbedUrl(activePodcast);
      // Embedded player (YouTube or Spotify) handles playback — skip native audio
      if (embedUrl) {
        setShowSpotifyPlayer(true);
        audioRef.current.pause();
        audioRef.current.src = '';
        setIsPlaying(false);
        setAudioError(null);
        return;
      }

      // No Spotify: use native audio
      if (!activePodcast.fileUrl) {
        toast.error('No audio recording available for this podcast');
        setIsPlaying(false);
        return;
      }

      const primaryUrl = activePodcast.fileUrl.startsWith('http')
        ? activePodcast.fileUrl
        : `${import.meta.env.VITE_NJS_URL || ''}${activePodcast.fileUrl}`;

      const attemptPlay = (url: string, isFallback = false) => {
        if (!audioRef.current) return;
        setAudioError(null);
        audioRef.current.src = url;
        audioRef.current.volume = isMuted ? 0 : volume;
        audioRef.current.muted = isMuted;
        audioRef.current.load();
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.warn('[PodcastsPage] Playback error:', err);
            if (!isFallback && activePodcast?.fileUrl) {
              attemptPlay(activePodcast.fileUrl, true);
            } else {
              setAudioError('Audio unavailable. The recording may not have been saved yet.');
              setIsPlaying(false);
            }
          });
      };

      attemptPlay(primaryUrl);
    } else {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsPlaying(false);
      setShowSpotifyPlayer(false);
    }
  }, [activePodcast]);

  const togglePlayPause = () => {
    if (!audioRef.current || !activePodcast) return;
    if (!activePodcast.fileUrl) {
      toast.error('No audio recording available for this podcast');
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioError) {
        // Retry loading from primary URL
        const primaryUrl = activePodcast.fileUrl.startsWith('http')
          ? activePodcast.fileUrl
          : `${import.meta.env.VITE_NJS_URL || ''}${activePodcast.fileUrl}`;
        audioRef.current.src = primaryUrl;
        audioRef.current.load();
      }
      audioRef.current.play()
        .then(() => { setIsPlaying(true); setAudioError(null); })
        .catch(err => {
          console.warn('[PodcastsPage] Playback failed:', err);
          toast.error('Playback failed. Please try again.');
          setIsPlaying(false);
        });
    }
  };

  const handlePlayPodcast = async (podcast: Podcast) => {
    const { url: embedUrl } = getEmbedUrl(podcast);
    if (!embedUrl && !podcast.fileUrl) {
      toast.error('No audio recording available for this podcast');
      return;
    }

    if (activePodcast?.id === podcast.id) {
      togglePlayPause();
      return;
    }

    setActivePodcast(podcast);
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioError(null);
    setShowSpotifyPlayer(false);
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
      const dur = audioRef.current.duration;
      if (dur && isFinite(dur) && dur > 0) {
        setDuration(dur);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      if (dur && isFinite(dur) && dur > 0) {
        setDuration(dur);
      } else if (activePodcast?.durationSec) {
        setDuration(activePodcast.durationSec);
      }
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

  const startEditingTitle = (podcast: Podcast, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPodcastId(podcast.id);
    setEditingTitle(podcast.title);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const saveTitle = async (podcastId: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingPodcastId(null);
      return;
    }
    try {
      await podcastsApi.updateTitle(podcastId, trimmed);
      setPodcasts(prev => prev.map(p => p.id === podcastId ? { ...p, title: trimmed } : p));
      setEditingPodcastId(null);
    } catch {
      console.error('[PodcastsPage] Failed to update podcast title');
    }
  };

  const handleTitleKeyDown = (podcastId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveTitle(podcastId);
    if (e.key === 'Escape') setEditingPodcastId(null);
  };

  const handleSupport = async () => {
    if (!supportModal || !user) return;
    setSupportLoading(true);
    try {
      const res = await walletApi.supportCreator({
        creatorId: supportModal.podcast.creatorId,
        podcastId: supportModal.podcast.id,
        podcastTitle: supportModal.podcast.title,
        amount: supportAmount,
      });
      if (res.status === 200) {
        useAuthStore.getState().updateBalance(res.data.balance);
        toast.success(`💛 Thank you for supporting ${supportModal.creatorName}!`);
        setSupportModal(null);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      toast.error(msg || 'Support failed. Please try again.');
    } finally {
      setSupportLoading(false);
    }
  };

  const isSupportAllowed = (price: number) => {
    if (!user) return false;
    if (user.role === 'SUPER') return true;
    if (user.role === 'PRO') return price < 500;
    return price < 50;
  };

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec) || !isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const filteredPodcasts = podcasts.filter(p => {
    const matchesLang = selectedLanguage === 'ALL' || p.language === selectedLanguage;
    const matchesQuery = !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.levelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.roomName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLang && matchesQuery;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative pb-36">
      <style>{`
        @keyframes bounce-bar {
          0%, 100% { height: 4px; }
          50% { height: 20px; }
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
        onError={(e) => {
          // MEDIASRC_NOT_FOUND (4) means the file URL doesn't exist on the server.
          // MEDIA_ERR_NETWORK (2) means network/cors issue.
          const audioEl = e.currentTarget as HTMLAudioElement;
          const errorCode = audioEl.error?.code;
          console.warn('[PodcastsPage] Audio error code:', errorCode, audioEl.error?.message);
          setAudioError('Audio unavailable. The recording may not have been saved yet.');
          setIsPlaying(false);
        }}
      />

      <div className="absolute top-[5%] left-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.06),transparent_60%)] blur-[120px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-ghost/40">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan to-violet flex items-center justify-center shadow-lg shadow-cyan/20">
                <Music className="w-5 h-5 text-void" />
              </div>
              <div>
                <h1 className="font-orbitron font-black text-3xl text-[#F0F4FF] tracking-wider flex items-center gap-2">
                  Spotify Podcast Hub
                  <span className="text-xs font-mono font-normal text-cyan bg-cyan/10 border border-cyan/30 px-2 py-0.5 rounded-full">
                    {podcasts.length} Shows
                  </span>
                </h1>
                <p className="text-mist text-sm mt-0.5 font-inter">
                  Curated language learning sessions, native podcasts & spoken masterclasses
                </p>
              </div>
            </div>
          </div>
          {user?.role === 'SUPER' && (
            <Badge variant="magenta" className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold shadow-[0_0_15px_rgba(255,0,245,0.25)] self-start md:self-auto">
              <Sparkles className="w-3.5 h-3.5 animate-spin" /> Super Host Privilege Active
            </Badge>
          )}
        </div>

        {/* Verified Authority & Open Education Banner */}
        <div className="mb-8 p-4 rounded-2xl glass border border-cyan/30 bg-gradient-to-r from-cyan/10 via-violet/10 to-transparent flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan/20 border border-cyan/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-cyan" />
            </div>
            <div>
              <h3 className="font-exo font-bold text-sm text-[#F0F4FF] flex items-center gap-2">
                Verified Quality & Open Community Access
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2.5 py-0.5 rounded-full font-bold">
                  100% Free Listening
                </span>
              </h3>
              <p className="text-xs text-mist mt-0.5 font-inter leading-relaxed">
                Recording & publishing privileges are curated exclusively by <strong>Verified Super Hosts</strong> to guarantee academic excellence & authority. Listening and learning are 100% open for all community members.
              </p>
            </div>
          </div>
          {user?.role === 'SUPER' ? (
            <Badge variant="magenta" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5" /> Creator Mode
            </Badge>
          ) : (
            <Badge variant="cyan" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold flex-shrink-0">
              <Unlock className="w-3.5 h-3.5 text-cyan" /> Open Listener Mode
            </Badge>
          )}
        </div>

        {/* Search & Language Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-mist absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search podcasts, topics, hosts, or levels..."
              className="w-full bg-navy/40 border border-ghost/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#F0F4FF] placeholder:text-mist/50 outline-none focus:border-cyan/60 focus:bg-navy/60 transition-all shadow-inner"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Language Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {LANG_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedLanguage(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-exo font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                  selectedLanguage === f.id
                    ? 'bg-cyan text-void shadow-[0_0_15px_rgba(0,245,255,0.4)] scale-105'
                    : 'bg-navy/40 border border-ghost/50 text-mist hover:text-white hover:border-cyan/40'
                }`}
              >
                <span>{f.flag}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Podcast Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card space-y-4 bg-navy/20 p-4 rounded-2xl border border-ghost/30">
                <div className="aspect-square skeleton rounded-xl bg-navy/40" />
                <div className="h-4 skeleton w-3/4 rounded" />
                <div className="h-3 skeleton w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : filteredPodcasts.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl border border-ghost/40 max-w-md mx-auto">
            <Headphones className="w-16 h-16 text-ghost/50 mx-auto mb-4 animate-bounce" />
            <h3 className="font-orbitron font-bold text-xl text-[#F0F4FF] mb-2">No Podcasts Found</h3>
            <p className="text-sm text-mist">Try adjusting your search query or language filter.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPodcasts.map((podcast, i) => {
              const isActive = activePodcast?.id === podcast.id;
              return (
                <motion.div
                  key={podcast.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handlePlayPodcast(podcast)}
                  className={`card group cursor-pointer border rounded-2xl p-3.5 transition-all duration-300 flex flex-col justify-between ${
                    isActive
                      ? 'border-cyan bg-cyan/10 shadow-[0_0_25px_rgba(0,245,255,0.2)]'
                      : 'border-ghost/40 hover:border-cyan/40 bg-[#0E0F26]/60 hover:bg-[#121435]/90'
                  }`}
                >
                  <div>
                    {/* Spotify Cover Artwork */}
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3.5 shadow-lg group-hover:shadow-[0_8px_25px_rgba(0,245,255,0.2)] transition-all duration-300 bg-gradient-to-br from-violet/20 to-cyan/20">
                      {podcast.coverUrl ? (
                        <img
                          src={podcast.coverUrl}
                          alt={podcast.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}

                      {/* Dark Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/20 to-transparent opacity-75 group-hover:opacity-50 transition-opacity" />

                      {/* Audio status indicator */}
                      {!podcast.fileUrl ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-void/80 z-10">
                          <AlertCircle className="w-6 h-6 text-amber" />
                          <span className="text-[10px] text-amber font-exo font-bold uppercase tracking-wider">No Recording</span>
                        </div>
                      ) : null}

                      {/* Spotify-style Green/Cyan Floating Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`w-13 h-13 rounded-full bg-cyan text-void flex items-center justify-center shadow-[0_0_20px_rgba(0,245,255,0.6)] transition-all duration-300 ${
                          isActive
                            ? 'opacity-100 scale-105'
                            : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
                        }`}>
                          {isActive && isPlaying ? (
                            <Pause className="w-6 h-6 fill-current text-void" />
                          ) : (
                            <Play className="w-6 h-6 fill-current text-void ml-1" />
                          )}
                        </div>
                      </div>

                      {/* Playing Equalizer Animation */}
                      {isActive && isPlaying && (
                        <div className="absolute bottom-2.5 left-2.5 flex items-end gap-1 h-6 bg-void/80 backdrop-blur-md px-2 py-1 rounded-lg border border-cyan/40">
                          <span className="w-1 bg-cyan rounded-full audio-bar-1" />
                          <span className="w-1 bg-cyan rounded-full audio-bar-2" />
                          <span className="w-1 bg-cyan rounded-full audio-bar-3" />
                          <span className="w-1 bg-cyan rounded-full audio-bar-4" />
                        </div>
                      )}

                      {/* Language Flag Badge Top-Left */}
                      <div className="absolute top-2.5 left-2.5">
                        <Badge variant="cyan" className="text-[10px] font-bold py-0.5 px-2 backdrop-blur-md bg-void/80 border border-cyan/30">
                          {LANG_FLAGS[podcast.language]} {podcast.language}
                        </Badge>
                      </div>

                      {/* Duration Badge Bottom-Right */}
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-void/80 backdrop-blur-md rounded-md px-2 py-0.5 border border-ghost/40">
                        <Clock className="w-3 h-3 text-cyan" />
                        <span className="text-[10px] text-white font-mono font-bold">{formatDuration(podcast.durationSec)}</span>
                      </div>
                    </div>

                    {/* Title */}
                    {editingPodcastId === podcast.id ? (
                      <div className="flex items-center gap-1.5 mb-2" onClick={e => e.stopPropagation()}>
                        <input
                          ref={titleInputRef}
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          onKeyDown={e => handleTitleKeyDown(podcast.id, e)}
                          className="flex-1 bg-navy border border-cyan/50 rounded px-2 py-0.5 text-xs font-exo font-bold text-cyan outline-none min-w-0"
                          maxLength={120}
                        />
                        <button onClick={() => saveTitle(podcast.id)} className="text-emerald-400 hover:text-emerald-300 flex-shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5 group/title mb-1.5">
                        <h3 className={`font-exo font-bold text-sm line-clamp-2 leading-snug transition-colors flex-1 ${
                          isActive ? 'text-cyan' : 'text-[#F0F4FF] group-hover/title:text-cyan'
                        }`}>
                          {podcast.title}
                        </h3>
                        {user?.role === 'SUPER' && (
                          <button
                            onClick={(e) => startEditingTitle(podcast, e)}
                            className="opacity-0 group-hover/title:opacity-100 text-mist hover:text-cyan transition-all flex-shrink-0 mt-0.5"
                            title="Edit title"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-mist mb-3 font-inter truncate">
                      By <strong className="text-violet font-semibold">{podcast.creatorName}</strong>
                    </p>
                  </div>

                  <div>
                    {/* Level Tag */}
                    <div className="mb-3">
                      <span className="text-[10px] font-mono text-cyan/90 bg-cyan/10 px-2 py-0.5 rounded border border-cyan/20 truncate block">
                        {podcast.levelName}
                      </span>
                    </div>

                    {/* Support Creator — hidden for self */}
                    {user && user.id !== podcast.creatorId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSupportModal({ podcast, creatorName: podcast.creatorName }); }}
                        className="w-full flex items-center justify-center gap-1.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 hover:bg-pink-500/25 hover:border-pink-500/60 text-pink-400 hover:text-pink-300 text-[11px] font-exo font-bold transition-all mb-2.5"
                      >
                        <Heart className="w-3 h-3 fill-current" />
                        Support Creator
                      </button>
                    )}

                    <div className="flex items-center justify-between pt-2.5 border-t border-ghost/30 text-[10px] text-mist font-mono">
                      <span className="flex items-center gap-1">
                        <Headphones className="w-3 h-3 text-mist/70" />
                        {podcast.listenCount}
                      </span>
                      <span>{new Date(podcast.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Podcast Player ─────────────────────────────────────────── */}
      {/* YouTube/Spotify iframe embeds for direct playback; native audio as fallback */}
      <AnimatePresence>
        {activePodcast && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:w-[820px] md:-translate-x-1/2 z-50 rounded-2xl glass border border-cyan/40 bg-[#0A0B1B]/95 shadow-[0_10px_35px_rgba(0,245,255,0.2)] overflow-hidden"
          >
            {/* ── YouTube iframe ── */}
            {getEmbedUrl(activePodcast).type === 'youtube' && (
              <iframe
                key={activePodcast.id}
                src={getEmbedUrl(activePodcast).url!}
                width="100%"
                height="250"
                srcDoc=""
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                className="block"
                title={`YouTube: ${activePodcast.title}`}
                onLoad={() => setShowSpotifyPlayer(true)}
              />
            )}

            {/* ── Spotify iframe ── */}
            {getEmbedUrl(activePodcast).type === 'spotify' && (
              <iframe
                key={activePodcast.id}
                src={`${getEmbedUrl(activePodcast).url!}&theme=0`}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="block rounded-t-2xl"
                title={`Spotify: ${activePodcast.title}`}
                onLoad={() => setShowSpotifyPlayer(true)}
                onError={() => setShowSpotifyPlayer(false)}
              />
            )}

            {/* ── Native audio controls (fallback when no embed available) ── */}
            {(getEmbedUrl(activePodcast).type === null || !showSpotifyPlayer) && (
              <div className="flex flex-col md:flex-row items-center gap-3 p-3.5">
                <div className="w-12 h-12 rounded-xl overflow-hidden relative flex-shrink-0 bg-navy/60 border border-cyan/30 shadow-md">
                  {activePodcast.coverUrl ? (
                    <img src={activePodcast.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan/30 to-violet/30">
                      <Disc className="w-6 h-6 text-cyan" />
                    </div>
                  )}
                  {isPlaying && (
                    <div className="absolute inset-0 bg-void/30 flex items-center justify-center">
                      <Radio className="w-5 h-5 text-cyan animate-pulse" />
                    </div>
                  )}
                </div>
                <div className="overflow-hidden flex-1">
                  <h4 className="text-xs font-exo font-bold text-[#F0F4FF] truncate leading-tight">{activePodcast.title}</h4>
                  <p className="text-[10px] text-mist truncate mt-0.5">By {activePodcast.creatorName}</p>
                </div>

                {/* Play controls */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={togglePlayPause}
                      className="w-9 h-9 rounded-full bg-cyan text-void hover:bg-cyan-300 active:scale-95 transition-all flex items-center justify-center shadow-[0_0_15px_rgba(0,245,255,0.5)]">
                      {isPlaying ? <Pause className="w-4.5 h-4.5 fill-current" /> : <Play className="w-4.5 h-4.5 fill-current ml-0.5" />}
                    </button>
                  </div>
                  {audioError && (
                    <div className="flex items-center gap-2 bg-amber/10 border border-amber/30 rounded-lg px-3 py-1.5">
                      <AlertCircle className="w-4 h-4 text-amber flex-shrink-0" />
                      <p className="text-[11px] text-amber font-medium">{audioError}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-mono text-mist">
                    <span>{formatDuration(currentTime)}</span>
                    <input type="range" min={0} max={duration || 1} step={0.1}
                      value={currentTime} onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      className="flex-1 accent-cyan bg-ghost/40 h-1 rounded-lg cursor-pointer outline-none transition-all hover:h-1.5" />
                    <span>{formatDuration(duration)}</span>
                  </div>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="text-mist hover:text-cyan transition-colors">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input type="range" min={0} max={1} step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 accent-cyan bg-ghost/40 h-1 rounded cursor-pointer" />
                </div>
              </div>
            )}

            {/* ── Player footer: info + external link + close ── */}
            <div className="flex items-center justify-between px-3.5 py-2 border-t border-cyan/10">
              <div className="overflow-hidden">
                <p className="text-[11px] font-exo font-bold text-[#F0F4FF] truncate">{activePodcast.title}</p>
                <p className="text-[9px] text-mist truncate">
                  By {activePodcast.creatorName}
                  {getEmbedUrl(activePodcast).type === 'youtube' && ' · YouTube'}
                  {getEmbedUrl(activePodcast).type === 'spotify' && ' · Spotify'}
                </p>
              </div>
              {getEmbedUrl(activePodcast).type === 'youtube' && (
                <a href={`https://www.youtube.com/watch?v=${extractYouTubeId(activePodcast.fileUrl)}`}
                   target="_blank" rel="noopener noreferrer"
                   className="text-[9px] text-red-400/60 hover:text-red-400 transition-colors ml-3 flex-shrink-0 flex items-center gap-1">
                  Open on YouTube ↗
                </a>
              )}
              {getEmbedUrl(activePodcast).type === 'spotify' && (
                <a href={getEmbedUrl(activePodcast).url!.replace('/embed/', '/').split('?')[0]}
                   target="_blank" rel="noopener noreferrer"
                   className="text-[9px] text-green/60 hover:text-green-400 transition-colors ml-3 flex-shrink-0 flex items-center gap-1">
                  Open in Spotify ↗
                </a>
              )}
              <button onClick={() => { setActivePodcast(null); setShowSpotifyPlayer(false); }}
                className="p-1 rounded-full hover:bg-ghost/30 text-mist hover:text-white transition-all ml-3 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Support Creator Modal */}
      <Modal
        isOpen={!!supportModal}
        onClose={() => setSupportModal(null)}
        title="💛 Support this Super"
        size="sm"
      >
        {supportModal && (
          <div className="space-y-4">
            <p className="text-sm text-mist text-center">
              Show some love to <strong className="text-violet">{supportModal.creatorName}</strong> for their podcast:
            </p>
            <p className="text-xs text-center text-mist/60 italic line-clamp-2 px-2">
              "{supportModal.podcast.title}"
            </p>

            {/* Amount picker */}
            <div className="grid grid-cols-4 gap-2">
              {SUPPORT_AMOUNTS.map(amt => {
                const allowed = isSupportAllowed(amt);
                return (
                  <button
                    key={amt}
                    disabled={!allowed}
                    onClick={() => setSupportAmount(amt)}
                    className={`py-2.5 rounded-xl border text-sm font-exo font-bold transition-all ${
                      supportAmount === amt
                        ? 'border-cyan bg-cyan/15 text-cyan'
                        : !allowed
                          ? 'border-ghost/30 opacity-40 cursor-not-allowed text-mist'
                          : 'border-ghost hover:border-pink-500/50 text-[#F0F4FF] hover:text-pink-300'
                    }`}
                  >
                    ${amt}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              {[5, 10].includes(supportAmount) && (
                <input
                  type="number"
                  min={1}
                  max={user?.role === 'SUPER' ? 10000 : user?.role === 'PRO' ? 499 : 49}
                  value={supportAmount}
                  onChange={e => setSupportAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  className="flex-1 bg-navy border border-ghost rounded-lg px-3 py-2 text-sm text-[#F0F4FF] outline-none focus:border-pink-500/60"
                  placeholder="Custom amount"
                />
              )}
              <button
                onClick={handleSupport}
                disabled={supportLoading || !user || !isSupportAllowed(supportAmount) || supportAmount <= 0}
                className={`flex-1 py-2.5 rounded-xl font-exo font-bold text-sm transition-all ${
                  supportLoading
                    ? 'bg-navy/50 text-mist cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:opacity-90 active:scale-95'
                }`}
              >
                {supportLoading ? 'Sending...' : `Send $${supportAmount} 💛`}
              </button>
            </div>

            {user && (
              <p className="text-[10px] text-mist/50 text-center">
                Your balance: <strong className="text-cyan">${user.walletBalance ?? 0}</strong>
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
