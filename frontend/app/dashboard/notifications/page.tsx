"use client";

import React, { useState } from "react";
import { Bell, CheckCheck, ArrowUpRight, ShieldCheck, Target, Megaphone } from "lucide-react";
import { Button } from "@/app/components/ui/Button";

type NotifType = "transaction" | "governance" | "milestone" | "announcement";

interface Notification {
  id: number;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const ICON_MAP: Record<NotifType, React.ElementType> = {
  transaction: ArrowUpRight,
  governance: ShieldCheck,
  milestone: Target,
  announcement: Megaphone,
};

const COLOR_MAP: Record<NotifType, string> = {
  transaction: "text-cyan-400 bg-cyan-400/10",
  governance: "text-violet-400 bg-violet-400/10",
  milestone: "text-emerald-400 bg-emerald-400/10",
  announcement: "text-amber-400 bg-amber-400/10",
};

const INITIAL: Notification[] = [
  { id: 1, type: "transaction", title: "Deposit Confirmed", body: "Your deposit of 500 USDC to Flexible Savings was confirmed.", time: "2 min ago", read: false },
  { id: 2, type: "governance", title: "New Proposal", body: "Proposal #12 — Increase APY cap to 12% is now open for voting.", time: "1 hr ago", read: false },
  { id: 3, type: "milestone", title: "Goal Milestone Reached", body: "You've reached 50% of your Emergency Fund goal!", time: "3 hr ago", read: false },
  { id: 4, type: "announcement", title: "Maintenance Window", body: "Scheduled maintenance on Apr 27 from 02:00–04:00 UTC.", time: "Yesterday", read: true },
  { id: 5, type: "transaction", title: "Withdrawal Processed", body: "200 USDC withdrawn from Locked Savings to your wallet.", time: "2 days ago", read: true },
  { id: 6, type: "governance", title: "Proposal Passed", body: "Proposal #11 — Fee reduction has passed with 78% approval.", time: "3 days ago", read: true },
];

const FILTERS: { label: string; value: NotifType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Transactions", value: "transaction" },
  { label: "Governance", value: "governance" },
  { label: "Milestones", value: "milestone" },
  { label: "Announcements", value: "announcement" },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL);
  const [filter, setFilter] = useState<NotifType | "all">("all");
  const [error, setError] = useState<string | null>(null);

  const unread = notifications.filter((n) => !n.read).length;

  // Optimistic update for marking all as read
  const markAllRead = async () => {
    const previousNotifications = [...notifications];
    
    // Optimistically update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      // await api.markAllNotificationsAsRead();
    } catch (err) {
      // Rollback on error
      setNotifications(previousNotifications);
      setError("Failed to mark all notifications as read");
    }
  };

  // Optimistic update for marking single notification as read
  const markRead = async (id: number) => {
    const previousNotifications = [...notifications];
    
    // Optimistically update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      // await api.markNotificationAsRead(id);
    } catch (err) {
      // Rollback on error
      setNotifications(previousNotifications);
      setError("Failed to mark notification as read");
    }
  };

  const visible = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#063d3d] to-[#0a6f6f] flex items-center justify-center text-[#5de0e0]">
            <Bell size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white m-0">Notifications</h1>
            <p className="text-[#5e8c96] text-sm m-0">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<CheckCheck size={15} />}
            onClick={markAllRead}
            className="border-cyan-500/20 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "outline" : "ghost"}
            size="sm"
            onClick={() => setFilter(f.value)}
            className={filter === f.value ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-300" : "text-[#6e9aaa]"}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="text-xs text-red-500 text-center">{error}</p>
        )}
        {visible.length === 0 && (
          <p className="text-[#5e8c96] text-sm py-8 text-center">No notifications in this category.</p>
        )}
        {visible.map((n) => {
          const Icon = ICON_MAP[n.type];
          const colors = COLOR_MAP[n.type];
          return (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={[
                "flex items-start gap-4 p-4 rounded-2xl border transition-colors cursor-pointer",
                n.read
                  ? "border-white/5 bg-white/2 opacity-60"
                  : "border-[rgba(8,120,120,0.12)] bg-gradient-to-b from-[rgba(6,18,20,0.55)] to-[rgba(4,12,14,0.45)]",
              ].join(" ")}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{n.title}</span>
                  <span className="text-xs text-[#4a7080] shrink-0">{n.time}</span>
                </div>
                <p className="text-sm text-[#7aacb5] mt-0.5 m-0">{n.body}</p>
              </div>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
