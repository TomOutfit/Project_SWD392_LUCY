// src/pages/HomePage.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Users, Mic2, Trophy, Sparkles, Play } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'EN' | 'ZH' | 'JA'>('EN');
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0B0B1A]">
      {/* Background Cyber-Grid Pattern & Mesh Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(0,245,255,0.15),transparent_50%)] blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(123,47,255,0.15),transparent_50%)] blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 md:pt-32 md:pb-24 px-4 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan/10 border border-cyan/30 shadow-[0_0_15px_rgba(0,245,255,0.1)]"
            >
              <Zap className="w-4 h-4 text-cyan animate-pulse" />
              <span className="text-xs font-exo font-bold text-cyan tracking-wider uppercase">
                Anonymity-First Language Café
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-orbitron font-black text-4xl sm:text-5xl md:text-7xl text-[#F0F4FF] leading-none"
            >
              Speak Freely,<br />
              <span className="bg-gradient-to-r from-cyan via-violet to-magenta bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,245,255,0.2)]">
                Learn Together
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg md:text-xl text-mist font-inter max-w-2xl leading-relaxed"
            >
              Step into a neon-lit cyber space for conversational learning. Practice English, Chinese, and Japanese with complete anonymity, guided by certified mentors.
            </motion.p>

            {/* Simulated Live Statistics */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="grid grid-cols-3 gap-4 p-4 rounded-xl glass border border-ghost max-w-lg"
            >
              <div className="text-center md:text-left">
                <span className="block text-xl font-bold font-orbitron text-cyan">42+</span>
                <span className="text-[10px] uppercase font-exo text-mist tracking-widest">Active Rooms</span>
              </div>
              <div className="text-center md:text-left border-x border-ghost">
                <span className="block text-xl font-bold font-orbitron text-violet">1.2K+</span>
                <span className="text-[10px] uppercase font-exo text-mist tracking-widest">Live Speakers</span>
              </div>
              <div className="text-center md:text-left">
                <span className="block text-xl font-bold font-orbitron text-pulse">98.4%</span>
                <span className="text-[10px] uppercase font-exo text-mist tracking-widest">Fluency Boost</span>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-4 pt-2"
            >
              <Link to="/browse">
                <Button className="text-base px-8 py-3.5 bg-cyan text-void shadow-[0_0_20px_rgba(0,245,255,0.4)] hover:shadow-[0_0_30px_rgba(0,245,255,0.6)] font-bold transition-all duration-300">
                  <Play className="w-4 h-4 mr-2 fill-current" /> Enter Speaking Rooms
                </Button>
              </Link>
              {user && user.role !== 'LUCY' ? (
                <Link to="/create-room">
                  <Button variant="secondary" className="text-base px-8 py-3.5 border border-violet text-violet hover:bg-violet/10 shadow-[0_0_15px_rgba(123,47,255,0.2)] font-semibold transition-all duration-300">
                    Host a Lobby
                  </Button>
                </Link>
              ) : (
                <Link to="/profile">
                  <Button variant="secondary" className="text-base px-8 py-3.5 border border-ghost hover:bg-navy/50 font-semibold transition-all duration-300">
                    Manage Wallet
                  </Button>
                </Link>
              )}
            </motion.div>
          </div>

          {/* Hero Right Visualizer Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative glass border border-ghost rounded-2xl p-6 shadow-[0_0_30px_rgba(123,47,255,0.1)] overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-magenta/10 rounded-full blur-xl pointer-events-none" />

              {/* Speaker Card Grid */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-ghost">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pulse animate-ping" />
                    <span className="text-xs font-exo uppercase tracking-widest text-[#F0F4FF]">Room #85 Active</span>
                  </div>
                  <span className="text-xs font-mono text-[#F0F4FF] bg-navy border border-ghost px-2 py-0.5 rounded">Level 42</span>
                </div>

                {/* Simulated Speakers */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#12122A] border border-ghost">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-white shadow-cyan/30 shadow-md">
                        SO
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#F0F4FF]">Anonymous Silent Owl</p>
                        <p className="text-[10px] font-mono text-cyan uppercase tracking-wider">Learner</p>
                      </div>
                    </div>
                    {/* Pulsing Audio Bar */}
                    <div className="flex items-end gap-1 h-5">
                      <motion.div animate={{ height: [4, 16, 6, 12, 4] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }} className="w-1 bg-cyan rounded-full" />
                      <motion.div animate={{ height: [8, 20, 10, 18, 8] }} transition={{ repeat: Infinity, duration: 1.0, ease: "easeInOut", delay: 0.2 }} className="w-1 bg-cyan rounded-full" />
                      <motion.div animate={{ height: [6, 12, 4, 14, 6] }} transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut", delay: 0.1 }} className="w-1 bg-cyan rounded-full" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#12122A]/70 border border-ghost/50 opacity-80">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-violet/30 shadow-md">
                        MC
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#F0F4FF]">Anonymous Swift Cheetah</p>
                        <p className="text-[10px] font-mono text-violet uppercase tracking-wider">Pro</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-1 h-5">
                      <div className="w-1 h-1 bg-mist/30 rounded-full" />
                      <div className="w-1 h-1 bg-mist/30 rounded-full" />
                      <div className="w-1 h-1 bg-mist/30 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Cyber Gift Rain simulation widget */}
                <div className="pt-2">
                  <div className="rounded-xl bg-magenta/5 border border-magenta/20 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-magenta animate-bounce" />
                      <span className="text-xs text-mist font-inter">
                        <strong className="text-magenta">Anonymous Swift Cheetah</strong> received <strong className="text-amber">Cyber Arcade Gift</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-orbitron font-semibold text-amber bg-amber/10 px-2 py-0.5 rounded">+$50</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Curriculum Level Section */}
      <section className="relative z-10 py-16 px-4 max-w-7xl mx-auto border-t border-ghost/40">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-orbitron font-bold text-3xl text-[#F0F4FF] mb-3">
            Explore the <span className="text-cyan">100-Level</span> Curriculum
          </h2>
          <p className="text-mist text-sm font-inter">
            Select your language of choice to preview dynamic milestones, structured to systematically build vocabulary, grammar, and pronunciation.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center gap-3 mb-10">
          {(['EN', 'ZH', 'JA'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveTab(lang)}
              className={`px-6 py-2 rounded-full font-exo font-bold text-sm transition-all duration-300 border
                ${activeTab === lang
                  ? 'bg-cyan text-void border-cyan shadow-[0_0_15px_rgba(0,245,255,0.3)]'
                  : 'bg-navy/50 text-mist border-ghost hover:text-[#F0F4FF] hover:border-mist'}`}
            >
              {lang === 'EN' ? '🇺🇸 English' : lang === 'ZH' ? '🇨🇳 Chinese' : '🇯🇵 Japanese'}
            </button>
          ))}
        </div>

        {/* Level Path Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {CURRICULUM_STAGES[activeTab].map((stage, i) => (
            <motion.div
              key={stage.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="card relative group hover:border-cyan/40 transition-colors"
            >
              <div className="absolute top-0 right-0 p-3">
                <span className="text-xs font-mono font-bold text-cyan bg-cyan/10 border border-cyan/30 px-2 py-0.5 rounded">
                  {stage.range}
                </span>
              </div>
              <h3 className="font-orbitron font-bold text-lg text-[#F0F4FF] mb-2">{stage.title}</h3>
              <p className="text-xs text-mist font-exo uppercase tracking-wider mb-4">{stage.levelName}</p>

              <div className="space-y-3 pt-3 border-t border-ghost/40">
                {stage.milestones.map((milestone) => (
                  <div key={milestone.title} className="flex gap-3 text-left">
                    <span className="w-1.5 h-1.5 rounded-full bg-pulse mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[#F0F4FF]">{milestone.title}</p>
                      <p className="text-[10px] text-mist">{milestone.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why LUCY - Cyber-Grid Cards */}
      <section className="relative z-10 py-16 px-4 max-w-7xl mx-auto border-t border-ghost/40">
        <h2 className="font-orbitron font-bold text-3xl text-[#F0F4FF] mb-12 text-center">
          Why <span className="bg-gradient-to-r from-cyan to-violet bg-clip-text text-transparent">LUCY</span> Platform?
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="card relative overflow-hidden transition-all duration-300 hover:scale-[1.02] border border-ghost hover:border-cyan/30"
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 transition-transform duration-300 ${hoveredFeature === i ? 'scale-110 shadow-lg' : ''}`}>
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-exo font-bold text-[#F0F4FF] text-lg mb-2">{f.title}</h3>
              <p className="text-mist text-sm font-inter leading-relaxed">{f.desc}</p>

              {/* Bottom Glow bar on Hover */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${f.gradient} transition-transform duration-300 origin-left ${hoveredFeature === i ? 'scale-x-100' : 'scale-x-0'}`} />
            </div>
          ))}
        </div>
      </section>

      {/* Plan / Roles Comparison Section */}
      <section className="relative z-10 py-16 px-4 max-w-7xl mx-auto border-t border-ghost/40 mb-10">
        <h2 className="font-orbitron font-bold text-3xl text-[#F0F4FF] mb-4 text-center">
          Choose Your <span className="text-magenta">Role Path</span>
        </h2>
        <p className="text-mist text-sm font-inter text-center max-w-xl mx-auto mb-12">
          Pick your level of involvement. Upgrade to access host features, record session podcasts, and monetize your speaking lobby.
        </p>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {TIERS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`card relative flex flex-col justify-between overflow-hidden border ${t.popular ? 'border-violet shadow-[0_0_20px_rgba(123,47,255,0.15)] ring-1 ring-violet' : 'border-ghost'}`}
            >
              {t.popular && (
                <div className="absolute top-0 right-0 bg-violet text-[#F0F4FF] text-[10px] font-exo font-black px-3 py-1 rounded-bl-lg tracking-widest uppercase">
                  RECOMMENDED
                </div>
              )}
              <div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.gradient} flex items-center justify-center mb-5`}>
                  <t.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-orbitron font-black text-2xl text-[#F0F4FF] mb-1">{t.name}</h3>
                <p className="text-xs text-mist mb-5 font-exo uppercase tracking-widest font-bold">{t.subtitle}</p>

                <ul className="space-y-3.5 mb-8">
                  {t.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-mist font-inter">
                      <span className="w-1.5 h-1.5 rounded-full bg-pulse mt-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-ghost/40">
                <Link to="/browse">
                  <Button variant={t.popular ? 'primary' : 'secondary'} className="w-full justify-center text-sm py-3 font-bold font-exo">
                    Start as {t.name}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

const FEATURES = [
  { icon: Users, title: 'Anonymity-First Space', desc: 'Real identity is strictly protected. Real-time aliases (e.g. Silent Owl) break social anxiety and boost natural confidence.', gradient: 'from-cyan to-blue-600' },
  { icon: Zap, title: 'Agora Audio Engine', desc: 'Powered by industry-grade RTC technology. Millisecond-latency voice streaming simulates sitting right next to your partners.', gradient: 'from-amber to-orange-600' },
  { icon: Trophy, title: 'Dynamic Gamification', desc: 'Level up from 1 to 100, compete on the gift-received leaderboard, and send/receive real value through virtual arcade tokens.', gradient: 'from-violet to-purple-700' },
];

const TIERS = [
  { icon: Users, name: 'LUCY', subtitle: 'Anonymous Learner', gradient: 'from-cyan to-blue-600', popular: false,
    features: ['Join any room level anonymously', 'Participate in voice hand-raise queue', 'Generate random animal persona avatar', 'Send free chat reactions'] },
  { icon: Mic2, name: 'LUCY Pro', subtitle: 'Lobby Mentor', gradient: 'from-violet to-purple-700', popular: true,
    features: ['Create & moderate custom lobbies', 'Pin educational PDF materials', 'Earn virtual gifts from listeners', 'Access profile learner analytics'] },
  { icon: Trophy, name: 'LUCY Super', subtitle: 'Premium Creator', gradient: 'from-magenta to-pink-700', popular: false,
    features: ['Record room conversations to podcasts', 'Full monetization on gift earnings', 'Priority Discovery on active lobbies', 'Super Badge status indicators'] },
];

const CURRICULUM_STAGES = {
  EN: [
    {
      title: 'Beginner Stage',
      range: 'L1 - L30',
      levelName: 'Foundation Speaking',
      milestones: [
        { title: 'Level 1: Café Conversation', desc: 'Greet strangers, order arcade snacks, introduce yourself.' },
        { title: 'Level 15: Urban Navigations', desc: 'Ask directions, describe sights, purchase tickets.' },
      ]
    },
    {
      title: 'Intermediate Stage',
      range: 'L31 - L70',
      levelName: 'Fluid Interactions',
      milestones: [
        { title: 'Level 35: Job Interview Simulation', desc: 'Highlight career path, roleplay scenarios.' },
        { title: 'Level 60: Podcast Hosting', desc: 'Lead discussions, express detailed opinions.' },
      ]
    },
    {
      title: 'Advanced Stage',
      range: 'L71 - L100',
      levelName: 'Critical Discourse',
      milestones: [
        { title: 'Level 75: Business Negotiations', desc: 'Handle client objections, sign contracts.' },
        { title: 'Level 100: Philosophy & Tech Debate', desc: 'Discuss AI ethics, space colonisation.' },
      ]
    }
  ],
  ZH: [
    {
      title: '初级阶段',
      range: 'L1 - L30',
      levelName: '汉语入门',
      milestones: [
        { title: 'Level 1: 茶馆闲聊', desc: '学习基本问候，点茶和点心。' },
        { title: 'Level 15: 街头问路', desc: '如何询问方向，在北京胡同里导航。' },
      ]
    },
    {
      title: '中级阶段',
      range: 'L31 - L70',
      levelName: '流利沟通',
      milestones: [
        { title: 'Level 35: 职场情景', desc: '模拟中文面试，介绍专业技能。' },
        { title: 'Level 60: 社交话题', desc: '用中文谈论热门新闻和文化习俗。' },
      ]
    },
    {
      title: '高级阶段',
      range: 'L71 - L100',
      levelName: '深度辩论',
      milestones: [
        { title: 'Level 75: 商务谈判', desc: '讨论合作协议，表达条款底线。' },
        { title: 'Level 100: 科技与未来', desc: '用高级学术词汇辩论AI未来走向。' },
      ]
    }
  ],
  JA: [
    {
      title: '初級ステージ',
      range: 'L1 - L30',
      levelName: '日本語の基礎',
      milestones: [
        { title: 'Level 1: カフェでの挨拶', desc: '注文の仕方と自己紹介の練習。' },
        { title: 'Level 15: 居酒屋での注文', desc: 'オススメを聞き、日本酒を注文。' },
      ]
    },
    {
      title: '中級ステージ',
      range: 'L31 - L70',
      levelName: '日常会話の発展',
      milestones: [
        { title: 'Level 35: アルバイト面接', desc: 'シフトの希望や長所のアピール。' },
        { title: 'Level 60: アニメと文化議論', desc: '好きな作品やトレンドについて熱く語る。' },
      ]
    },
    {
      title: '上級ステージ',
      range: 'L71 - L100',
      levelName: 'ビジネスと討論',
      milestones: [
        { title: 'Level 75: 商談と敬語', desc: '取引先との条件交渉、ビジネスメール。' },
        { title: 'Level 100: 社会問題討論', desc: '環境問題や未来の働き方に関するディベート。' },
      ]
    }
  ],
};
