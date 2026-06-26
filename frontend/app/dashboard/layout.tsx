import React from "react";
import type { Metadata } from "next";
import Sidebar from "../components/dashboard/Sidebar";
import TopNav from "../components/dashboard/TopNav";
import DashboardProviders from "./DashboardProviders";
import { generatePageMetadata, SITE_URL } from "../lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Dashboard - Nestera",
  description: "Manage your Nestera account, view portfolio analytics, track savings progress, and control your decentralized financial strategy from one unified dashboard.",
  url: "/dashboard",
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProviders>
      <div className="block bg-[#061218] min-h-screen overflow-x-hidden">
        <Sidebar />
        <div className="min-h-screen px-4 py-5 md:ml-[180px] md:px-6 max-w-full">
          <TopNav />
          <div className="mt-2 page-enter">{children}</div>
        </div>
      </div>
    </DashboardProviders>
  );
}
