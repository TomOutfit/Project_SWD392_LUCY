// src/components/ui/Avatar.tsx
import { PERSONA_GRADIENTS } from '@/types/index';

interface AvatarProps {
  personaId: number;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
  role?: string;
}

export function Avatar({ personaId, name = '', size = 'md', className = '', showBadge, role }: AvatarProps) {
  const sizeMap = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-20 h-20 text-2xl' };
  const badgeMap: Record<string, string> = { LUCY: 'bg-cyan/20 text-cyan border-cyan/40', PRO: 'bg-violet/20 text-violet border-violet/40', SUPER: 'bg-magenta/20 text-magenta border-magenta/40' };

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const gradient = PERSONA_GRADIENTS[personaId] || PERSONA_GRADIENTS[1];

  return (
    <div className={`relative inline-flex ${className}`}>
      <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-orbitron font-bold text-white ring-2 ring-ghost`}>
        {initials}
      </div>
      {showBadge && role && (
        <span className={`absolute -top-1 -right-1 text-[8px] font-exo font-bold px-1 py-0.5 rounded border ${badgeMap[role] || badgeMap['LUCY']}`}>
          {role}
        </span>
      )}
    </div>
  );
}
