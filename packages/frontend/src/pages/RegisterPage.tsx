// src/pages/RegisterPage.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-magenta/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-violet/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center shadow-cyan">
              <span className="text-void font-orbitron font-black text-3xl">L</span>
            </div>
          </div>
          <h1 className="font-orbitron font-black text-4xl text-[#F0F4FF] mb-2">LUCY</h1>
          <p className="text-mist font-inter text-sm">Join the language revolution</p>
        </div>

        <div className="glass rounded-2xl p-8 shadow-card">
          <h2 className="font-orbitron font-bold text-xl text-[#F0F4FF] mb-6 text-center">Create Account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-magenta/10 border border-magenta/30 text-magenta text-sm">
              {error}
              <button onClick={clearError} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Persona selector */}
            <div>
              <label className="block text-sm font-exo font-medium text-mist mb-2">Choose Your Avatar</label>
              <div className="flex gap-3 justify-center">
                {[1, 2, 3, 4, 5].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPersonaId(id)}
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${PERSONA_GRADIENTS[id]} flex items-center justify-center
                      font-orbitron font-bold text-white transition-all duration-200
                      ${personaId === id ? 'ring-2 ring-white scale-110 shadow-cyan' : 'opacity-60 hover:opacity-90'}`}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist" />
              <Input
                placeholder="Display name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="pl-10"
                required
                minLength={2}
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist" />
              <Input
                type="password"
                placeholder="Password (min 6 chars)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-10"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" loading={isLoading}>
              Create Account <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-4 p-3 rounded-lg bg-pulse/10 border border-pulse/20">
            <p className="text-xs text-pulse font-exo font-semibold text-center">
              Welcome bonus: Get $100 virtual coins on signup!
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-mist text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
