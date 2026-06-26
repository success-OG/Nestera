import { TransactionRowSkeleton } from "../../components/ui/LoadingState";

export default function TransactionsLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto pb-20" aria-busy="true" aria-label="Loading transactions">
      <div className="rounded-2xl border border-white/5 bg-[#0e2330] mt-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <TransactionRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
