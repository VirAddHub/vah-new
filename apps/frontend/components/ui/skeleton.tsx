import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50 loading-shimmer",
        className
      )}
      {...props}
    />
  );
}

// Blog Card Skeleton
export function BlogCardSkeleton() {
  return (
    <div className="card-modern p-6 animate-fade-in-up">
      <Skeleton className="h-48 w-full mb-4 rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2 mt-4">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

// Pricing Card Skeleton
export function PricingCardSkeleton() {
  return (
    <div className="card-modern p-8 animate-fade-in-up">
      <div className="text-center mb-6">
        <Skeleton className="h-8 w-32 mx-auto mb-2" />
        <Skeleton className="h-12 w-24 mx-auto mb-4" />
        <Skeleton className="h-4 w-40 mx-auto" />
      </div>
      <div className="space-y-3 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

// Mail Item Skeleton
export function MailItemSkeleton() {
  return (
    <div className="card-modern p-4 animate-fade-in-up">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

// User Profile Skeleton
export function UserProfileSkeleton() {
  return (
    <div className="card-modern p-8 animate-fade-in-up">
      <div className="flex items-center gap-6 mb-8">
        <Skeleton className="w-20 h-20 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

// Dashboard Stats Skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-modern p-6 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Navigation Skeleton
export function NavigationSkeleton() {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container-modern py-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="hidden md:flex items-center gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-16" />
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </nav>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card-modern overflow-hidden">
      <div className="p-6 border-b border-border">
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Form Skeleton
export function FormSkeleton() {
  return (
    <div className="card-modern p-8">
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex gap-4 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}