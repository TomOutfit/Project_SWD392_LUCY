// src/pages/CreateRoomPage.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic2, Globe, BookOpen, Settings2 } from 'lucide-react';
import { levelsApi, roomsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
import { Button } from '@/components/ui/Button';
import type { Level, Language } from '@/types/index';
import { LANG_FLAGS, LANG_NAMES, STAGE_NAMES } from '@/types/index';

export default function CreateRoomPage() {
  const { user } = useAuthStore();
  const { connectSocket, joinRoom, selectedMicrophoneId, setSelectedMicrophone } = useRoomStore();
  const navigate = useNavigate();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
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
          useRoomStore.getState().setSelectedMicrophone(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error fetching devices', err);
      }
    };
    getDevices();
  }, []);

  const volumeBarRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    let audioContext: AudioContext;
    let analyzer: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let raf: number;
    let activeStream: MediaStream;

    const startAudio = async () => {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          audio: selectedMicrophoneId ? { deviceId: { exact: selectedMicrophoneId } } : true
        });
        audioContext = new window.AudioContext();
        analyzer = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(activeStream);
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
          const vol = sum / bufferLength; // 0 to 255
          if (volumeBarRef.current) {
            volumeBarRef.current.style.width = `${Math.min(100, (vol / 60) * 100)}%`;
          }
          raf = requestAnimationFrame(updateVol);
        };
        updateVol();
      } catch (err) {
        // user denied or no mic
      }
    };
    startAudio();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
      if (activeStream) activeStream.getTracks().forEach(t => t.stop());
    };
  }, [selectedMicrophoneId]);

  useEffect(() => {
    if (!user || user.role === 'LUCY') {
      navigate('/');
      return;
    }
    connectSocket(user.id, user.displayName, user.personaId, user.role);
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-orbitron font-bold text-2xl text-[#F0F4FF] mb-2">Create a Room</h1>
        <p className="text-mist text-sm mb-8">Host a live session for other learners</p>

        <div className="glass rounded-2xl p-6 space-y-6">
          {/* Room Name */}
          <div>
            <label className="text-sm font-exo font-medium text-mist mb-2 block">Room Name</label>
            <input
              className="input-field"
              placeholder="e.g. Beginner English Chat — Level 5"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Language */}
          <div>
            <label className="text-sm font-exo font-medium text-mist mb-2 flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> Language
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['EN', 'ZH', 'JA'] as Language[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => setForm(f => ({ ...f, language: lang, levelId: levels.find(l => l.language === lang)?.id || 1 }))}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    form.language === lang ? 'border-cyan bg-cyan/10' : 'border-ghost hover:border-violet/50'
                  }`}
                >
                  <span className="text-3xl block mb-2">{LANG_FLAGS[lang]}</span>
                  <span className="text-sm font-exo font-semibold text-[#F0F4FF]">{LANG_NAMES[lang]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <label className="text-sm font-exo font-medium text-mist mb-2 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> Level
            </label>
            {loading ? (
              <div className="h-20 skeleton rounded-xl" />
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredLevels.map(lvl => (
                  <button
                    key={lvl.id}
                    onClick={() => setForm(f => ({ ...f, levelId: lvl.id }))}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      form.levelId === lvl.id ? 'border-cyan bg-cyan/10' : 'border-ghost hover:border-violet/50'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold text-[#F0F4FF]">{lvl.id}</span>
                    <br />
                    <span className="text-[8px] text-mist">{STAGE_NAMES[lvl.stage]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {selectedLevel && (
            <div className="p-4 rounded-xl bg-navy border border-ghost">
              <p className="text-xs text-mist mb-1">Selected:</p>
              <p className="font-exo font-semibold text-cyan">{selectedLevel.name}</p>
              <p className="text-xs text-mist mt-1">Stage {selectedLevel.stage} • Sub-level {selectedLevel.subLevel}</p>
            </div>
          )}

          {/* Microphone Selection */}
          <div>
            <label className="text-sm font-exo font-medium text-mist mb-2 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4" /> Microphone
            </label>
            
            <div className="flex items-center gap-3 mb-3 px-2">
              <Mic2 className="w-5 h-5 text-mist" />
              <div className="flex-1 h-3 bg-midnight rounded-full overflow-hidden border border-ghost">
                <div 
                  ref={volumeBarRef}
                  className="h-full bg-[#1A73E8] rounded-full transition-all duration-75"
                  style={{ width: '0%' }}
                />
              </div>
            </div>

            <select
              className="w-full bg-midnight border border-ghost rounded-xl px-4 py-3 text-sm text-[#F0F4FF] outline-none focus:border-cyan transition-all"
              value={selectedMicrophoneId || ''}
              onChange={(e) => setSelectedMicrophone(e.target.value)}
            >
              {microphones.length === 0 && <option value="">Default Microphone</option>}
              {microphones.map((mic, idx) => (
                <option key={mic.deviceId || `mic-${idx}`} value={mic.deviceId}>
                  {mic.label || `Microphone ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          <Button className="w-full" onClick={handleCreate} loading={creating} disabled={!form.name.trim()}>
            <Mic2 className="w-4 h-4" /> Go Live Now
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
