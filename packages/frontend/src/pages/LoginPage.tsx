// src/pages/LoginPage.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0B0B1A] flex items-center justify-center p-4">
      {/* Background Cyber-Grid Pattern & Mesh Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute top-[10%] left-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(123,47,255,0.15),transparent_50%)] blur-[80px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.12),transparent_50%)] blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan to-violet flex items-center justify-center shadow-[0_0_20px_rgba(0,245,255,0.4)]">
              <span className="text-void font-orbitron font-black text-3xl">L</span>
            </div>
          </div>
          <h1 className="font-orbitron font-black text-4xl text-[#F0F4FF] mb-2 tracking-wider">LUCY</h1>
          <p className="text-mist font-inter text-sm tracking-wide uppercase text-cyan font-semibold">Language Unity Lobby</p>
        </div>

        {/* Form Card */}
        <div className="glass rounded-2xl p-8 shadow-[0_0_30px_rgba(0,245,255,0.05)] border border-ghost">
          <h2 className="font-orbitron font-bold text-xl text-[#F0F4FF] mb-6 text-center">Welcome Back</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-magenta/10 border border-magenta/30 text-magenta text-sm flex justify-between items-center">
              <span>{error}</span>
              <button onClick={clearError} className="ml-2 underline font-semibold">Dismiss</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mist" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-11 bg-navy/50 border-ghost focus:border-cyan text-[#F0F4FF]"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mist" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-11 bg-navy/50 border-ghost focus:border-cyan text-[#F0F4FF]"
                required
              />
            </div>
            <Button type="submit" className="w-full justify-center bg-cyan text-void shadow-[0_0_15px_rgba(0,245,255,0.3)] hover:shadow-[0_0_25px_rgba(0,245,255,0.5)] font-bold py-3.5" loading={isLoading}>
              Sign In <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-mist text-sm">
              New to LUCY?{' '}
              <Link to="/register" className="text-cyan font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Demo credentials info */}
        <div className="mt-4 p-3.5 rounded-xl bg-navy/50 border border-ghost/40 text-center flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-pulse" />
          <p className="text-xs text-mist font-inter">
            Enter sample accounts from <code className="text-[#F0F4FF]">appsettings.json</code> to test different roles.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
