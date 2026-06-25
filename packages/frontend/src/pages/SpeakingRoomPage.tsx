import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgoraRoom } from '@/components/AgoraRoom';
import { useRoomStore } from '@/stores/roomStore';

export default function SpeakingRoomPage() {
  const { currentRoom, isConnected } = useRoomStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected && !currentRoom) {
      const timeout = setTimeout(() => navigate('/browse'), 2500);
      return () => clearTimeout(timeout);
    }
  }, [currentRoom, isConnected, navigate]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center text-mist">
        <div className="max-w-xl glass rounded-3xl p-8">
          <h2 className="font-orbitron text-2xl text-white mb-3">Connecting to Speaking Room...</h2>
          <p className="text-sm text-mist">Please wait a moment while we join your room.</p>
        </div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center text-mist">
        <div className="max-w-xl glass rounded-3xl p-8">
          <h2 className="font-orbitron text-2xl text-white mb-3">Joining your Speaking room...</h2>
          <p className="text-sm text-mist">If the room does not appear, go back to the room list.</p>
        </div>
      </div>
    );
  }

  return <AgoraRoom />;
}
