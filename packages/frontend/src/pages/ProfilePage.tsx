// src/pages/ProfilePage.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, History, ArrowDown } from 'lucide-react';
import { walletApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { WalletResponse } from '@/types/index';

export default function ProfilePage() {
  const { user, updateBalance } = useAuthStore();
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);

  useEffect(() => {
    walletApi.get()
      .then(r => setWallet(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    setDepositing(true);
    try {
      const res = await walletApi.deposit(amount);
      setWallet(res.data);
      updateBalance(res.data.balance);
      setDepositAmount('');
    } catch {
      alert('Deposit failed');
    }
    setDepositing(false);
  };

  if (!user) return null;

  const roleVariant = (user.role === 'SUPER' ? 'magenta' : user.role === 'PRO' ? 'violet' : 'cyan') as 'cyan' | 'violet' | 'magenta';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card mb-6">
          <div className="flex items-center gap-5 mb-5">
            <Avatar personaId={user.personaId} name={user.displayName} size="xl" />
            <div>
              <h1 className="font-orbitron font-bold text-2xl text-[#F0F4FF]">{user.displayName}</h1>
              <p className="text-mist text-sm font-inter">{user.email}</p>
              <div className="mt-2">
                <Badge variant={roleVariant} className="text-sm">{user.role}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-ghost">
            <div className="text-center">
              <p className="font-orbitron font-bold text-2xl text-cyan">${user.walletBalance.toFixed(0)}</p>
              <p className="text-xs text-mist mt-1">Balance</p>
            </div>
            <div className="text-center">
              <p className="font-orbitron font-bold text-2xl text-violet">$0</p>
              <p className="text-xs text-mist mt-1">Earned</p>
            </div>
            <div className="text-center">
              <p className="font-orbitron font-bold text-2xl text-magenta">Level 1</p>
              <p className="text-xs text-mist mt-1">Progress</p>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-amber" />
            <h2 className="font-exo font-bold text-lg text-[#F0F4FF]">Wallet</h2>
          </div>

          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 p-4 rounded-xl bg-navy border border-ghost text-center">
              <p className="text-xs text-mist mb-1">Available Balance</p>
              <p className="font-orbitron font-black text-3xl text-amber">
                ${wallet?.balance.toFixed(2) ?? user.walletBalance.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Input
              type="number"
              placeholder="Amount to deposit"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              className="flex-1"
              min="1"
            />
            <Button onClick={handleDeposit} loading={depositing}>
              <ArrowDown className="w-4 h-4" /> Deposit
            </Button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-violet" />
            <h2 className="font-exo font-bold text-lg text-[#F0F4FF]">Transaction History</h2>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 skeleton rounded-lg" />)}
            </div>
          ) : wallet?.history.length === 0 ? (
            <p className="text-mist text-sm text-center py-8 italic">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {wallet?.history.map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-navy border border-ghost">
                  <div>
                    <p className="text-sm font-exo font-semibold text-[#F0F4FF]">{h.description}</p>
                    <p className="text-xs text-mist">{new Date(h.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-mono font-bold text-sm ${h.amount >= 0 ? 'text-pulse' : 'text-magenta'}`}>
                    {h.amount >= 0 ? '+' : ''}{h.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
