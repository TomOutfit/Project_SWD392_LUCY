import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgoraRoom } from '@/components/AgoraRoom';
import { useRoomStore } from '@/stores/roomStore';

export default function SpeakingRoomPage() {
  const { currentRoom, isConnected, joiningRoomId } = useRoomStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isConnected && joiningRoomId === null && currentRoom === null) {
      const timeout = setTimeout(() => navigate('/browse'), 5000);
      return () => clearTimeout(timeout);
    }
  }, [currentRoom, isConnected, joiningRoomId, navigate]);

  if (!currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center text-mist">
        <div className="max-w-xl glass rounded-3xl p-8">
          <h2 className="font-orbitron text-2xl text-white mb-3">
            {joiningRoomId ? 'Joining your Speaking room...' : 'Connecting to Speaking Room...'}
          </h2>
          <p className="text-sm text-mist">
            {joiningRoomId ? 'Please wait while we connect you to the room.' : 'Please wait a moment while we connect to the server.'}
          </p>
        </div>
      </div>
    );
  }

  return <AgoraRoom />;
}
