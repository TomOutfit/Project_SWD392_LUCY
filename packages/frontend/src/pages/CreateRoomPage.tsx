// src/pages/CreateRoomPage.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic2, Globe, BookOpen, Settings2, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { levelsApi, roomsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
import { Button } from '@/components/ui/Button';
import type { Level, Language } from '@/types/index';
import { LANG_FLAGS, LANG_NAMES, STAGE_NAMES } from '@/types/index';

export default function CreateRoomPage() {
  const { user } = useAuthStore();
  const { connectSocket, joinRoom, selectedMicrophoneId, switchMicrophone } = useRoomStore();
  const navigate = useNavigate();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [previewMonitoring, setPreviewMonitoring] = useState(false);
  const [form, setForm] = useState({
    name: '',
    language: 'EN' as Language,
    levelId: 1,
  });

  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => stream.getTracks().forEach(t => t.stop()));
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        setMicrophones(audioInputs);
        if (audioInputs.length > 0 && !useRoomStore.getState().selectedMicrophoneId) {
          useRoomStore.getState().switchMicrophone(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error fetching devices', err);
      }
    };
    getDevices();
  }, []);

  const volumeBarRef = useRef<HTMLDivElement>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const togglePreviewMonitoring = () => {
    const newState = !previewMonitoring;
    setPreviewMonitoring(newState);

    if (gainNodeRef.current && audioContextRef.current) {
      if (newState) {
        gainNodeRef.current.gain.value = 0.3;
        gainNodeRef.current.connect(audioContextRef.current.destination);
      } else {
        gainNodeRef.current.gain.value = 0;
        gainNodeRef.current.disconnect();
      }
    }
  };

  useEffect(() => {
    let audioContext: AudioContext;
    let analyzer: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let gainNode: GainNode;
    let streamDest: MediaStreamAudioDestinationNode;
    let raf: number;
    let activeStream: MediaStream;

    const startAudio = async () => {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          audio: selectedMicrophoneId ? { deviceId: { exact: selectedMicrophoneId } } : true
        });
        audioContext = new window.AudioContext();
        audioContextRef.current = audioContext;
        analyzer = audioContext.createAnalyser();
        gainNode = audioContext.createGain();
        gainNode.gain.value = previewMonitoring ? 0.3 : 0;
        streamDest = audioContext.createMediaStreamDestination();
        microphone = audioContext.createMediaStreamSource(activeStream);

        microphone.connect(analyzer);
        microphone.connect(gainNode);
        gainNode.connect(streamDest);

        if (previewMonitoring) {
          gainNode.connect(audioContext.destination);
        }

        gainNodeRef.current = gainNode;
        streamDestRef.current = streamDest;

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
        console.error('[CreateRoomPage] Audio preview error:', err);
      }
    };
    startAudio();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
      audioContextRef.current = null;
      gainNodeRef.current = null;
      streamDestRef.current = null;
    };
  }, [selectedMicrophoneId]);

  useEffect(() => {
    if (!user || user.role === 'LUCY') {
      navigate('/');
      return;
    }
    connectSocket(user.id, user.displayName, user.personaId, user.role, '');
    levelsApi.all().then(r => {
      setLevels(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id, navigate]);

  const filteredLevels = levels.filter(l => l.language === form.language);
  const selectedLevel = levels.find(l => l.id === form.levelId);

  const handleCreate = async () => {
    if (!form.name.trim() || !user) return;
    setCreating(true);
    try {
      const { data } = await roomsApi.create({
        name: form.name,
        hostId: user.id,
        hostName: user.displayName,
        hostPersonaId: user.personaId,
        hostRole: user.role,
        language: form.language,
        levelId: form.levelId,
        levelName: selectedLevel?.name || `Level ${form.levelId}`,
      });
      joinRoom(data.id);
      navigate(`/speaking/${data.id}`);
    } catch {
      alert('Failed to create room');
    }
    setCreating(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 relative">
      <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(123,47,255,0.06),transparent_50%)] blur-[80px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2.5 mb-2">
          <Mic2 className="w-6 h-6 text-cyan" />
          <h1 className="font-orbitron font-black text-2xl text-[#F0F4FF] tracking-wider">Host a Lobby</h1>
        </div>
        <p className="text-mist text-sm mb-8">Setup a live speaking session to practice with other members</p>

        <div className="glass rounded-2xl p-6 space-y-6 border border-ghost shadow-[0_0_30px_rgba(0,245,255,0.02)]">
          {/* Room Name */}
          <div>
            <label className="text-xs font-exo font-bold text-mist mb-2 block uppercase tracking-widest">Lobby Name</label>
            <input
              className="input-field bg-navy/40 border-ghost focus:border-cyan text-[#F0F4FF] outline-none rounded-xl px-4 py-3 text-sm w-full"
              placeholder="e.g. Advanced English Chat — Tech & Philosophy"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Language selection cards */}
          <div>
            <label className="text-xs font-exo font-bold text-mist mb-2 block uppercase tracking-widest flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan" /> Select Language
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['EN', 'ZH', 'JA'] as Language[]).map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, language: lang, levelId: levels.find(l => l.language === lang)?.id || 1 }))}
                  className={`p-4 rounded-xl border text-center transition-all duration-300 ${
                    form.language === lang
                      ? 'border-cyan bg-cyan/10 shadow-[0_0_15px_rgba(0,245,255,0.1)]'
                      : 'border-ghost hover:border-violet/40 bg-navy/35'
                  }`}
                >
                  <span className="text-3xl block mb-2">{LANG_FLAGS[lang]}</span>
                  <span className="text-sm font-exo font-bold text-[#F0F4FF]">{LANG_NAMES[lang]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Curriculum level selector grid */}
          <div>
            <label className="text-xs font-exo font-bold text-mist mb-2 block uppercase tracking-widest flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-violet" /> Level Milestone
            </label>
            {loading ? (
              <div className="h-24 skeleton rounded-xl bg-navy/30" />
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredLevels.map(lvl => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, levelId: lvl.id }))}
                    className={`p-2 rounded-lg border text-center transition-all duration-200 ${
                      form.levelId === lvl.id
                        ? 'border-cyan bg-cyan/20 text-[#F0F4FF]'
                        : 'border-ghost/60 hover:border-cyan/40 bg-navy/20 text-mist'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold">{lvl.id}</span>
                    <br />
                    <span className="text-[8px] uppercase tracking-wider font-semibold opacity-85">{STAGE_NAMES[lvl.stage]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Level Details preview */}
          {selectedLevel && (
            <div className="p-4 rounded-xl bg-navy border border-ghost flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-cyan flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-mist uppercase tracking-widest font-bold">Selected Level Details</p>
                <p className="font-exo font-bold text-cyan text-sm">{selectedLevel.name}</p>
                <p className="text-xs text-mist mt-0.5">Stage {selectedLevel.stage} • Sub-level {selectedLevel.subLevel}</p>
              </div>
            </div>
          )}

          {/* Microphone configuration */}
          <div className="pt-2 border-t border-ghost/40">
            <label className="text-xs font-exo font-bold text-mist mb-3 block uppercase tracking-widest flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-amber" /> Audio Device Settings
            </label>

            <div className="flex items-center gap-3 mb-4 px-2">
              <Mic2 className="w-5 h-5 text-mist" />
              <div className="flex-1 h-3 bg-[#0c0c1e] rounded-full overflow-hidden border border-ghost/60 relative">
                <div
                  ref={volumeBarRef}
                  className="h-full bg-gradient-to-r from-cyan to-violet rounded-full transition-all duration-75"
                  style={{ width: '0%' }}
                />
              </div>
              <button
                onClick={togglePreviewMonitoring}
                className={`p-2.5 rounded-lg border transition-all duration-300 ${
                  previewMonitoring
                    ? 'bg-cyan/15 border-cyan text-cyan'
                    : 'bg-navy/50 border-ghost text-mist hover:border-violet/50'
                }`}
                title={previewMonitoring ? 'Disable monitoring' : 'Enable monitoring (hear yourself)'}
              >
                {previewMonitoring ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
              </button>
            </div>
            {previewMonitoring && (
              <p className="text-[11px] text-cyan px-2 mb-3">
                🔉 Audio monitoring active. Please use headphones to avoid echo loop.
              </p>
            )}

            <select
              className="w-full bg-navy/60 border border-ghost rounded-xl px-4 py-3.5 text-sm text-[#F0F4FF] outline-none focus:border-cyan transition-all duration-300"
              value={selectedMicrophoneId || ''}
              onChange={(e) => switchMicrophone(e.target.value)}
            >
              {microphones.length === 0 && <option value="">Default Microphone Device</option>}
              {microphones.map((mic, idx) => (
                <option key={mic.deviceId || `mic-${idx}`} value={mic.deviceId}>
                  {mic.label || `Microphone ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          <Button className="w-full bg-cyan text-void shadow-[0_0_15px_rgba(0,245,255,0.3)] hover:shadow-[0_0_25px_rgba(0,245,255,0.5)] font-bold py-3.5" onClick={handleCreate} loading={creating} disabled={!form.name.trim()}>
            <Mic2 className="w-4 h-4 mr-1.5" /> Launch Lobby Now
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
