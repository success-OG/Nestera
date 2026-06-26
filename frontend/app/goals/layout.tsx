import type { Metadata } from "next";
import { generatePageMetadata, SITE_URL } from "../lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Goal Management - Nestera",
  description: "Manage and track your financial goals with Nestera. Set milestones, automate savings, and achieve your financial objectives through decentralized smart contracts.",
  url: "/goals",
});

export default function GoalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#061218]">
      {children}
    </div>
  );
}
