// src/components/ui/Button.tsx
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'magenta' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, children, className = '', ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-exo font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-void';

  const variants: Record<string, string> = {
    primary: 'bg-cyan text-void hover:shadow-cyanHover hover:scale-[1.03] active:scale-[0.97] focus:ring-cyan',
    secondary: 'bg-violet text-white hover:shadow-violet hover:scale-[1.03] active:scale-[0.97] focus:ring-violet',
    magenta: 'bg-magenta text-white hover:shadow-magenta hover:scale-[1.03] active:scale-[0.97] focus:ring-magenta',
    ghost: 'bg-transparent border border-ghost text-mist hover:border-cyan hover:text-cyan hover:scale-[1.02] active:scale-[0.97] focus:ring-ghost',
  };

  const sizes: Record<string, string> = {
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3 text-base',
  };

  return (
    <motion.button
      whileHover={{ scale: loading ? 1 : 1.03 }}
      whileTap={{ scale: loading ? 1 : 0.97 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={loading || (props as any).disabled}
      {...(props as any)}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  );
}
