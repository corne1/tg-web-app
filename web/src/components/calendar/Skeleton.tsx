type Props = {
  width?: string;
  height?: string;
  className?: string;
};

export function Skeleton({ width = "100%", height = "1rem", className = "" }: Props) {
  return (
    <span className={`skeleton ${className}`} style={{ width, height }} aria-hidden />
  );
}

export function SlotGridSkeleton() {
  return (
    <div className="slot-grid" aria-busy="true" aria-label="Загрузка слотов">
      {Array.from({ length: 7 }).map((_, day) => (
        <div key={day} className="slot-day">
          <Skeleton height="2.5rem" />
          <div className="slot-times">
            {Array.from({ length: 6 }).map((__, i) => (
              <Skeleton key={i} height="2.25rem" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConfirmCardSkeleton() {
  return (
    <div className="summary-card" aria-busy="true">
      <Skeleton height="1.25rem" width="40%" />
      <Skeleton height="2rem" width="60%" className="mt-3" />
      <Skeleton height="1rem" width="50%" className="mt-2" />
      <Skeleton height="1rem" width="45%" className="mt-2" />
    </div>
  );
}
