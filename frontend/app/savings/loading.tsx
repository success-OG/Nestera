import { DashboardCardSkeleton, PoolCardSkeleton } from "../components/ui/LoadingState";

export default function GoalsLoading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-8 pb-16" aria-busy="true" aria-label="Loading goals">
      <div className="mt-10 mb-6">
        <DashboardCardSkeleton />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <PoolCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
