import { DashboardCardSkeleton, Spinner } from "../components/ui/LoadingState";

export default function DashboardLoading() {
  return (
    <div className="w-full py-4" aria-busy="true" aria-live="polite">
      <Spinner text="Fetching dashboard data..." className="mb-4" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <DashboardCardSkeleton />
          <div className="mt-4">
            <DashboardCardSkeleton />
          </div>
        </div>
        <div className="space-y-4">
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
        </div>
      </div>
    </div>
  );
}

