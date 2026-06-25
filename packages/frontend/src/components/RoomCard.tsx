// src/components/RoomCard.tsx
import { motion } from 'framer-motion';
import { Users, Zap } from 'lucide-react';
import type { Room } from '@/types/index';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { LANG_FLAGS, LANG_NAMES, STAGE_NAMES } from '@/types/index';

interface RoomCardProps {
  room: Room;
  onJoin: (room: Room) => void;
}

export function RoomCard({ room, onJoin }: RoomCardProps) {
  const stageName = STAGE_NAMES[Math.ceil(room.levelId / 34)] || 'Beginner';
  const langColor = room.language === 'EN' ? 'cyan' : room.language === 'ZH' ? 'amber' : 'magenta';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="card cursor-pointer group"
      onClick={() => onJoin(room)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{LANG_FLAGS[room.language]}</span>
          <Badge variant={langColor as any}>{LANG_NAMES[room.language]}</Badge>
        </div>
        <LiveIndicator />
      </div>

      <h3 className="text-[#F0F4FF] font-exo font-semibold text-sm mb-1 truncate group-hover:text-cyan transition-colors">
        {room.name}
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
        <Badge variant={langColor as any} dot>
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
