"use client";

import React from "react";
import { useCountUp } from "../../hooks/useCountUp";

const NET_WORTH = 24593.82;
const CHANGE_VALUE = 1240.5;
const CHANGE_PCT = 5.4;

const NetWorthCard: React.FC = () => {
  const displayedTotal = useCountUp({ end: NET_WORTH, decimals: 2, duration: 1400 });
  const displayedChange = useCountUp({ end: CHANGE_VALUE, decimals: 2, duration: 1200, delay: 200 });
  const displayedPct = useCountUp({ end: CHANGE_PCT, decimals: 1, duration: 1000, delay: 400 });

  return (
    <div
      className="card-hover animate-fade-in"
      style={{
        position: "relative",
        background: "linear-gradient(180deg, rgba(4,20,22,0.85), rgba(6,18,20,0.75))",
        border: "1px solid rgba(6,110,110,0.15)",
        borderRadius: "18px",
        padding: "28px",
        color: "#e6ffff",
        overflow: "hidden",
        minHeight: "160px",
        boxShadow: "0 10px 30px rgba(2,12,14,0.6)",
        backdropFilter: "blur(6px)",
      }}
    >
      {/* Wave SVG */}
      <svg
        style={{
          position: "absolute",
          right: "-30px",
          top: 0,
          width: "84%",
          height: "110%",
          opacity: 0.55,
          zIndex: 0,
          pointerEvents: "none",
        }}
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#07c1c1" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#083b3b" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        <path d="M0,80 C150,200 350,0 600,80 L600,200 L0,200 Z" fill="url(#g1)" />
      </svg>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="flex justify-between items-center">
          <div className="text-xs text-[#9bb7b7] font-semibold tracking-wide">
            TOTAL NET WORTH
          </div>
          <div
            className="animate-slide-in-right px-3 py-2 rounded-2xl font-bold text-[#8ef4ef] inline-flex gap-2 items-center text-sm"
            style={{
              background: "linear-gradient(90deg, rgba(3,116,116,0.22), rgba(6,140,140,0.14))",
            }}
          >
            + ${displayedChange}{" "}
            <span className="text-[#cfe] text-xs font-semibold">(+{displayedPct}%)</span>
          </div>
        </div>

        <div className="text-5xl font-extrabold mt-3 tracking-tight text-white animate-count-up">
          ${displayedTotal}
        </div>

        <div className="mt-2 text-[#95b7b7] text-sm">vs last month</div>
      </div>
    </div>
  );
};

export default NetWorthCard;
