// src/components/ui/LiveIndicator.tsx
export function LiveIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-magenta opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-magenta" />
      </span>
      <span className="text-xs font-exo font-semibold text-magenta uppercase tracking-wider">LIVE</span>
    </div>
  );
}

export function OnlineCounter({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5 text-mist">
      <div className="w-2 h-2 rounded-full bg-pulse" />
      <span className="text-xs font-inter">{count} online</span>
    </div>
  );
}
