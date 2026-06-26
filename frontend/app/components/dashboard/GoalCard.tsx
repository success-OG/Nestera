import React from "react";
import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";

export type GoalStatus = "On Track" | "At Risk" | "Completed" | "Paused";

interface GoalCardProps {
  title: string;
  category: string;
  currentAmount: number;
  targetAmount: number;
  targetDate: string;
  status: GoalStatus;
  href?: string;
}

const STATUS_STYLES: Record<
  GoalStatus,
  { bg: string; border: string; dot: string; text: string }
> = {
  "On Track": {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]",
    text: "text-emerald-400",
  },
  "At Risk": {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]",
    text: "text-amber-400",
  },
  Completed: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    dot: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]",
    text: "text-cyan-400",
  },
  Paused: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    dot: "bg-slate-400",
    text: "text-slate-400",
  },
};

function formatMoney(value: number) {
  return `$${value.toLocaleString()}`;
}

export default function GoalCard({
  title,
  category,
  currentAmount,
  targetAmount,
  targetDate,
  status,
  href = "#",
}: GoalCardProps) {
  const percentage =
    targetAmount <= 0 ? 0 : Math.min(100, Math.round((currentAmount / targetAmount) * 100));
  const statusStyle = STATUS_STYLES[status];

  return (
    <div className="card-hover relative overflow-hidden rounded-3xl border border-white/5 bg-linear-to-br from-[rgba(6,26,26,0.82)] to-[rgba(4,14,16,0.6)] shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-sm p-6">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/70 via-cyan-400/25 to-transparent" />

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-white m-0 tracking-tight truncate">
              {title}
            </h3>
            <span className="px-2.5 py-1 bg-[#0e2330]/80 border border-white/10 rounded-lg text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
              {category}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#5e8c96] mt-2">
            <Calendar size={14} className="text-cyan-500/80" />
            <span className="text-xs font-medium">Target: {targetDate}</span>
          </div>
        </div>

        <div
          className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusStyle.bg} ${statusStyle.border}`}
        >
          <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${statusStyle.text}`}>
            {status}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-end justify-between gap-3">
          <p className="text-white font-bold m-0">
            {formatMoney(currentAmount)}{" "}
            <span className="text-[#5e8c96] font-medium">
              / {formatMoney(targetAmount)}
            </span>
          </p>
          <span className="text-[#5e8c96] text-xs font-semibold">{percentage}%</span>
        </div>

        <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-linear-to-r from-cyan-500 to-emerald-400"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button className="btn-press px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-[#061a1a] font-bold rounded-2xl shadow-[0_10px_18px_rgba(0,212,192,0.15)]">
          Contribute
        </button>

        <Link
          href={href}
          className="inline-flex items-center gap-1 text-cyan-400 font-bold hover:text-cyan-300 transition-colors group px-1"
        >
          View
          <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

