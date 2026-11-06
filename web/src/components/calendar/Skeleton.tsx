type Props = {
  width?: string;
  height?: string;
  className?: string;
};

export function Skeleton({
  width = "100%",
  height = "1rem",
  className = "",
}: Props) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height }}
      aria-hidden
    />
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

/** Day timeline placeholders — Schedule tab. */
export function ScheduleListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="ms-cab-skel-list" aria-busy="true" aria-label="Загрузка расписания">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="ms-cab-skel-slot">
          <Skeleton width="36px" height="14px" className="mt-3" />
          <div className="ms-cab-skel-slot-card">
            <Skeleton width="42%" height="12px" />
            <Skeleton width="58%" height="16px" />
            <Skeleton width="34%" height="14px" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Client rows — Clients tab / new booking client picker. */
export function ClientsListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="ms-cl-skel-list" aria-busy="true" aria-label="Загрузка клиентов">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="ms-cl-skel-row">
          <Skeleton width="44px" height="44px" className="is-round" />
          <span className="ms-cl-skel-copy">
            <Skeleton width={`${52 + (i % 3) * 10}%`} height="15px" />
            <Skeleton width={`${38 + (i % 2) * 12}%`} height="13px" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Booking detail page. */
export function BookingDetailSkeleton() {
  return (
    <div className="ms-bd-skel" aria-busy="true" aria-label="Загрузка записи">
      <div className="ms-bd-skel-badges">
        <Skeleton width="88px" height="28px" className="is-round" />
        <Skeleton width="120px" height="28px" className="is-round" />
      </div>
      <div className="ms-bd-skel-when">
        <Skeleton width="70%" height="28px" />
        <Skeleton width="40%" height="28px" className="mt-2" />
        <Skeleton width="55%" height="16px" className="mt-3" />
      </div>
      <div className="ms-bd-skel-block">
        <Skeleton width="72px" height="14px" />
        <div className="ms-cl-skel-row mt-3">
          <Skeleton width="44px" height="44px" className="is-round" />
          <span className="ms-cl-skel-copy">
            <Skeleton width="55%" height="15px" />
            <Skeleton width="40%" height="13px" />
          </span>
        </div>
      </div>
      <div className="ms-bd-skel-block">
        <Skeleton width="64px" height="14px" />
        <div className="ms-cab-skel-slot-card mt-3">
          <Skeleton width="50%" height="14px" />
          <Skeleton width="70%" height="16px" />
          <Skeleton width="36%" height="14px" />
        </div>
      </div>
    </div>
  );
}

/** Client card page. */
export function ClientCardSkeleton() {
  return (
    <div className="ms-cc-skel" aria-busy="true" aria-label="Загрузка клиента">
      <div className="ms-cc-skel-hero">
        <Skeleton width="72px" height="72px" className="is-round" />
        <Skeleton width="48%" height="22px" className="mt-3" />
        <Skeleton width="36%" height="14px" className="mt-2" />
      </div>
      <div className="ms-cc-skel-stats">
        <div className="ms-cc-skel-stat">
          <Skeleton width="64px" height="16px" />
        </div>
        <div className="ms-cc-skel-stat">
          <Skeleton width="72px" height="16px" />
          <Skeleton width="88px" height="12px" className="mt-2" />
        </div>
      </div>
      <Skeleton width="100%" height="40px" className="is-card" />
      <div className="ms-cab-skel-slot-card">
        <Skeleton width="40%" height="14px" />
        <Skeleton width="65%" height="16px" className="mt-2" />
        <Skeleton width="30%" height="14px" className="mt-2" />
      </div>
      <div className="ms-cab-skel-slot-card">
        <Skeleton width="45%" height="14px" />
        <Skeleton width="80%" height="14px" className="mt-2" />
      </div>
    </div>
  );
}

/** Client «Мои записи» list. */
export function BookingsListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="booking-skel-list" aria-busy="true" aria-label="Загрузка записей">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="booking-skel-card">
          <Skeleton width="55%" height="16px" />
          <Skeleton width="40%" height="14px" className="mt-2" />
          <div className="booking-skel-actions mt-3">
            <Skeleton width="96px" height="36px" className="is-card" />
            <Skeleton width="88px" height="36px" className="is-card" />
          </div>
        </li>
      ))}
    </ul>
  );
}
