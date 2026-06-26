import type { Metadata } from "next";
import ErrorBoundary from "../components/ErrorBoundary";
import { generatePageMetadata, SITE_URL } from "../lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Goal-Based Savings - Nestera",
  description: "Create and manage your goal-based savings. Set targets, automate contributions, and watch your savings grow with Nestera's secure smart contract technology.",
  url: "/savings",
});

export default function SavingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
