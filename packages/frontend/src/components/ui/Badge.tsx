// src/components/ui/Badge.tsx
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'violet' | 'magenta' | 'amber' | 'pulse';
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = 'cyan', className = '', dot }: BadgeProps) {
  const variants: Record<string, string> = {
    cyan: 'bg-cyan/15 text-cyan border-cyan/30',
    violet: 'bg-violet/15 text-violet border-violet/30',
    magenta: 'bg-magenta/15 text-magenta border-magenta/30',
    amber: 'bg-amber/15 text-amber border-amber/30',
    pulse: 'bg-pulse/15 text-pulse border-pulse/30',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-exo font-semibold border ${variants[variant]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-glow-dot" />}
      {children}
    </span>
  );
}
