// src/pages/ProfilePage.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, History, ArrowDown, Edit2, Trash2, Save, X, Coins } from 'lucide-react';
import { walletApi, usersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PERSONA_GRADIENTS } from '@/types/index';
import type { WalletResponse } from '@/types/index';

export default function ProfilePage() {
  const { user, updateBalance, updateUser, logout } = useAuthStore();
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName ?? '');
  const [editPersona, setEditPersona] = useState(user?.personaId ?? 1);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Wallet Adjustment & History Control State
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  const handleAdjustBalance = async () => {
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount < 0) return;
    setAdjusting(true);
    try {
      const res = await walletApi.updateBalance(amount);
      setWallet(prev => prev ? { ...prev, balance: res.data.balance } : null);
      updateBalance(res.data.balance);
      setAdjustAmount('');
      // Reload history to show adjustment
      const histRes = await walletApi.get();
      setWallet(histRes.data);
    } catch {
      alert('Adjust balance failed');
    }
    setAdjusting(false);
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your transaction history?')) return;
    setClearingHistory(true);
    try {
      await walletApi.clearHistory();
      setWallet(prev => prev ? { ...prev, history: [] } : null);
    } catch {
      alert('Failed to clear history');
    }
    setClearingHistory(false);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setUpdatingProfile(true);
    try {
      const res = await usersApi.updateMe({
        displayName: editName.trim(),
        personaId: editPersona,
      });
      updateUser({
        displayName: res.data.displayName,
        personaId: res.data.personaId,
      });
      setIsEditing(false);
    } catch {
      alert('Profile update failed');
    }
    setUpdatingProfile(false);
  };

  const handleDeleteAccount = async () => {
    if (!confirm('WARNING: Are you absolutely sure you want to permanently delete your account? This action cannot be undone.')) return;
    setDeletingAccount(true);
    try {
      await usersApi.deleteMe();
      logout();
      window.location.href = '/login';
    } catch {
      alert('Failed to delete account');
      setDeletingAccount(false);
    }
  };

  if (!user) return null;

  const roleVariant = (user.role === 'SUPER' ? 'magenta' : user.role === 'PRO' ? 'violet' : 'cyan') as 'cyan' | 'violet' | 'magenta';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Profile Card */}
        <div className="card mb-6 relative overflow-hidden">
          {isEditing ? (
            <div className="space-y-4">
              <h2 className="font-orbitron font-bold text-[#F0F4FF] text-lg">Edit Profile</h2>
              <div>
                <label className="block text-xs font-exo font-medium text-mist mb-2">Choose Avatar Gradient</label>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setEditPersona(id)}
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${PERSONA_GRADIENTS[id]} flex items-center justify-center
                        font-orbitron font-bold text-white transition-all duration-200
                        ${editPersona === id ? 'ring-2 ring-white scale-110 shadow-cyan' : 'opacity-60 hover:opacity-95'}`}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-exo font-medium text-mist mb-1">Display Name</label>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Your display name"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={updatingProfile}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
                <Button onClick={handleSaveProfile} loading={updatingProfile}>
                  <Save className="w-4 h-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-5">
                  <Avatar personaId={user.personaId} name={user.displayName} size="xl" />
                  <div>
                    <h1 className="font-orbitron font-bold text-2xl text-[#F0F4FF]">{user.displayName}</h1>
                    <p className="text-mist text-sm font-inter">{user.email}</p>
                    <div className="mt-2">
                      <Badge variant={roleVariant} className="text-sm">{user.role}</Badge>
                    </div>
                  </div>
                </div>
                <Button variant="secondary" className="!p-2.5" onClick={() => {
                  setEditName(user.displayName);
                  setEditPersona(user.personaId);
                  setIsEditing(true);
                }}>
                  <Edit2 className="w-4 h-4 text-cyan hover:scale-110 transition-transform" />
                </Button>
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
          )}
        </div>

        {/* Wallet Management Card */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-amber" />
            <h2 className="font-exo font-bold text-lg text-[#F0F4FF]">Wallet Management</h2>
          </div>

          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 p-4 rounded-xl bg-navy border border-ghost text-center">
              <p className="text-xs text-mist mb-1">Available Balance</p>
              <p className="font-orbitron font-black text-3xl text-amber">
                ${wallet?.balance.toFixed(2) ?? user.walletBalance.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Deposit Section */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Amount to deposit"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  min="1"
                />
              </div>
              <Button onClick={handleDeposit} loading={depositing} className="md:w-40 justify-center">
                <ArrowDown className="w-4 h-4 mr-1" /> Deposit
              </Button>
            </div>

            {/* Adjust Balance Section */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Set exact balance (PUT)"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  min="0"
                />
              </div>
              <Button variant="secondary" onClick={handleAdjustBalance} loading={adjusting} className="md:w-40 justify-center border-amber/30 text-amber hover:bg-amber/10">
                <Coins className="w-4 h-4 mr-1" /> Adjust Balance
              </Button>
            </div>
          </div>
        </div>

        {/* Transaction History Card */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-violet" />
              <h2 className="font-exo font-bold text-lg text-[#F0F4FF]">Transaction History</h2>
            </div>
            {wallet && wallet.history.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                className="text-magenta hover:bg-magenta/10 border-magenta/20"
                onClick={handleClearHistory}
                loading={clearingHistory}
              >
                Clear History
              </Button>
            )}
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

        {/* Danger Zone */}
        <div className="card border-magenta/30 bg-magenta/5">
          <div className="flex items-center gap-2 mb-4">
            <Trash2 className="w-5 h-5 text-magenta" />
            <h2 className="font-exo font-bold text-lg text-[#F0F4FF]">Danger Zone</h2>
          </div>
          <p className="text-mist text-sm mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Button
            variant="secondary"
            className="bg-magenta/10 hover:bg-magenta/20 text-magenta border-magenta/40 w-full md:w-auto"
            onClick={handleDeleteAccount}
            loading={deletingAccount}
          >
            Permanently Delete Account
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
