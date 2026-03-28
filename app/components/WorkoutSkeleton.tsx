'use client';

export default function WorkoutSkeleton() {
  return (
    <div className="skeleton-container">
      {/* Header skeleton */}
      <div className="skeleton-header">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-subtitle" />
        <div className="skeleton-tabs">
          <div className="skeleton skeleton-tab" />
          <div className="skeleton skeleton-tab" />
          <div className="skeleton skeleton-tab" />
          <div className="skeleton skeleton-tab" />
          <div className="skeleton skeleton-tab" />
        </div>
        <div className="skeleton-progress">
          <div className="skeleton skeleton-progress-text" />
          <div className="skeleton skeleton-progress-bar" />
        </div>
      </div>

      {/* Exercise card skeletons */}
      <div className="skeleton-card">
        <div className="skeleton-card-header">
          <div className="skeleton skeleton-category" />
          <div className="skeleton skeleton-badge" />
        </div>
        <div className="skeleton-video" />
        
        {/* Sets skeleton */}
        <div className="skeleton-sets">
          <div className="skeleton skeleton-set-row" />
          <div className="skeleton skeleton-set-row" />
          <div className="skeleton skeleton-set-row" />
        </div>
        
        <div className="skeleton skeleton-button" />
      </div>

      <div className="skeleton-card">
        <div className="skeleton-card-header">
          <div className="skeleton skeleton-category" />
          <div className="skeleton skeleton-badge" />
        </div>
        <div className="skeleton-video" />
        
        <div className="skeleton-sets">
          <div className="skeleton skeleton-set-row" />
          <div className="skeleton skeleton-set-row" />
        </div>
        
        <div className="skeleton skeleton-button" />
      </div>

      <div className="skeleton-card">
        <div className="skeleton-card-header">
          <div className="skeleton skeleton-category" />
          <div className="skeleton skeleton-badge" />
        </div>
        <div className="skeleton-video" />
        
        <div className="skeleton-sets">
          <div className="skeleton skeleton-set-row" />
          <div className="skeleton skeleton-set-row" />
          <div className="skeleton skeleton-set-row" />
        </div>
        
        <div className="skeleton skeleton-button" />
      </div>
    </div>
  );
}
