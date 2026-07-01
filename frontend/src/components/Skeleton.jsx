// Simple pulse skeleton for loading states — avoids the app feeling like
// it's stalled while the first fetch resolves.
export function SkeletonBlock({ height = 16, width = '100%', style = {} }) {
  return <div className="skeleton-block" style={{ height, width, ...style }} />;
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <SkeletonBlock height={92} width={92} style={{ borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <SkeletonBlock height={16} width="40%" style={{ marginBottom: 10 }} />
        <SkeletonBlock height={12} width="60%" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="card stat-card">
      <SkeletonBlock height={10} width="55%" style={{ marginBottom: 12 }} />
      <SkeletonBlock height={30} width="35%" />
    </div>
  );
}

export function SkeletonTable({ rows = 4 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
          <SkeletonBlock height={14} width="25%" />
          <SkeletonBlock height={14} width="20%" />
          <SkeletonBlock height={14} width="15%" />
          <SkeletonBlock height={14} width="15%" />
        </div>
      ))}
    </div>
  );
}
