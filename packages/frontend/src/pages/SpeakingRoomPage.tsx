import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AgoraRoom } from '@/components/AgoraRoom';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';

export default function SpeakingRoomPage() {
  const { roomId } = useParams();
  const { currentRoom, isConnected, joiningRoomId, joinRoom, connectSocket } = useRoomStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && roomId && !isConnected) {
      connectSocket(user.id, user.displayName, user.personaId, user.role, roomId);
    } else if (isConnected && !currentRoom && joiningRoomId !== roomId && roomId) {
      joinRoom(roomId);
    }
  }, [user, roomId, isConnected, currentRoom, joiningRoomId, connectSocket, joinRoom]);

  useEffect(() => {
    if (!isConnected && joiningRoomId === null && currentRoom === null && !roomId) {
      const timeout = setTimeout(() => navigate('/browse'), 5000);
      return () => clearTimeout(timeout);
    }
  }, [currentRoom, isConnected, joiningRoomId, navigate, roomId]);

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
