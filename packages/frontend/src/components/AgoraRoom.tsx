// src/components/AgoraRoom.tsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Hand, HandMetal, PhoneOff, Pin, Film, Crown, Users, Gift, BookOpen, Wifi } from 'lucide-react';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { GIFT_TYPES } from '@/types/index';
import { walletApi } from '@/lib/api';
import toast from 'react-hot-toast';

export function AgoraRoom() {
  const {
    currentRoom, participants, handQueue, isMuted, isSpeaking, handRaised,
    pinnedContent, isRecording, giftEvents, leaveRoom,
    handRaise, handLower, toggleMute, grantSpeak, revokeSpeak,
    pinContent, startRecording, stopRecording, closeRoom, recommendation,
    latencyMs, selectedMicrophoneId, switchMicrophone, agoraReady
  } = useRoomStore();

  const { user, updateBalance } = useAuthStore();
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedGift, setSelectedGift] = useState<typeof GIFT_TYPES[0] | null>(null);
  const [pinForm, setPinForm] = useState({ title: '', url: '', type: 'vocabulary' as 'vocabulary' | 'grammar' | 'conversation' | 'pdf' });
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      setMicrophones(devices.filter(d => d.kind === 'audioinput'));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let audioContext: AudioContext;
    let analyzer: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let raf: number;

    const startAudio = () => {
      if (!agoraReady) return;
      const track = useRoomStore.getState().getLocalMediaStreamTrack();
      if (!track) return;
      
      try {
        const stream = new MediaStream([track]);
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioCtx();
        analyzer = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyzer);
        analyzer.fftSize = 256;
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateVol = () => {
          analyzer.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const vol = sum / bufferLength;
          if (volumeBarRef.current) {
            const widthPercent = isMuted ? 0 : Math.min(100, (vol / 60) * 100);
            volumeBarRef.current.style.width = `${widthPercent}%`;
          }
          raf = requestAnimationFrame(updateVol);
        };
        updateVol();
      } catch (err) {}
    };

    startAudio();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
    };
  }, [isMuted, selectedMicrophoneId, agoraReady]);

  useEffect(() => {
    if (currentRoom && user) {
      const { joinRoom: doJoin, joiningRoomId, joinAgoraChannel } = useRoomStore.getState();
      if (joiningRoomId !== currentRoom.id) {
        doJoin(currentRoom.id);
      }
      // Initialize Agora connection and local audio track
      joinAgoraChannel(user.id);
    }
  }, [currentRoom?.id, user?.id]);

  if (!currentRoom || !user) return null;

  const isHost = currentRoom.hostId === user.id;
  const isSuper = user.role === 'SUPER';

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
      }
    } catch {
      toast.error('Failed to send gift');
    }
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
              <p className="text-xs text-mist">{currentRoom.levelName} · Sub-level {currentRoom.currentSubLevel}/12</p>
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
              <Avatar personaId={user.personaId} name={user.displayName} size="md" showBadge role={user.role} />
              <div className="flex-1">
                <p className="text-sm font-exo font-semibold text-[#F0F4FF]">{user.displayName} <span className="text-mist">(You)</span></p>
                <p className="text-xs text-mist">
                  {isSpeaking ? 'Speaking' : isMuted ? 'Muted' : 'Ready to speak'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isHost && (
                  <Button variant={handRaised ? 'magenta' : 'ghost'} size="sm" onClick={handRaised ? handLower : handRaise}>
                    {handRaised ? <HandMetal className="w-4 h-4" /> : <Hand className="w-4 h-4" />}
                    {handRaised ? 'Lower' : 'Raise'}
                  </Button>
                )}
                <Button variant={isMuted ? 'ghost' : 'primary'} size="sm" onClick={toggleMute}>
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
              {participants.map((p) => (
                <motion.div
                  key={p.oderId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    p.isSpeaking && !p.isMuted
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

        {/* Sidebar */}
        <div className="w-72 border-l border-ghost flex flex-col overflow-hidden bg-[#12122A]">
          {/* Pinned Content */}
          <div className="p-4 border-b border-ghost">
            <h3 className="text-xs font-exo font-semibold text-mist uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5" /> Pinned Content
            </h3>
            {pinnedContent ? (
              <div className="p-3 rounded-lg bg-navy border border-ghost">
                <p className="text-xs font-semibold text-cyan truncate">{pinnedContent.title}</p>
                <p className="text-xs text-mist mt-0.5 whitespace-pre-wrap">{pinnedContent.url}</p>
                <p className="text-[10px] text-violet uppercase font-exo tracking-wider mt-1">{pinnedContent.type}</p>
              </div>
            ) : (
              <p className="text-xs text-mist/50 italic">No content pinned</p>
            )}
          </div>

          {/* Hand Queue */}
          {isHost && handQueue.length > 0 && (
            <div className="p-4 border-b border-ghost max-h-40 overflow-y-auto">
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
          <div className="p-4 space-y-2 border-t border-ghost bg-[#12122A]">
            <Button variant="ghost" className="w-full justify-start" onClick={() => setShowGiftModal(true)}>
              <Gift className="w-4 h-4" /> Send Gift
            </Button>
            {isHost && (
              <>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setShowPinModal(true)}>
                  <Pin className="w-4 h-4" /> Custom Pin
                </Button>
                {isSuper && (
                  <Button variant={isRecording ? 'magenta' : 'ghost'} className="w-full justify-start"
                    onClick={isRecording ? stopRecording : startRecording}>
                    <Film className="w-4 h-4" /> {isRecording ? 'Stop Recording' : 'Record Podcast'}
                  </Button>
                )}
                <Button variant="ghost" className="w-full justify-start text-magenta hover:text-magenta" onClick={closeRoom}>
                  Close Room
                </Button>
              </>
            )}

            {/* Microphone Switcher in Room */}
            <div className="mt-4 pt-4 border-t border-ghost">
              <label className="text-[10px] font-bold text-mist uppercase tracking-wider mb-1.5 block">Microphone</label>
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
        </div>
      </div>

      {/* Gift Modal */}
      <Modal isOpen={showGiftModal} onClose={() => { setShowGiftModal(false); setSelectedGift(null); }} title="Send a Gift" size="md">
        <div className="grid grid-cols-3 gap-3">
          {GIFT_TYPES.map((gift) => (
            <button
              key={gift.id}
              onClick={() => setSelectedGift(gift)}
              className={`p-4 rounded-xl border text-center transition-all ${
                selectedGift?.id === gift.id ? 'border-cyan bg-cyan/10' : 'border-ghost hover:border-violet/50'
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
            {participants.filter(p => p.oderId !== user.id).map(p => (
              <button key={p.oderId}
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
          <div>
            <label className="text-sm font-exo font-medium text-mist">Type</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {(['vocabulary', 'grammar', 'conversation', 'pdf'] as const).map(type => (
                <button key={type} onClick={() => setPinForm(p => ({ ...p, type }))}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-exo transition-all ${
                    pinForm.type === type ? 'border-cyan bg-cyan/10 text-cyan' : 'border-ghost text-mist hover:border-violet/50'
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
