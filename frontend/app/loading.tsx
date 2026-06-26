import { DashboardCardSkeleton, Spinner } from "./components/ui/LoadingState";

export default function AppLoading() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-6xl flex-col items-center justify-center gap-6 px-4">
      <Spinner text="Loading page content..." />
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
        <DashboardCardSkeleton />
        <DashboardCardSkeleton />
      </div>
    </div>
  );
}

