// src/components/Navbar.tsx
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Wallet, Trophy, BookOpen, Mic2, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  const roleVariant = user.role === 'SUPER' ? 'magenta' : user.role === 'PRO' ? 'violet' : 'cyan';

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass border-b border-ghost sticky top-0 z-40"
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center">
            <span className="text-void font-orbitron font-black text-sm">L</span>
          </div>
          <span className="font-orbitron font-bold text-[#F0F4FF] text-lg group-hover:text-cyan transition-colors">
            LUCY
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <NavLink to="/browse" icon={<BookOpen className="w-4 h-4" />} label="Rooms" />
          {user.role !== 'LUCY' && (
            <>
              <NavLink to="/create-room" icon={<Mic2 className="w-4 h-4" />} label="Create" />
              <NavLink to="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
              <NavLink to="/podcasts" icon={<Mic2 className="w-4 h-4" />} label="Podcasts" />
            </>
          )}
          <NavLink to="/leaderboard" icon={<Trophy className="w-4 h-4" />} label="Ranks" />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy border border-ghost">
            <Wallet className="w-3.5 h-3.5 text-amber" />
            <span className="text-xs font-mono font-semibold text-amber">
              ${user.walletBalance.toFixed(2)}
            </span>
          </div>

          <Link to="/profile" className="flex items-center gap-2">
            <Avatar personaId={user.personaId} name={user.displayName} size="sm" showBadge role={user.role} />
            <div className="hidden sm:block">
              <p className="text-xs font-exo font-semibold text-[#F0F4FF]">{user.displayName}</p>
              <Badge variant={roleVariant as 'cyan' | 'violet' | 'magenta'} className="text-[8px]">{user.role}</Badge>
            </div>
          </Link>

          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.nav>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-exo font-medium text-mist
                 hover:text-cyan hover:bg-cyan/5 transition-all duration-200"
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}
