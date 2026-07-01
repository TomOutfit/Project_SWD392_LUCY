// src/pages/RegisterPage.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PERSONA_GRADIENTS } from '@/types/index';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [personaId, setPersonaId] = useState(1);
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await register(email, password, displayName, personaId);
    if (ok) navigate('/');
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0B0B1A] flex items-center justify-center p-4">
      {/* Background Cyber-Grid Pattern & Mesh Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute top-[10%] left-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(255,0,245,0.1),transparent_50%)] blur-[80px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.12),transparent_50%)] blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan to-violet flex items-center justify-center shadow-[0_0_20px_rgba(0,245,255,0.4)]">
              <span className="text-void font-orbitron font-black text-3xl">L</span>
            </div>
          </div>
          <h1 className="font-orbitron font-black text-4xl text-[#F0F4FF] mb-2 tracking-wider">LUCY</h1>
          <p className="text-mist font-inter text-sm tracking-wide uppercase text-violet font-semibold">Join the Speech Revolution</p>
        </div>

        {/* Form Card */}
        <div className="glass rounded-2xl p-8 shadow-[0_0_30px_rgba(0,245,255,0.05)] border border-ghost">
          <h2 className="font-orbitron font-bold text-xl text-[#F0F4FF] mb-6 text-center">Create Account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-magenta/10 border border-magenta/30 text-magenta text-sm flex justify-between items-center">
              <span>{error}</span>
              <button onClick={clearError} className="ml-2 underline font-semibold">Dismiss</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Persona selector */}
            <div>
              <label className="block text-xs font-exo font-medium text-mist mb-2 text-center">Choose Your Avatar Gradient</label>
              <div className="flex gap-3 justify-center mb-2">
                {[1, 2, 3, 4, 5].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPersonaId(id)}
                    className={`w-11 h-11 rounded-full bg-gradient-to-br ${PERSONA_GRADIENTS[id]} flex items-center justify-center
                      font-orbitron font-bold text-white transition-all duration-200
                      ${personaId === id ? 'ring-2 ring-white scale-110 shadow-[0_0_15px_rgba(0,245,255,0.5)]' : 'opacity-60 hover:opacity-90'}`}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mist" />
              <Input
                placeholder="Display name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="pl-11 bg-navy/50 border-ghost focus:border-cyan text-[#F0F4FF]"
                required
                minLength={2}
              />
            </div>
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
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-11 bg-navy/50 border-ghost focus:border-cyan text-[#F0F4FF]"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full justify-center bg-cyan text-void shadow-[0_0_15px_rgba(0,245,255,0.3)] hover:shadow-[0_0_25px_rgba(0,245,255,0.5)] font-bold py-3.5" loading={isLoading}>
              Sign Up Now <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Welcome Bonus info banner */}
          <div className="mt-4 p-3 rounded-xl bg-pulse/10 border border-pulse/30 text-center flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-pulse animate-bounce" />
            <p className="text-xs text-pulse font-exo font-bold">
              Starter Gift: $100,000 virtual balance credited instantly!
            </p>
          </div>

          <div className="mt-5 text-center">
            <p className="text-mist text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
