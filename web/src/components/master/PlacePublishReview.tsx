import { useMemo, useState } from "react";
import avatarPlaceholder from "../../assets/onboarding/avatar-placeholder.svg";
import clockIcon from "../../assets/cabinet/clock.svg";
import serviceSparkIcon from "../../assets/onboarding/service-spark.svg";
import { useServiceTypes } from "../../hooks/useServiceTypes";
import {
  formatDuration,
  formatPrice,
  needsStudioPlace,
  needsVisitPlace,
  type MasterDraft,
  type PlaceMode,
} from "../../lib/masterDraft";
import {
  formatStudioAddressLine,
  REVIEW_SERVICES_PREVIEW,
  reviewAddressVisibilityNote,
  reviewDaysOffShort,
  reviewWorkingDayRows,
} from "../../lib/placeStepFlow";

type Props = {
  draft: MasterDraft;
  placeMode: PlaceMode;
  onEditProfile: () => void;
  onEditServices: () => void;
  onEditHours: () => void;
  onEditPlace: () => void;
};

function StatusFilled() {
  return (
    <span className="ms-review-status">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="7" cy="7" r="7" fill="#12B76A" />
        <path
          d="M4 7.1 5.9 9 10 4.9"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Заполнено
    </span>
  );
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect
        x="3.25"
        y="4.5"
        width="13.5"
        height="12.25"
        rx="2"
        stroke="#9196A1"
        strokeWidth="1.4"
      />
      <path
        d="M3.25 8.25h13.5M7 3.25v2.5M13 3.25v2.5"
        stroke="#9196A1"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCalendarOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect
        x="3.25"
        y="4.5"
        width="13.5"
        height="12.25"
        rx="2"
        stroke="#9196A1"
        strokeWidth="1.4"
      />
      <path
        d="M3.25 8.25h13.5M7 3.25v2.5M13 3.25v2.5"
        stroke="#9196A1"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M7.5 11.5 12.5 14.5M12.5 11.5 7.5 14.5"
        stroke="#9196A1"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 6.5 8 10.5 12 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHouseSmall() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 9.5 10 4.5l6 5V16a1.2 1.2 0 0 1-1.2 1.2H5.2A1.2 1.2 0 0 1 4 16V9.5Z"
        stroke="#623DF5"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8 17.2V12h4v5.2"
        stroke="#623DF5"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCarSmall() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4.5 12h11l-1-4.2A1.6 1.6 0 0 0 13 6.5H7A1.6 1.6 0 0 0 5.5 7.8L4.5 12Z"
        stroke="#623DF5"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="14" r="1.2" fill="#623DF5" />
      <circle cx="13" cy="14" r="1.2" fill="#623DF5" />
      <path
        d="M4.5 12H3.5M15.5 12H16.5"
        stroke="#623DF5"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M8.2 8.25A2.25 2.25 0 0 0 11.7 11.7M4.4 4.5 15.6 15.7M8.85 5.2A7.6 7.6 0 0 1 10 5.1c3.7 0 6.55 2.35 7.75 4.9a.7.7 0 0 1 0 .7 10.4 10.4 0 0 1-2.05 2.7M13.1 13.35A7.5 7.5 0 0 1 10 14.9c-3.7 0-6.55-2.35-7.75-4.9a.7.7 0 0 1 0-.7 10.3 10.3 0 0 1 3.05-3.25"
        stroke="#9196A1"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="ms-review-edit" onClick={onClick}>
      Редактировать
    </button>
  );
}

export function PlacePublishReview({
  draft,
  placeMode,
  onEditProfile,
  onEditServices,
  onEditHours,
  onEditPlace,
}: Props) {
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const { serviceTypes, metaFor } = useServiceTypes();

  const meta = metaFor(draft.serviceTypeCode, serviceTypes);
  const displayName = draft.name.trim() || "Мастер";
  const displayTitle = meta?.title ?? "";
  const displayChip = meta?.label ?? "";

  const hourRows = useMemo(
    () => reviewWorkingDayRows(draft.hours),
    [draft.hours],
  );
  const daysOff = useMemo(
    () => reviewDaysOffShort(draft.hours),
    [draft.hours],
  );

  const services = draft.services;
  const showAllToggle = services.length > REVIEW_SERVICES_PREVIEW;
  const visibleServices =
    servicesExpanded || !showAllToggle
      ? services
      : services.slice(0, REVIEW_SERVICES_PREVIEW);

  const studioLine = formatStudioAddressLine(draft.studioPlace);
  const visitAreas = draft.visitPlace.comment.trim();
  const visitCity = draft.visitPlace.city.trim();
  const visibilityNote = reviewAddressVisibilityNote(
    draft.studioPlace.addressVisibility,
  );

  return (
    <div className="ms-review" aria-label="Проверка профиля перед публикацией">
      <article className="ms-review-card">
        <header className="ms-review-card-head">
          <h3 className="ms-review-card-title">1. Профиль мастера</h3>
          <StatusFilled />
        </header>
        <div className="ms-review-inset ms-review-profile">
          <img
            className="ms-avatar"
            src={avatarPlaceholder}
            width={48}
            height={48}
            alt=""
            aria-hidden
          />
          <div className="ms-preview-meta">
            <p className="ms-preview-name">
              {displayName} — {displayTitle}
            </p>
            <div className="ms-preview-tags">
              <span className="ms-tag">{displayChip}</span>
            </div>
          </div>
        </div>
        <EditButton onClick={onEditProfile} />
      </article>

      <article className="ms-review-card">
        <header className="ms-review-card-head">
          <h3 className="ms-review-card-title">2. Услуги</h3>
          <StatusFilled />
        </header>
        <p className="ms-review-count">Добавленные: {services.length}</p>
        {visibleServices.length > 0 && (
          <ul className="ms-service-list ms-review-service-list">
            {visibleServices.map((s) => (
              <li key={s.id} className="ms-service-card ms-review-service-card">
                <div className="ms-service-avatar" aria-hidden>
                  <img
                    className="ms-service-spark"
                    src={serviceSparkIcon}
                    width={20}
                    height={20}
                    alt=""
                  />
                </div>
                <div className="ms-service-meta">
                  <p className="ms-service-title">{s.title}</p>
                  <p className="ms-service-sub">
                    <span className="ms-service-duration">
                      <img
                        className="ms-service-timer"
                        src={clockIcon}
                        width={16}
                        height={16}
                        alt=""
                        aria-hidden
                      />
                      {formatDuration(s.durationMin)}
                    </span>
                    <span className="ms-service-sep" aria-hidden>
                      ·
                    </span>
                    <span className="ms-review-service-price">
                      {formatPrice(s)}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {showAllToggle && !servicesExpanded && (
          <button
            type="button"
            className="ms-review-show-all"
            onClick={() => setServicesExpanded(true)}
          >
            <span>Показать все</span>
            <ChevronDown />
          </button>
        )}
        <EditButton onClick={onEditServices} />
      </article>

      <article className="ms-review-card">
        <header className="ms-review-card-head">
          <h3 className="ms-review-card-title">3. Рабочее время</h3>
          <StatusFilled />
        </header>
        <ul className="ms-review-inset ms-review-hours">
          {hourRows.map((row) => (
            <li key={row.dayId} className="ms-review-hours-row">
              <span className="ms-review-hours-day">
                <IconCalendar />
                <span>{row.label}</span>
              </span>
              <span className="ms-review-hours-range">{row.range}</span>
            </li>
          ))}
          {daysOff ? (
            <li className="ms-review-hours-row">
              <span className="ms-review-hours-day">
                <IconCalendarOff />
                <span className="ms-review-days-off-label">Выходные</span>
              </span>
              <span className="ms-review-hours-range">{daysOff}</span>
            </li>
          ) : null}
        </ul>
        <EditButton onClick={onEditHours} />
      </article>

      <article className="ms-review-card">
        <header className="ms-review-card-head">
          <h3 className="ms-review-card-title">4. Место приёма</h3>
          <StatusFilled />
        </header>
        <div className="ms-review-inset ms-review-place-panel">
          {needsStudioPlace(placeMode) && studioLine && (
            <div className="ms-review-place-row">
              <IconHouseSmall />
              <div className="ms-review-place-text">
                <p className="ms-review-place-title">Кабинет</p>
                <p className="ms-review-place-sub">{studioLine}</p>
              </div>
            </div>
          )}
          {needsVisitPlace(placeMode) && (
            <div className="ms-review-place-row">
              <IconCarSmall />
              <div className="ms-review-place-text">
                <p className="ms-review-place-title">Выезд к клиенту</p>
                <p className="ms-review-place-sub">
                  {visitAreas || visitCity || "Районы не указаны"}
                </p>
              </div>
            </div>
          )}
          {needsStudioPlace(placeMode) && (
            <p className="ms-review-visibility">
              <IconEyeOff />
              <span>{visibilityNote}</span>
            </p>
          )}
        </div>
        <EditButton onClick={onEditPlace} />
      </article>
    </div>
  );
}
