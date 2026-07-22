// src/components/RoomCard.tsx
import { motion } from 'framer-motion';
import { Users, Zap, Lock } from 'lucide-react';
import type { Room } from '@/types/index';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { LANG_FLAGS, LANG_NAMES, STAGE_NAMES } from '@/types/index';
import { useAuthStore } from '@/stores/authStore';
import { isRoomLevelLocked, getUserLevel } from '@/utils/levelUtils';
import toast from 'react-hot-toast';

interface RoomCardProps {
  room: Room;
  onJoin: (room: Room) => void;
}

export function RoomCard({ room, onJoin }: RoomCardProps) {
  const { user } = useAuthStore();
  const stageName = STAGE_NAMES[Math.ceil(room.levelId / 34)] || 'Beginner';
  const langColor = room.language === 'EN' ? 'cyan' : room.language === 'ZH' ? 'amber' : 'magenta';
  
  const isLocked = isRoomLevelLocked(room.levelId, user?.xp, user?.role);
  const userLvl = getUserLevel(user?.xp, user?.role);

  const handleClick = () => {
    if (isLocked) {
      toast.error(`🔒 Room Locked! Requires Level ${room.levelId} (Your level: Level ${userLvl}). Earn XP in lower-level rooms to unlock!`, {
        duration: 4000,
      });
      return;
    }
    onJoin(room);
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className={`card cursor-pointer group relative overflow-hidden transition-all ${
        isLocked ? 'opacity-75 border-amber/30 bg-navy/30 hover:border-amber/60' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{LANG_FLAGS[room.language]}</span>
          <Badge variant={langColor as any}>{LANG_NAMES[room.language]}</Badge>
        </div>
        {isLocked ? (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber bg-amber/15 border border-amber/40 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(255,191,0,0.2)]">
            <Lock className="w-3 h-3 text-amber" />
            Lvl {room.levelId} Locked
          </span>
        ) : (
          <LiveIndicator />
        )}
      </div>

      <h3 className="text-[#F0F4FF] font-exo font-semibold text-sm mb-1 truncate group-hover:text-cyan transition-colors flex items-center justify-between">
        <span className="truncate">{room.name}</span>
      </h3>
      <p className="text-xs text-mist mb-3">{room.levelName}</p>

      <div className="flex items-center gap-3 mb-3">
        <Avatar personaId={room.hostPersonaId} name={room.hostName} size="sm" showBadge role={room.hostRole} />
        <div>
          <p className="text-xs text-mist">Host</p>
          <p className="text-xs font-semibold text-[#F0F4FF]">{room.hostName}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-ghost pt-3">
        <div className="flex items-center gap-1.5 text-mist">
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs">{room.participantCount}</span>
        </div>
        <Badge variant={isLocked ? 'amber' : (langColor as any)} dot>
          {stageName} • Level {room.levelId}
        </Badge>
      </div>

      {room.state === 'Transition' && (
        <div className="mt-2 flex items-center gap-1.5 text-amber text-xs font-exo">
          <Zap className="w-3 h-3" />
          Stage changing...
        </div>
      )}
    </motion.div>
  );
}
