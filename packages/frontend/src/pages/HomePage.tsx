// src/pages/HomePage.tsx
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Users, Mic2, Trophy } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden py-24 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-violet/15 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-cyan/12 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan/10 border border-cyan/30 mb-8">
              <Zap className="w-3.5 h-3.5 text-cyan" />
              <span className="text-xs font-exo font-semibold text-cyan">Real-time Language Practice</span>
            </div>

            <h1 className="font-orbitron font-black text-5xl md:text-7xl text-[#F0F4FF] mb-6 leading-tight">
              Speak Freely,<br />
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-magenta-400 bg-clip-text text-transparent">
                Learn Together
              </span>
            </h1>

            <p className="text-lg md:text-xl text-mist font-inter max-w-2xl mx-auto mb-10 leading-relaxed">
              Anonymous audio rooms for English, Chinese &amp; Japanese learners.
              Practice with strangers, get mentored by pros, become super.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/browse">
                <Button className="text-base px-8 py-3">Join a Room</Button>
              </Link>
              {user && user.role !== 'LUCY' && (
                <Link to="/create-room">
                  <Button variant="secondary" className="text-base px-8 py-3">Host a Room</Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="font-orbitron font-bold text-2xl text-[#F0F4FF] mb-8 text-center">
          Why <span className="text-cyan">LUCY</span>?
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card group">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-exo font-bold text-[#F0F4FF] text-lg mb-2">{f.title}</h3>
              <p className="text-mist text-sm font-inter leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="font-orbitron font-bold text-2xl text-[#F0F4FF] mb-8 text-center">
          Choose Your <span className="text-violet">Path</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {TIERS.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
              className={`card relative overflow-hidden ${t.popular ? 'ring-2 ring-violet' : ''}`}>
              {t.popular && (
                <div className="absolute top-0 right-0 bg-violet text-white text-[10px] font-exo font-bold px-3 py-1 rounded-bl-lg">
                  MOST POPULAR
                </div>
              )}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.gradient} flex items-center justify-center mb-4`}>
                <t.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-orbitron font-bold text-xl text-[#F0F4FF] mb-1">{t.name}</h3>
              <p className="text-xs text-mist mb-4 font-exo uppercase tracking-wider">{t.subtitle}</p>
              <ul className="space-y-2">
                {t.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-mist font-inter">
                    <span className="w-1.5 h-1.5 rounded-full bg-pulse flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

const FEATURES = [
  { icon: Users, title: 'Anonymous Safety', desc: 'Your real identity is hidden. Speak freely without social pressure. Avatar personas protect your privacy.', gradient: 'from-cyan-500 to-blue-600' },
  { icon: Zap, title: 'Real-time Audio', desc: 'Low-latency voice chat powered by Agora SDK. Practice conversations as naturally as face-to-face.', gradient: 'from-amber-500 to-orange-600' },
  { icon: Trophy, title: 'Gamified Progress', desc: 'Earn points, climb leaderboards, receive gifts. Structured 100-level curriculum keeps you growing.', gradient: 'from-violet-500 to-purple-700' },
];

const TIERS = [
  { icon: Users, name: 'LUCY', subtitle: 'Anonymous Learner', gradient: 'from-cyan-500 to-blue-600', popular: false,
    features: ['Join any room anonymously', 'Practice with 100 levels', 'Use avatar personas', 'Join hand-raise queues', 'Send free reactions'] },
  { icon: Mic2, name: 'LUCY Pro', subtitle: 'Become a Mentor', gradient: 'from-violet-500 to-purple-700', popular: true,
    features: ['Create & host rooms', 'Pin learning materials', 'Earn virtual gifts', 'View analytics', 'Build reputation'] },
  { icon: Trophy, name: 'LUCY Super', subtitle: 'Content Creator', gradient: 'from-magenta-500 to-pink-700', popular: false,
    features: ['Record podcasts', 'Create premium content', 'Full monetization', 'Priority discovery', 'Super badge & perks'] },
];
