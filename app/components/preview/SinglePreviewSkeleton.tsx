"use client";

import { Skeleton } from "./Skeleton";

interface SinglePreviewSkeletonProps {
  fetchHint?: string;
}

export function SinglePreviewSkeleton({
  fetchHint,
}: SinglePreviewSkeletonProps) {
  return (
    <div className="flex flex-col items-center text-center w-full">
      <Skeleton className="mb-5 h-44 w-80 rounded-xl" />
      <Skeleton className="mb-2 h-5 w-64" />
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-16" />
      </div>
      <p className="mt-5 text-xs text-blue-400/80 animate-pulse">
        {fetchHint ?? "Fetching video info…"}
      </p>
    </div>
  );
}
