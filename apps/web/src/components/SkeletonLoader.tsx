export function EventCardSkeleton() {
  return (
    <div className="border border-border rounded-lg p-6 h-full animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-6 bg-muted rounded w-3/4"></div>
        <div className="h-4 w-4 bg-muted rounded"></div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-2/3"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-1/2"></div>
        <div className="h-4 bg-muted rounded w-2/3"></div>
      </div>
    </div>
  );
}

export function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse"></div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-24 h-24 rounded-full bg-muted"></div>
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
      </div>
    </div>
  );
}

