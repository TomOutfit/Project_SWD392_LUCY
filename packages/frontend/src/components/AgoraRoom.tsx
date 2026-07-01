// src/components/AgoraRoom.tsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Hand, HandMetal, PhoneOff, Pin, Film, Crown, Users, Gift, BookOpen, Wifi, Volume2, VolumeX } from 'lucide-react';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { GIFT_TYPES } from '@/types/index';
import { walletApi, roomsApi } from '@/lib/api';
import toast from 'react-hot-toast';

export function AgoraRoom() {
  const {
    currentRoom, participants, handQueue, isMuted, isSpeaking,
    pinnedContent, isRecording, recordingTime, isUploading, giftEvents, leaveRoom,
    toggleHand, toggleMute, grantSpeak, revokeSpeak,
    pinContent, startRecording, stopRecording, closeRoom, recommendation,
    latencyMs, selectedMicrophoneId, switchMicrophone,
    isSelfMonitoring, toggleSelfMonitoring
  } = useRoomStore();

  const user = useAuthStore((s) => s.user);
  const handRaised = participants.find((p) => p.oderId === user?.id)?.handRaised ?? false;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const { updateBalance } = useAuthStore();
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedGift, setSelectedGift] = useState<typeof GIFT_TYPES[0] | null>(null);
  const [pinForm, setPinForm] = useState({ title: '', url: '', type: 'vocabulary' as 'vocabulary' | 'grammar' | 'conversation' | 'pdf' });
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const sidebarVolumeBarRef = useRef<HTMLDivElement>(null);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    if (!currentRoom?.nextTransitionAt) {
      setTimeLeft(null);
      return;
    }
    const updateTime = () => {
      const diffMs = new Date(currentRoom.nextTransitionAt!).getTime() - Date.now();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));
      setTimeLeft(diffSec);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [currentRoom?.nextTransitionAt]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => stream.getTracks().forEach(t => t.stop()));
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        setMicrophones(audioInputs);
      } catch {
        setMicrophones([]);
      }
    };
    getDevices();
  }, []);

  useEffect(() => {
    let raf: number;
    let logCount = 0;
    const updateVol = () => {
      const { isMuted } = useRoomStore.getState();
      const vol = useRoomStore.getState().getLocalVolumeLevel();
      logCount++;
      if (logCount % 60 === 0) {
        // eslint-disable-next-line no-console
        console.log('[RAF] isMuted:', isMuted, 'vol:', vol.toFixed(3));
      }
      if (volumeBarRef.current) {
        const target = isMuted ? 0 : Math.min(100, vol * 1.5);
        volumeBarRef.current.style.width = `${target}%`;
      }
      if (sidebarVolumeBarRef.current) {
        sidebarVolumeBarRef.current.style.width = `${isMuted ? 0 : Math.min(100, vol)}%`;
      }
      raf = requestAnimationFrame(updateVol);
    };

    updateVol();

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (currentRoom && user) {
      const { joinRoom: doJoin, joiningRoomId } = useRoomStore.getState();
      if (joiningRoomId !== currentRoom.id) {
        doJoin(currentRoom.id);
      }
    }
  }, [currentRoom?.id, user?.id]);

  if (!currentRoom || !user) return null;

  const isHost = currentRoom.hostId === user.id;
  const isSuper = user.role === 'SUPER';
  const me = participants.find(p => p.oderId === user.id);
  const isAllowedToSpeak = isHost || !!me?.speakGranted;

  const handleSendGift = async (recipientId: number, recipientName: string) => {
    if (!selectedGift || !currentRoom) return;
    try {
      const res = await walletApi.sendGift({
        recipientEmail: `user_${recipientId}@lucy.local`,
        roomId: currentRoom.id,
        giftType: selectedGift.id,
        amount: selectedGift.price,
      });
      if (res.status === 200) {
        updateBalance(res.data.balance);
        toast.success(`Gift sent to ${recipientName}!`);
        setShowGiftModal(false);
        setSelectedGift(null);

        // Emit real-time socket event for the gift
        const socket = useRoomStore.getState().socket;
        if (socket) {
          socket.emit('send-gift', {
            roomId: currentRoom.id,
            giftType: selectedGift.id,
            amount: selectedGift.price,
            recipientId,
          });
        }
      }
    } catch {
      toast.error('Failed to send gift');
    }
  };

  const renderSidebarContent = () => {
    return (
      <>
        {/* Pinned Content */}
        <div className="p-4 border-b border-ghost flex-shrink-0">
          <h3 className="text-xs font-exo font-semibold text-mist uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5" /> Pinned Content
          </h3>
          {pinnedContent ? (
            <div className="p-3 rounded-lg bg-navy border border-ghost">
              <p className="text-xs font-semibold text-cyan truncate">{pinnedContent.title}</p>
              {pinnedContent.url.startsWith('/uploads/') ? (
                <a
                  href={`${import.meta.env.VITE_NJS_URL || 'http://localhost:3001'}${pinnedContent.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-violet hover:text-cyan hover:underline flex items-center gap-1.5 mt-1 font-semibold"
                >
                  📥 Download / View Document
                </a>
              ) : (
                <p className="text-xs text-mist mt-0.5 whitespace-pre-wrap">{pinnedContent.url}</p>
              )}
              <p className="text-[10px] text-violet uppercase font-exo tracking-wider mt-1">{pinnedContent.type}</p>
            </div>
          ) : (
            <p className="text-xs text-mist/50 italic">No content pinned</p>
          )}
        </div>

        {/* Hand Queue */}
        {isHost && handQueue.length > 0 && (
          <div className="p-4 border-b border-ghost max-h-40 overflow-y-auto flex-shrink-0">
            <h3 className="text-xs font-exo font-semibold text-mist uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Hand className="w-3.5 h-3.5" /> Hand Queue ({handQueue.length})
            </h3>
            <div className="space-y-2">
              {handQueue.map((p, i) => (
                <div key={p.oderId} className="flex items-center gap-2 p-2 rounded-lg bg-navy border border-ghost">
                  <span className="text-xs text-mist w-4">{i + 1}.</span>
                  <Avatar personaId={p.oderPersonaId} name={p.oderName} size="xs" />
                  <span className="text-xs font-exo text-[#F0F4FF] flex-1 truncate">{p.oderName}</span>
                  <Button variant="secondary" size="xs" onClick={() => grantSpeak(p.oderId)}>Grant</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommended LMS Content */}
        {recommendation && (
          <div className="p-4 border-b border-ghost flex-1 overflow-y-auto space-y-4">
            <h3 className="text-xs font-exo font-semibold text-cyan uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> AI Recommendations
            </h3>

            {/* Vocabulary */}
            <div>
              <p className="text-[10px] font-bold text-mist uppercase tracking-wider mb-1.5">Vocabulary</p>
              <div className="flex flex-wrap gap-1.5">
                {recommendation.vocabulary.map((vocab) => (
                  <div key={vocab} className="group relative flex items-center gap-1 px-2 py-1 rounded bg-[#1A1A35] border border-ghost text-xs text-[#F0F4FF]">
                    <span>{vocab}</span>
                    {isHost && (
                      <button
                        onClick={() => pinContent(`Vocabulary: ${vocab}`, vocab, 'vocabulary')}
                        className="opacity-0 group-hover:opacity-100 ml-1 text-cyan hover:text-pulse transition-all"
                        title="Pin this word"
                      >
                        <Pin className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Grammar */}
            <div>
              <p className="text-[10px] font-bold text-mist uppercase tracking-wider mb-1.5">Grammar Tips</p>
              <ul className="space-y-1">
                {recommendation.grammarTips.map((tip, idx) => (
                  <li key={idx} className="group relative text-xs text-mist leading-relaxed pl-3 before:content-['•'] before:absolute before:left-0 before:text-cyan flex items-start justify-between">
                    <span className="flex-1 text-[11px]">{tip}</span>
                    {isHost && (
                      <button
                        onClick={() => pinContent(`Grammar Tip`, tip, 'grammar')}
                        className="opacity-0 group-hover:opacity-100 ml-1 text-cyan hover:text-pulse transition-all flex-shrink-0"
                        title="Pin this grammar tip"
                      >
                        <Pin className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Conversation Prompts */}
            <div>
              <p className="text-[10px] font-bold text-mist uppercase tracking-wider mb-1.5">Discussion Prompts</p>
              <ul className="space-y-1.5">
                {recommendation.conversationPrompts.map((prompt, idx) => (
                  <li key={idx} className="group relative p-2 rounded bg-navy/50 border border-ghost/40 text-[11px] text-mist flex items-start justify-between gap-1.5">
                    <span className="flex-1">{prompt}</span>
                    {isHost && (
                      <button
                        onClick={() => pinContent(`Discussion Prompt`, prompt, 'conversation')}
                        className="opacity-0 group-hover:opacity-100 text-cyan hover:text-pulse transition-all flex-shrink-0"
                        title="Pin this prompt"
                      >
                        <Pin className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 space-y-2 border-t border-ghost bg-[#12122A] flex-shrink-0">
          <Button variant="ghost" className="w-full justify-start" onClick={() => setShowGiftModal(true)}>
            <Gift className="w-4 h-4" /> Send Gift
          </Button>
          {isHost && (
            <>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setShowPinModal(true)}>
                <Pin className="w-4 h-4" /> Custom Pin
              </Button>
              {isSuper && (
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${
                    isUploading
                      ? 'text-cyan opacity-80'
                      : isRecording
                        ? 'text-[#ff4d4d] hover:text-[#cc0000]'
                        : ''
                  }`}
                  disabled={isUploading}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  <Film className={`w-4 h-4 ${isRecording && !isUploading ? 'animate-pulse' : ''}`} />
                  {isUploading ? 'Uploading...' : isRecording ? 'Stop Recording' : 'Record Podcast'}
                  {isRecording && !isUploading && (
                    <span className="font-mono text-xs opacity-80 ml-auto">{formatTime(recordingTime)}</span>
                  )}
                  {isUploading && (
                    <span className="font-mono text-xs opacity-80 ml-auto animate-pulse">Saving</span>
                  )}
                </Button>
              )}
              <Button variant="ghost" className="w-full justify-start text-magenta hover:text-magenta" onClick={closeRoom}>
                Close Room
              </Button>
            </>
          )}

          {/* Microphone Switcher in Room */}
          <div className="mt-4 pt-4 border-t border-ghost">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold text-mist uppercase tracking-wider block">Microphone</label>
              {latencyMs !== null && (
                <span className={`text-[10px] font-mono ${latencyMs < 100 ? 'text-green-400' : latencyMs < 200 ? 'text-yellow-400' : 'text-red-400'}`}>
                  Ping: {latencyMs}ms
                </span>
              )}
            </div>

            {/* Volume Bar */}
            <div className="flex items-center gap-2 mb-2">
              <Mic className={`w-3.5 h-3.5 ${isMuted ? 'text-rose-500' : 'text-mist'}`} />
              <div className="flex-1 h-2.5 bg-midnight rounded-full overflow-hidden border border-ghost">
                <div
                  ref={sidebarVolumeBarRef}
                  className={`h-full rounded-full transition-all duration-75 ${isMuted ? 'bg-rose-500/50' : 'bg-[#1A73E8]'}`}
                  style={{ width: '0%' }}
                />
              </div>
              <button
                onClick={toggleSelfMonitoring}
                disabled={isMuted}
                className={`p-1.5 rounded-lg border transition-all ${
                  isMuted
                    ? 'bg-midnight border-ghost cursor-not-allowed opacity-50'
                    : isSelfMonitoring
                      ? 'bg-cyan/20 border-cyan text-cyan'
                      : 'bg-midnight border-ghost text-mist hover:border-violet/50'
                }`}
                title={isMuted ? 'Unmute first to enable self-monitoring' : isSelfMonitoring ? 'Disable self-monitoring' : 'Enable self-monitoring (hear your own voice)'}
              >
                {isSelfMonitoring ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>
            {isSelfMonitoring && !isMuted && (
              <p className="text-[10px] text-cyan/70 mb-2">You can now hear your own voice</p>
            )}
            {isMuted && (
              <p className="text-[10px] text-rose-400/70 mb-2">Unmute to enable self-monitoring</p>
            )}

            <select
              className="w-full bg-navy border border-ghost rounded-lg px-2 py-1.5 text-xs text-[#F0F4FF] outline-none focus:border-cyan transition-all"
              value={selectedMicrophoneId || ''}
              onChange={(e) => switchMicrophone(e.target.value)}
            >
              {microphones.length === 0 && <option value="">Default</option>}
              {microphones.map(mic => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Mic (${mic.deviceId.slice(0, 4)})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-void flex flex-col">
      <AnimatePresence>
        {giftEvents.map((evt) => (
          <motion.div
            key={evt.id}
            initial={{ opacity: 0, y: 60, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.5 }}
            className="fixed top-24 left-1/2 z-50 glass rounded-2xl px-6 py-3 flex items-center gap-3 shadow-card"
          >
            <Avatar personaId={evt.senderPersonaId} size="sm" />
            <div>
              <p className="text-sm font-exo font-bold text-[#F0F4FF]">{evt.senderName}</p>
              <p className="text-xs text-mist">sent {evt.giftType} to {evt.recipientName}</p>
            </div>
            <span className="text-2xl">{GIFT_TYPES.find(g => g.id === evt.giftType)?.emoji}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Header */}
      <div className="glass border-b border-ghost px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-orbitron font-bold text-sm text-[#F0F4FF]">{currentRoom.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-mist">
                {currentRoom.levelName} · Sub-level {currentRoom.currentSubLevel}/12
                {timeLeft !== null && (
                  <span className="text-cyan font-mono ml-2 font-semibold">
                    (Next: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')})
                  </span>
                )}
              </p>
              {isHost && currentRoom.currentSubLevel < 12 && (
                <button
                  onClick={() => {
                    const { forceStageTransition } = useRoomStore.getState();
                    forceStageTransition();
                    toast.success('Initiating sublevel transition...');
                  }}
                  className="px-2 py-0.5 rounded bg-violet/20 hover:bg-violet/40 text-[10px] text-violet font-exo font-bold border border-violet/30 transition-all"
                >
                  Force Next Sub-Level
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-cyan flex items-center gap-1.5 px-2 py-1 hover:bg-cyan/10"
            onClick={() => setShowMobileSidebar(true)}
            title="Show LMS Panel"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">LMS</span>
          </Button>

          <div className="flex items-center gap-1.5 text-amber text-xs font-exo font-semibold">
            <div className={`w-2 h-2 rounded-full ${currentRoom.state === 'Transition' ? 'bg-amber animate-pulse' : 'bg-pulse'}`} />
            {currentRoom.state === 'Transition' ? 'Stage Transition' : 'Active'}
          </div>
          <div className="flex items-center gap-1 text-mist text-xs">
            <Users className="w-3.5 h-3.5" />
            {participants.length}
          </div>
          <div className="flex items-center gap-1 text-mist text-xs" title="Round-trip latency">
            <Wifi className="w-3.5 h-3.5" />
            <span className="font-mono">{latencyMs !== null ? `${latencyMs}ms` : '--'}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={leaveRoom}>
            <PhoneOff className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main area */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-ghost">
            <div className="flex items-center gap-3 mb-4 px-2">
              <Mic className={`w-5 h-5 ${isMuted ? 'text-rose-500' : 'text-mist'}`} />
              <div className="flex-1 h-3 bg-midnight rounded-full overflow-hidden border border-ghost">
                <div
                  ref={volumeBarRef}
                  className={`h-full rounded-full transition-all duration-75 ${isMuted ? 'bg-rose-500/50' : 'bg-blue-500'}`}
                  style={{ width: '0%' }}
                />
              </div>
              <div className="w-20 text-right">
                <p className="text-[10px] font-mono text-mist uppercase tracking-wider">
                  {isMuted ? 'MUTED' : isSpeaking ? 'SPEAKING' : 'READY'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-midnight border border-ghost">
              <Avatar personaId={user.personaId} name={me?.oderName || user.displayName} size="md" showBadge role={user.role} />
              <div className="flex-1">
                <p className="text-sm font-exo font-semibold text-[#F0F4FF]">{me?.oderName || user.displayName} <span className="text-mist">(You)</span></p>
                <p className="text-xs text-mist">
                  {isSpeaking ? 'Speaking' : isMuted ? 'Muted' : 'Ready to speak'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isHost && (
                  <Button
                    variant={handRaised ? 'magenta' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      toggleHand();
                      toast.success(handRaised ? 'Hand lowered' : 'Hand raised — you\'re in the queue!');
                    }}
                  >
                    {handRaised ? <HandMetal className="w-4 h-4" /> : <Hand className="w-4 h-4" />}
                    {handRaised ? 'Lower' : 'Raise'}
                  </Button>
                )}
                <Button 
                  variant={isMuted ? 'ghost' : 'primary'} 
                  size="sm" 
                  onClick={toggleMute}
                  disabled={!isAllowedToSpeak}
                  title={!isAllowedToSpeak ? 'Raise your hand to request speaking permission' : undefined}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <h3 className="text-xs font-exo font-semibold text-mist uppercase tracking-wider mb-3">
              Participants ({participants.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {participants.map((p, idx) => (
                <motion.div
                  key={`${p.oderId}-${idx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-3 rounded-xl border text-center transition-all ${p.isSpeaking && !p.isMuted
                      ? 'border-cyan bg-cyan/10 shadow-cyan'
                      : 'border-ghost bg-midnight'
                    }`}
                  onClick={() => isHost && p.oderId !== user.id && (p.isSpeaking ? revokeSpeak(p.oderId) : grantSpeak(p.oderId))}
                  title={isHost ? 'Click to grant/revoke speak' : undefined}
                >
                  <div className="flex justify-center mb-2">
                    <Avatar personaId={p.oderPersonaId} name={p.oderName} size="lg" showBadge role={p.oderRole} />
                  </div>
                  <p className="text-xs font-exo font-semibold text-[#F0F4FF] truncate">{p.oderName}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {p.isSpeaking && !p.isMuted && <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-glow-dot" />}
                    {p.handRaised && <Hand className="w-3 h-3 text-amber" />}
                    {p.oderId === currentRoom.hostId && <Crown className="w-3 h-3 text-amber" />}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar for Desktop */}
        <div className="hidden md:flex w-72 border-l border-ghost flex-col overflow-hidden bg-[#12122A]">
          {renderSidebarContent()}
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {showMobileSidebar && (
          <div className="fixed inset-0 z-40 md:hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileSidebar(false)}
              className="fixed inset-0 bg-[#0B0B1A]"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-80 max-w-full bg-[#12122A] border-l border-ghost flex flex-col h-full z-10"
            >
              <div className="p-4 border-b border-ghost flex items-center justify-between flex-shrink-0">
                <h3 className="font-orbitron font-bold text-sm text-[#F0F4FF] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-cyan" /> LMS Panel
                </h3>
                <Button variant="ghost" size="xs" onClick={() => setShowMobileSidebar(false)}>
                  ✕
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {renderSidebarContent()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sublevel Transition Overlay */}
      <AnimatePresence>
        {currentRoom.state === 'Transition' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0B0B1A]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center text-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="max-w-md p-8 glass border border-amber/30 rounded-3xl shadow-amber relative overflow-hidden"
            >
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber/20 rounded-full blur-[50px] animate-pulse" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-violet/20 rounded-full blur-[50px] animate-pulse" />

              <span className="text-5xl block mb-4 animate-bounce">🚀</span>
              <h2 className="font-orbitron font-extrabold text-2xl text-amber uppercase tracking-widest mb-3">
                Sub-Level Transition
              </h2>
              <p className="text-sm text-[#F0F4FF] mb-4">
                You are transitioning to <strong>Sub-level {currentRoom.currentSubLevel}</strong>.
              </p>
              <div className="flex justify-center gap-1.5 my-4">
                <span className="w-3 h-3 rounded-full bg-amber animate-ping" />
                <span className="w-3 h-3 rounded-full bg-amber animate-ping delay-150" />
                <span className="w-3 h-3 rounded-full bg-amber animate-ping delay-300" />
              </div>
              <p className="text-xs text-mist italic">
                Hold on! We are preparing new vocabulary and conversation prompts for you...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift Modal */}
      <Modal isOpen={showGiftModal} onClose={() => { setShowGiftModal(false); setSelectedGift(null); }} title="Send a Gift" size="md">
        <div className="grid grid-cols-3 gap-3">
          {GIFT_TYPES.map((gift) => (
            <button
              key={gift.id}
              onClick={() => setSelectedGift(gift)}
              className={`p-4 rounded-xl border text-center transition-all ${selectedGift?.id === gift.id ? 'border-cyan bg-cyan/10' : 'border-ghost hover:border-violet/50'
                }`}
            >
              <span className="text-3xl block mb-2">{gift.emoji}</span>
              <p className="text-xs font-exo font-semibold text-[#F0F4FF]">{gift.name}</p>
              <p className="text-xs text-mist">${gift.price}</p>
            </button>
          ))}
        </div>
        {selectedGift && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {participants.filter(p => p.oderId !== user.id).map((p, idx) => (
              <button key={`${p.oderId}-${idx}`}
                onClick={() => handleSendGift(p.oderId, p.oderName)}
                className="flex-1 p-2 rounded-lg bg-navy border border-ghost hover:border-cyan transition-all text-center min-w-[80px]">
                <Avatar personaId={p.oderPersonaId} name={p.oderName} size="sm" className="mx-auto mb-1" />
                <p className="text-xs text-mist truncate">{p.oderName}</p>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* Pin Content Modal */}
      <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} title="Pin Learning Content" size="md">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-exo font-medium text-mist">Title</label>
            <input className="input-field mt-1.5" value={pinForm.title}
              onChange={e => setPinForm(p => ({ ...p, title: e.target.value }))} placeholder="Vocabulary Sheet Level 15" />
          </div>
          <div>
            <label className="text-sm font-exo font-medium text-mist">URL (optional)</label>
            <input className="input-field mt-1.5" value={pinForm.url}
              onChange={e => setPinForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="p-3 rounded-lg border border-ghost bg-navy/30">
            <label className="text-xs font-bold text-cyan uppercase tracking-wider block mb-1.5">
              Or Upload Local Document (PDF, Word, Excel, Images, etc.)
            </label>
            <input
              type="file"
              className="text-xs text-mist file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-violet/20 file:text-violet hover:file:bg-violet/30 cursor-pointer w-full"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !currentRoom) return;
                try {
                  toast.loading('Uploading document...');
                  const res = await roomsApi.uploadDoc(currentRoom.id, file);
                  toast.dismiss();
                  if (res.status === 200) {
                    const { fileUrl, fileName } = res.data;
                    setPinForm({
                      title: fileName,
                      url: fileUrl,
                      type: 'pdf',
                    });
                    toast.success('Document uploaded successfully!');
                  }
                } catch {
                  toast.dismiss();
                  toast.error('Failed to upload document');
                }
              }}
            />
          </div>
          <div>
            <label className="text-sm font-exo font-medium text-mist">Type</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {(['vocabulary', 'grammar', 'conversation', 'pdf'] as const).map(type => (
                <button key={type} onClick={() => setPinForm(p => ({ ...p, type }))}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-exo transition-all ${pinForm.type === type ? 'border-cyan bg-cyan/10 text-cyan' : 'border-ghost text-mist hover:border-violet/50'
                    }`}>
                  {type}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={() => { pinContent(pinForm.title, pinForm.url, pinForm.type); setShowPinModal(false); }}
            disabled={!pinForm.title}>Pin Content</Button>
        </div>
      </Modal>
    </div>
  );
}
