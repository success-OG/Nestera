'use client';

import React, { useState } from 'react';
import {
  User,
  Wallet,
  Copy,
  Check,
  TrendingUp,
  Target,
  Activity,
  Gift,
  ExternalLink,
  Edit3,
  Star,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

/* ─── mock data ─────────────────────────────────────── */
const MOCK_USER = {
  displayName: 'Alex DeFi',
  username: '@alexdefi',
  joinedDate: 'January 2025',
  avatarInitials: 'AD',
  tier: 'Gold Saver',
  primaryWallet: 'GBSF...7YKQ',
  primaryWalletFull: 'GBSFJK39DHVZW2YEJKQVFJ3CMRK8BSFJK39DHVZW2YEJKQVFJ37YKQ',
  linkedWallets: [
    { label: 'Freighter', address: 'GBSF...7YKQ', network: 'Stellar Mainnet' },
    { label: 'Albedo',    address: 'GABC...3ZZA', network: 'Stellar Mainnet' },
  ],
  referralCode: 'ALEX-DEFI-2025',
  referrals: 14,
  referralRewards: '$128.40',
};

const STATS = [
  { label: 'Total Saved',     value: '$24,593',  delta: '+5.4%',   icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { label: 'Active Goals',    value: '6',         delta: '2 done',  icon: Target,     color: 'text-purple-400',  bg: 'bg-purple-400/10'  },
  { label: 'Avg APY Earned',  value: '11.9%',     delta: 'All time',icon: Activity,   color: 'text-cyan-400',    bg: 'bg-cyan-400/10'    },
  { label: 'Referral Earned', value: '$128',      delta: '14 refs', icon: Gift,       color: 'text-yellow-400',  bg: 'bg-yellow-400/10'  },
];

const ACTIVITY = [
  { action: 'Deposited to USDC Pool',  amount: '+$500',    date: '2h ago',      type: 'deposit' },
  { action: 'Goal "Japan Trip" 🎌 funded',         amount: '+$200',    date: '1 day ago',   type: 'goal'     },
  { action: 'Yield compounded',         amount: '+$14.22',  date: '2 days ago',  type: 'yield'   },
  { action: 'Withdrew from XLM Pool',  amount: '-$1,000',  date: '4 days ago',  type: 'withdraw'},
  { action: 'Referral reward received',amount: '+$9.20',   date: '1 week ago',  type: 'referral'},
  { action: 'Deposited to USDT Pool',  amount: '+$750',    date: '2 weeks ago', type: 'deposit' },
];

/* ─── small helpers ─────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#4a8090] hover:text-[#9ef0f0] transition-all"
      aria-label="Copy"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </Button>
  );
}

function ActivityDot({ type }: { type: string }) {
  const map: Record<string, string> = {
    deposit:  'bg-emerald-400',
    goal:     'bg-purple-400',
    yield:    'bg-cyan-400',
    withdraw: 'bg-rose-400',
    referral: 'bg-yellow-400',
  };
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${map[type] ?? 'bg-white/30'}`} />;
}

/* ─── page ──────────────────────────────────────────── */
export default function ProfilePage() {
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(MOCK_USER.displayName);
  const [tempName, setTempName] = useState(MOCK_USER.displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optimistic update for display name
  const handleNameSave = async () => {
    const previousName = displayName;
    
    // Optimistically update
    setDisplayName(tempName);
    setIsSaving(true);
    setError(null);

    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // await api.updateProfile({ displayName: tempName });
      
      setEditingName(false);
      setIsSaving(false);
    } catch (err) {
      // Rollback on error
      setDisplayName(previousName);
      setError("Failed to update display name");
      setIsSaving(false);
    }
  };

  const cardBase =
    'rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,20,22,0.85),rgba(6,18,20,0.75))] p-6 backdrop-blur-sm shadow-[0_10px_30px_rgba(2,12,14,0.6)]';

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-5">

      {/* ── Top: Avatar card + Stats ─────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Avatar / identity card */}
        <div className={`${cardBase} flex flex-col sm:flex-row gap-6 items-start sm:items-center lg:w-[360px] lg:shrink-0`}>
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-teal-600/20 border border-cyan-500/20 flex items-center justify-center text-2xl font-extrabold text-cyan-300">
              {MOCK_USER.avatarInitials}
            </div>
            {/* Online dot */}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#061218]" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Editable display name */}
            <div className="flex items-center gap-2 mb-1">
              {editingName ? (
                <input
                  autoFocus
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => { if (e.key === 'Enter') { handleNameSave(); } }}
                  className="text-lg font-bold text-white bg-transparent border-b border-cyan-500 outline-none w-full"
                />
              ) : (
                <>
                  <h1 className="text-lg font-bold text-white truncate">{displayName}</h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setTempName(displayName); setEditingName(true); setError(null); }}
                    className="text-[#4a8090] hover:text-cyan-400 bg-transparent p-0.5"
                    aria-label="Edit name"
                  >
                    <Edit3 size={14} />
                  </Button>
                </>
              )}
            </div>
            {error && (
              <p role="alert" className="text-xs text-red-500 mb-2">
                {error}
              </p>
            )}

            <div className="text-xs text-[#6e9aaa] mb-3">{MOCK_USER.username}</div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-[0.65rem] font-bold uppercase tracking-wider">
                <Star size={10} /> {MOCK_USER.tier}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[0.65rem] font-bold">
                <ShieldCheck size={10} /> Verified
              </span>
            </div>

            <div className="mt-3 text-[0.7rem] text-[#4a8090] flex items-center gap-1.5">
              <Clock size={11} /> Member since {MOCK_USER.joinedDate}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className={`${cardBase} flex flex-col gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={s.color} size={20} />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white">{s.value}</div>
                <div className="text-xs text-[#6e9aaa] mt-0.5">{s.label}</div>
              </div>
              <div className="text-[0.65rem] text-[#4a8090] font-medium uppercase tracking-wider">{s.delta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Middle: Wallets + Activity ───────────────── */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Wallet addresses */}
        <div className={`${cardBase} lg:w-[360px] lg:shrink-0 flex flex-col gap-5`}>
          <div className="flex items-center gap-2">
            <Wallet className="text-cyan-400" size={18} />
            <h2 className="text-sm font-bold text-white">Linked Wallets</h2>
          </div>

          <div className="flex flex-col gap-3">
            {MOCK_USER.linkedWallets.map((w, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#0d4f4f] flex items-center justify-center text-cyan-400 shrink-0">
                    <User size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white">{w.label}</div>
                    <div className="text-[0.65rem] text-[#4a8090] font-mono truncate">{w.address}</div>
                    <div className="text-[0.6rem] text-[#324f5a]">{w.network}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <CopyButton text={i === 0 ? MOCK_USER.primaryWalletFull : w.address} />
                  <a
                    href={`https://stellar.expert/explorer/public/account/${MOCK_USER.primaryWalletFull}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#4a8090] hover:text-[#9ef0f0] transition-all"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="md"
            className="w-full py-2.5 rounded-xl border-dashed border-white/[0.12] text-[#4a8090] hover:border-cyan-500/30 hover:text-cyan-400 text-xs font-semibold transition-all"
          >
            + Connect Another Wallet
          </Button>
        </div>

        {/* Activity history */}
        <div className={`${cardBase} flex-1 flex flex-col gap-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-cyan-400" size={18} />
              <h2 className="text-sm font-bold text-white">Activity History</h2>
            </div>
            <span className="text-[0.65rem] text-[#4a8090] uppercase tracking-wider">Last 30 days</span>
          </div>

          <div className="flex flex-col">
            {ACTIVITY.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-3.5 border-b border-white/[0.04] last:border-0 group"
              >
                <ActivityDot type={item.type} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#c8e8e8] font-medium">{item.action}</div>
                  <div className="text-[0.65rem] text-[#4a8090] mt-0.5">{item.date}</div>
                </div>
                <div
                  className={`text-sm font-bold shrink-0 ${
                    item.amount.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {item.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom: Referral ─────────────────────────── */}
      <div className={`${cardBase} relative overflow-hidden`}>
        {/* glow */}
        <div
          className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(0,212,192,0.07) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
              <Gift className="text-yellow-400" size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white mb-0.5">Your Referral Programme</h2>
              <p className="text-xs text-[#6e9aaa]">Earn 1% of every deposit made by your referrals — forever.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 md:ml-auto items-start sm:items-center">
            {/* Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-white">{MOCK_USER.referrals}</div>
                <div className="text-[0.65rem] text-[#4a8090] uppercase tracking-wider">Referrals</div>
              </div>
              <div className="w-px h-10 bg-white/[0.07]" />
              <div className="text-center">
                <div className="text-2xl font-extrabold text-emerald-400">{MOCK_USER.referralRewards}</div>
                <div className="text-[0.65rem] text-[#4a8090] uppercase tracking-wider">Earned</div>
              </div>
            </div>

            {/* Code + copy */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.09]">
              <span className="font-mono text-sm font-bold text-cyan-300 tracking-wider">
                {MOCK_USER.referralCode}
              </span>
              <CopyButton text={`https://nestera.io?ref=${MOCK_USER.referralCode}`} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
