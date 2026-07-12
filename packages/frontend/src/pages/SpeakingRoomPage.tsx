import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic2, Volume2, VolumeX, Loader2, Info, ArrowRight } from 'lucide-react';
import { AgoraRoom } from '@/components/AgoraRoom';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';

export default function SpeakingRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { currentRoom, isConnected, joiningRoomId, joinRoom, connectSocket, joinAgoraChannel, agoraJoined, agoraJoining, agoraFailed } = useRoomStore();
  const { user, loginAsGuest } = useAuthStore();

  const [guestName, setGuestName] = useState(() => `Guest_${Math.floor(1000 + Math.random() * 9000)}`);
  const [isLoggingInGuest, setIsLoggingInGuest] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  // Mic testing state
  const [micTestActive, setMicTestActive] = useState(false);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Connect socket + join room
  useEffect(() => {
    if (user && roomId && !isConnected) {
      connectSocket(user.id, user.displayName, user.personaId, user.role, roomId);
    } else if (isConnected && !currentRoom && joiningRoomId !== roomId && roomId) {
      joinRoom(roomId);
    }
  }, [user, roomId, isConnected, currentRoom, joiningRoomId, connectSocket, joinRoom]);

  // Join Agora channel only after socket is connected
  useEffect(() => {
    if (user && roomId && isConnected && !agoraJoined && !agoraJoining && !agoraFailed) {
      console.log('[SpeakingRoom] Joining Agora channel...');
      joinAgoraChannel(user.id, roomId);
    }
  }, [user?.id, roomId, isConnected, agoraJoined, agoraJoining, agoraFailed, joinAgoraChannel]);

  // ── Mic testing ────────────────────────────────────────────────────────────
  useEffect(() => {
    let raf: number;
    let audioContext: AudioContext;
    let analyzer: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let gainNode: GainNode;
    let activeStream: MediaStream;

    const startAudio = async () => {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new window.AudioContext();
        audioContextRef.current = audioContext;
        analyzer = audioContext.createAnalyser();
        gainNode = audioContext.createGain();
        gainNode.gain.value = micTestActive ? 0.3 : 0;
        microphone = audioContext.createMediaStreamSource(activeStream);

        microphone.connect(analyzer);
        microphone.connect(gainNode);

        if (micTestActive) {
          gainNode.connect(audioContext.destination);
        }

        gainNodeRef.current = gainNode;

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
            volumeBarRef.current.style.width = `${Math.min(100, (vol / 60) * 100)}%`;
          }
          raf = requestAnimationFrame(updateVol);
        };
        updateVol();
      } catch (err) {
        console.error('[SpeakingRoomPage] Mic test error:', err);
      }
    };

    if (micTestActive) {
      startAudio();
    } else {
      if (volumeBarRef.current) volumeBarRef.current.style.width = '0%';
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
      audioContextRef.current = null;
      gainNodeRef.current = null;
    };
  }, [micTestActive]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      useRoomStore.getState().leaveRoom();
    };
  }, []);

  // Redirect to homepage if kicked by host or room closed
  useEffect(() => {
    const handleRedirect = () => {
      navigate('/');
    };
    window.addEventListener('lucy-kicked-from-room', handleRedirect);
    window.addEventListener('lucy-room-closed', handleRedirect);
    return () => {
      window.removeEventListener('lucy-kicked-from-room', handleRedirect);
      window.removeEventListener('lucy-room-closed', handleRedirect);
    };
  }, [navigate]);

  // ── Loading / connecting state ──────────────────────────────────────────────
  if (!user) {
    const handleJoinAsGuest = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!guestName.trim()) {
        setGuestError('Please enter a display name');
        return;
      }
      setIsLoggingInGuest(true);
      setGuestError(null);
      const ok = await loginAsGuest(guestName.trim());
      setIsLoggingInGuest(false);
      if (!ok) {
        setGuestError('Failed to join room as guest. Please try again.');
      }
    };

    return (
      <div className="min-h-screen relative overflow-hidden bg-[#0B0B1A] flex items-center justify-center p-4">
        {/* Background Cyber-Grid Pattern & Mesh Glows */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          <div className="absolute top-[10%] left-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(123,47,255,0.15),transparent_50%)] blur-[80px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.12),transparent_50%)] blur-[90px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md glass rounded-3xl p-8 border border-ghost shadow-[0_0_30px_rgba(0,245,255,0.05)] space-y-6"
        >
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan to-violet flex items-center justify-center shadow-[0_0_20px_rgba(0,245,255,0.4)]">
                <span className="text-void font-orbitron font-black text-2xl">L</span>
              </div>
            </div>
            <h1 className="font-orbitron font-black text-3xl text-[#F0F4FF] mb-1.5 tracking-wider">LUCY ROOM</h1>
            <p className="text-mist font-inter text-xs tracking-wide uppercase text-cyan font-semibold">Join Interactive Speaking Room</p>
          </div>

          <div className="p-4 rounded-xl bg-navy/60 border border-ghost/45 text-center text-xs text-mist leading-relaxed">
            You don't need an account to join! Just enter your nickname below to connect to this voice lounge.
          </div>

          {guestError && (
            <div className="p-3 rounded-lg bg-magenta/10 border border-magenta/30 text-magenta text-xs text-center">
              {guestError}
            </div>
          )}

          <form onSubmit={handleJoinAsGuest} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-mist uppercase tracking-wider block">Your Nickname</label>
              <input
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                maxLength={20}
                className="w-full text-center text-sm font-semibold h-11 bg-navy/50 border border-ghost focus:border-cyan text-[#F0F4FF] rounded-xl outline-none focus:shadow-[0_0_10px_rgba(0,245,255,0.1)] transition-all"
                placeholder="e.g. NeonLearner"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full justify-center bg-cyan text-void shadow-[0_0_15px_rgba(0,245,255,0.3)] hover:shadow-[0_0_25px_rgba(0,245,255,0.5)] font-bold py-3.5"
              loading={isLoggingInGuest}
            >
              Enter Speaking Room <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="text-center border-t border-ghost/40 pt-4">
            <p className="text-xs text-mist">
              Already have an account?{' '}
              <a href={`/login?redirect=/speaking/${roomId}`} className="text-cyan font-bold hover:underline">
                Sign In
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const isLoading = !currentRoom || (isConnected && !agoraJoined && !agoraJoining && !agoraFailed);

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#0B0B1A] flex items-center justify-center p-4">
        {/* Background Mesh Glow */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.12),transparent_50%)] blur-[90px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md glass rounded-3xl p-8 w-full border border-ghost shadow-[0_0_30px_rgba(0,245,255,0.05)] text-center space-y-6"
        >
          <div className="mx-auto w-12 h-12 rounded-xl bg-cyan/10 border border-cyan/30 flex items-center justify-center mb-2">
            <Loader2 className="w-6 h-6 text-cyan animate-spin" />
          </div>

          <div>
            <h2 className="font-orbitron font-black text-xl text-[#F0F4FF] tracking-wider mb-2">
              {joiningRoomId ? 'JOINING SPEAKING LOBBY...' : 'CONNECTING TO SERVER...'}
            </h2>
            <p className="text-xs text-mist font-inter">
              Establishing a low-latency connection with our voice servers.
            </p>
          </div>

          {/* Mic test panel */}
          <div className="p-4 rounded-2xl bg-navy/60 border border-ghost/65 text-left space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-cyan" />
                <span className="text-xs font-exo font-bold text-[#F0F4FF] uppercase tracking-wider">Test Microphone</span>
              </div>
              {micTestActive && <span className="text-[10px] text-pulse font-mono uppercase tracking-widest animate-pulse">Live</span>}
            </div>

            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#0c0c1e] border border-ghost/45">
              <div className="flex-1 h-3 bg-midnight rounded-full overflow-hidden border border-ghost/20 relative">
                <div
                  ref={volumeBarRef}
                  className="h-full bg-gradient-to-r from-cyan to-violet rounded-full transition-all duration-75"
                  style={{ width: '0%' }}
                />
              </div>
              <button
                onClick={() => setMicTestActive(prev => !prev)}
                className={`p-2 rounded-lg border transition-all duration-300 ${
                  micTestActive
                    ? 'bg-cyan/15 border-cyan text-cyan'
                    : 'bg-navy border-ghost text-mist hover:border-violet/50'
                }`}
                title={micTestActive ? 'Stop mic test' : 'Start mic test'}
              >
                {micTestActive ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
              </button>
            </div>

            <div className="flex gap-2 items-start text-[10px] text-mist font-inter leading-relaxed">
              <Info className="w-3.5 h-3.5 text-cyan flex-shrink-0 mt-0.5" />
              <span>
                {micTestActive
                  ? 'Speak to verify input level. Use headphones to prevent echo.'
                  : 'Click the speaker button on the right to test microphone before entering.'}
              </span>
            </div>
          </div>

          {/* Agora status information */}
          {(agoraJoining || (!agoraJoined && !agoraFailed && isConnected)) && (
            <div className="flex items-center justify-center gap-2 text-xs text-cyan font-exo font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Authorizing RTC Agora Credentials...</span>
            </div>
          )}

          <p className="text-xs text-mist/60 font-mono">
            {joiningRoomId ? 'Connecting channel token...' : 'Waiting for socket response...'}
          </p>
        </motion.div>
      </div>
    );
  }

  return <AgoraRoom />;
}
