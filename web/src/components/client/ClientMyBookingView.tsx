import infoIcon from "../../assets/cabinet/profile/info.svg";
import { PlaceModeIcon } from "../master/PlaceModeIcon";
import { ServiceSparkIcon } from "../master/ServiceSparkIcon";
import { resolvePublicMasterAvatarSrc } from "../../lib/masterAvatar";
import type { MasterService } from "../../lib/masterDraft";
import { formatDuration, formatPrice } from "../../lib/clientBookingDraft";

export type MyBookingServiceLine = {
  id: string;
  title: string;
  durationMin?: number;
  /** When set, uses formatPrice; otherwise optional priceLabel. */
  service?: MasterService;
  priceLabel?: string;
};

function SuccessCheckBadge() {
  return (
    <div className="ms-client-success-badge" aria-hidden>
      <span className="ms-client-success-badge-inner">
        <svg
          className="ms-client-success-badge-check"
          width="34"
          height="34"
          viewBox="0 0 34 34"
          fill="none"
        >
          <path
            d="M7.5 17.2 13.8 23.5 26.5 10.5"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

function ruHoursLabel(hours: number): string {
  const n = Math.max(0, Math.round(hours));
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "часов";
  if (mod10 === 1 && mod100 !== 11) word = "час";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    word = "часа";
  return `${n} ${word}`;
}

/** Figma 21477:18678 — «Моя запись» body (shared by success + deep link). */
export function ClientMyBookingView({
  cancelled = false,
  lead = "Вы записаны к мастеру",
  masterName,
  roleLabel = "Мастер",
  masterAvatarUrl,
  services,
  serviceTitles,
  priceLabel,
  placeChoice,
  placeLine,
  placeExtra,
  cancelHours = 24,
}: {
  cancelled?: boolean;
  lead?: string;
  masterName: string;
  roleLabel?: string;
  masterAvatarUrl?: string | null;
  services?: MyBookingServiceLine[];
  serviceTitles?: string[];
  priceLabel?: string | null;
  placeChoice?: "studio" | "visit" | null;
  placeLine?: string | null;
  placeExtra?: string | null;
  cancelHours?: number;
}) {
  const lines: MyBookingServiceLine[] =
    services && services.length > 0
      ? services
      : (serviceTitles ?? []).map((title, i) => ({
          id: `t-${i}`,
          title,
        }));

  return (
    <div className="ms-client-success">
      <div className="ms-client-success-hero">
        {!cancelled ? <SuccessCheckBadge /> : null}
        <p className="ms-client-success-lead">
          {cancelled ? "Запись отменена" : lead}
        </p>
      </div>

      <section className="ms-client-review-section">
        <h2 className="ms-client-review-label">Мастер</h2>
        <div className="ms-client-review-row">
          <img
            className="ms-client-review-avatar"
            src={resolvePublicMasterAvatarSrc(masterAvatarUrl)}
            alt=""
            width={48}
            height={48}
          />
          <div className="ms-client-review-copy">
            <p className="ms-client-review-title">{masterName}</p>
            <p className="ms-client-review-sub">{roleLabel}</p>
          </div>
        </div>
      </section>

      <section className="ms-client-review-section">
        <h2 className="ms-client-review-label">Услуги и стоимость</h2>
        <ul className="ms-client-review-svc-list">
          {lines.map((line) => (
            <li key={line.id} className="ms-client-success-svc">
              <span className="ms-service-avatar" aria-hidden>
                <ServiceSparkIcon className="ms-service-spark" />
              </span>
              <span className="ms-client-review-copy">
                <span className="ms-client-review-title">{line.title}</span>
                {line.service ? (
                  <span className="ms-client-review-sub">
                    {formatDuration(line.service.durationMin)}
                  </span>
                ) : line.durationMin != null ? (
                  <span className="ms-client-review-sub">
                    {formatDuration(line.durationMin)}
                  </span>
                ) : null}
              </span>
              {line.service ? (
                <span className="ms-client-success-svc-price">
                  {formatPrice(line.service)}
                </span>
              ) : line.priceLabel ? (
                <span className="ms-client-success-svc-price">
                  {line.priceLabel}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        {priceLabel ? (
          <div className="ms-client-success-total">
            <span>Итого</span>
            <span>{priceLabel}</span>
          </div>
        ) : null}
      </section>

      <section className="ms-client-review-section">
        <h2 className="ms-client-review-label">Место приёма</h2>
        <div className="ms-client-review-row">
          <span
            className="ms-service-avatar ms-client-review-place-ico"
            aria-hidden
          >
            <PlaceModeIcon
              mode={placeChoice === "visit" ? "visit" : "studio"}
              size={20}
            />
          </span>
          <div className="ms-client-review-copy">
            <p className="ms-client-review-title">
              {placeChoice === "visit"
                ? "Выезд к вам"
                : "В кабинете у мастера"}
            </p>
            {placeLine ? (
              <p className="ms-client-review-sub">{placeLine}</p>
            ) : null}
            {placeExtra ? (
              <p className="ms-client-review-sub">{placeExtra}</p>
            ) : null}
          </div>
        </div>
      </section>

      {!cancelled ? (
        <section className="ms-client-review-section ms-client-success-rules">
          <div className="ms-client-success-rules-row">
            <img
              className="ms-client-success-rules-ico"
              src={infoIcon}
              width={20}
              height={20}
              alt=""
              aria-hidden
            />
            <p className="ms-client-success-rules-text">
              Перенести или отменить запись можно не позднее чем за{" "}
              {ruHoursLabel(cancelHours)} до визита.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
