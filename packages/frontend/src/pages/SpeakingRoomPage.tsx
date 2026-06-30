import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic2, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { AgoraRoom } from '@/components/AgoraRoom';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';

export default function SpeakingRoomPage() {
  const { roomId } = useParams();
  const { currentRoom, isConnected, joiningRoomId, joinRoom, connectSocket, joinAgoraChannel, agoraJoined, agoraJoining, agoraFailed } = useRoomStore();
  const { user } = useAuthStore();

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

  // ── Loading / connecting state ──────────────────────────────────────────────
  const isLoading = !currentRoom || (isConnected && !agoraJoined && !agoraJoining && !agoraFailed);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center text-mist">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl glass rounded-3xl p-8 w-full space-y-6"
        >
          <h2 className="font-orbitron text-2xl text-white mb-3">
            {joiningRoomId ? 'Joining your Speaking room...' : 'Connecting to Speaking Room...'}
          </h2>

          {/* Mic test panel */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mic2 className="w-4 h-4 text-cyan" />
              <span className="text-sm font-medium text-[#F0F4FF]">Test your microphone</span>
            </div>

            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-navy border border-ghost">
              <div className="flex-1 h-3 bg-midnight rounded-full overflow-hidden">
                <div
                  ref={volumeBarRef}
                  className="h-full bg-cyan rounded-full transition-all duration-75"
                  style={{ width: '0%' }}
                />
              </div>
              <button
                onClick={() => setMicTestActive(prev => !prev)}
                className={`p-2 rounded-lg border transition-all ${
                  micTestActive
                    ? 'bg-cyan/20 border-cyan text-cyan'
                    : 'bg-midnight border-ghost text-mist hover:border-violet/50'
                }`}
                title={micTestActive ? 'Stop mic test' : 'Start mic test'}
              >
                {micTestActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>

            {micTestActive && (
              <p className="text-xs text-cyan/80">
                Speak into your microphone to test — you should see the level bar move
              </p>
            )}
            {!micTestActive && (
              <p className="text-xs text-mist">
                Click the speaker icon to test your microphone before joining
              </p>
            )}
          </div>

          {/* Agora join spinner */}
          {(agoraJoining || (!agoraJoined && !agoraFailed && isConnected)) && (
            <div className="flex items-center justify-center gap-2 text-sm text-mist">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Joining Agora channel...</span>
            </div>
          )}

          <p className="text-sm text-mist">
            {joiningRoomId ? 'Please wait while we connect you to the room.' : 'Please wait a moment while we connect to the server.'}
          </p>
        </motion.div>
      </div>
    );
  }

  return <AgoraRoom />;
}
