import {
  clientInitial,
  type BookingClient,
} from "../../lib/bookingClients";
import { cx } from "../../ui";

const TONES = ["tone-violet", "tone-sky", "tone-mint", "tone-amber"] as const;

type Props = {
  client: BookingClient;
  servicesLine?: string | null;
  durationPriceLine?: string | null;
  className?: string;
};

export function BookingClientSummary({
  client,
  servicesLine,
  durationPriceLine,
  className,
}: Props) {
  const tone = TONES[Math.abs(hash(client.id)) % TONES.length];
  return (
    <div className={cx("ms-nb-summary", className)}>
      <div className={cx("ms-nb-avatar", "ms-nb-summary-avatar", tone)}>
        {clientInitial(client.name)}
      </div>
      <div className="ms-nb-summary-copy">
        <p className="ms-nb-summary-name">{client.name}</p>
        {servicesLine ? (
          <p className="ms-nb-summary-services">{servicesLine}</p>
        ) : null}
        {durationPriceLine ? (
          <p className="ms-nb-summary-meta">{durationPriceLine}</p>
        ) : null}
        {!servicesLine && !durationPriceLine ? (
          <p className="ms-nb-summary-meta">{client.phone}</p>
        ) : null}
      </div>
    </div>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
