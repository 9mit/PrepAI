import React from 'react';

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-[rgba(255,255,255,0.06)] rounded ${className}`}
    aria-hidden
  />
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-24" />
    </div>
    <SkeletonBlock className="h-40" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SkeletonBlock className="h-32" />
      <SkeletonBlock className="h-32" />
      <SkeletonBlock className="h-32" />
    </div>
  </div>
);

export default SkeletonBlock;
