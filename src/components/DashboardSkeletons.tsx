import { Skeleton } from "@/components/ui/skeleton";

const SkeletonStatsRow = ({ count = 4 }: { count?: number }) => (
  <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-7 w-16 mb-1" />
        <Skeleton className="h-2.5 w-20" />
      </div>
    ))}
  </div>
);

const SkeletonChart = ({ height = 260 }: { height?: number }) => (
  <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
    <div className="mb-4 flex items-center justify-between">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-7 w-16 rounded-lg" />
    </div>
    <Skeleton className="w-full rounded-xl" style={{ height }} />
  </div>
);

const SkeletonTable = ({ rows = 4 }: { rows?: number }) => (
  <div className="rounded-2xl border border-border bg-card shadow-card">
    <div className="flex items-center justify-between border-b border-border px-6 py-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-9 w-48 rounded-lg" />
    </div>
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  </div>
);

const SkeletonHeader = () => (
  <div className="border-b border-border bg-card px-4 py-4 md:px-8 md:py-5">
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-6 w-56 mb-1.5" />
        <Skeleton className="h-3.5 w-36" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  </div>
);

export const StudentDashboardSkeleton = () => (
  <>
    <SkeletonHeader />
    <div className="p-4 md:p-8">
      <SkeletonStatsRow count={4} />
      {/* Cohort info card */}
      <Skeleton className="mb-8 h-24 w-full rounded-2xl" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <SkeletonChart height={260} />
          <SkeletonTable rows={4} />
        </div>
        <div className="space-y-8">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <Skeleton className="h-5 w-28 mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="mb-3">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </>
);

export const StaffDashboardSkeleton = () => (
  <>
    <SkeletonHeader />
    <div className="p-4 md:p-8">
      <SkeletonStatsRow count={4} />
      {/* Tasks */}
      <div className="mb-8">
        <SkeletonTable rows={3} />
      </div>
      {/* Briefs */}
      <div className="mb-8">
        <SkeletonTable rows={3} />
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <SkeletonTable rows={4} />
        <SkeletonTable rows={3} />
      </div>
    </div>
  </>
);

export const AdminDashboardSkeleton = () => (
  <>
    <SkeletonHeader />
    <div className="p-4 md:p-8">
      <SkeletonStatsRow count={4} />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonChart height={280} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-[200px] w-full rounded-full mx-auto max-w-[200px]" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </>
);
