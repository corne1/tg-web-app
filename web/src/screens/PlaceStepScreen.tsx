import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  completeMasterOnboarding,
  saveMasterPlace,
  setMasterOnboardingStep,
  type CityHit,
} from "../api";
import infoIcon from "../assets/onboarding/info.svg";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { MsArrowRight } from "../components/master/MsArrowRight";
import { PlacePublishReview } from "../components/master/PlacePublishReview";
import { useBackButton } from "../hooks/useBackButton";
import { useCitySearch } from "../hooks/useCitySearch";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  loadMasterDraft,
  needsStudioPlace,
  needsVisitPlace,
  PLACE_OPTIONS,
  saveMasterDraft,
  type AddressVisibility,
  type MasterDraft,
  type PlaceDetails,
  type PlaceMode,
} from "../lib/masterDraft";
import {
  ADDRESS_VISIBILITY_OPTIONS,
  canContinuePlaceStage1,
  canContinuePlaceStage2,
  deriveDraftCity,
  draftToPlaceDto,
  nextPlaceStage,
  placeStage2Copy,
  prevPlaceStage,
  type PlaceStage,
} from "../lib/placeStepFlow";
import { cacheProfile } from "../lib/profileStorage";

type CityField = "studio" | "visit";

function IconHouse() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="20" fill="#623DF5" />
      <path
        d="M12.5 20.5 20 14.5l7.5 6V28a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 12.5 28v-7.5Z"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 29.5V22h5v7.5"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCar() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="20" fill="#623DF5" />
      <path
        d="M13 23.5h14l-1.2-5.2A2 2 0 0 0 23.9 17H16a2 2 0 0 0-1.9 1.3L13 23.5Z"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="26" r="1.6" fill="#fff" />
      <circle cx="23.5" cy="26" r="1.6" fill="#fff" />
      <path
        d="M13 23.5h-1.2M27 23.5h1.5"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="20" fill="#623DF5" />
      <path
        d="M20 12.5c-3.3 0-6 2.5-6 5.7 0 4.3 6 9.3 6 9.3s6-5 6-9.3c0-3.2-2.7-5.7-6-5.7Z"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="18.2" r="1.8" fill="#fff" />
    </svg>
  );
}

function PlaceIcon({ mode }: { mode: PlaceMode }) {
  if (mode === "studio") return <IconHouse />;
  if (mode === "visit") return <IconCar />;
  return <IconPin />;
}

function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M9 15.5A6.5 6.5 0 1 0 9 2.5a6.5 6.5 0 0 0 0 13ZM17 17l-3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect
        x="4.5"
        y="9"
        width="11"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 9V7a3 3 0 0 1 6 0v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMapPinSmall() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 17s5-4.2 5-8.2A5 5 0 0 0 5 8.8C5 12.8 10 17 10 17Z"
        stroke="#623DF5"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8.5" r="1.6" fill="#623DF5" />
    </svg>
  );
}

function SectionHeading({
  icon,
  title,
}: {
  icon: "studio" | "visit";
  title: string;
}) {
  return (
    <div className="ms-place-section-head">
      {icon === "studio" ? <IconHouse /> : <IconCar />}
      <h3 className="ms-place-section-title">{title}</h3>
    </div>
  );
}

export function PlaceStepScreen() {
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const initial = loadMasterDraft();

  const [stage, setStage] = useState<PlaceStage>(1);
  const [placeMode, setPlaceMode] = useState<PlaceMode | null>(
    initial.placeMode,
  );
  const [studioPlace, setStudioPlace] = useState<PlaceDetails>(
    initial.studioPlace,
  );
  const [visitPlace, setVisitPlace] = useState<PlaceDetails>(
    initial.visitPlace,
  );
  const [activeCityField, setActiveCityField] = useState<CityField | null>(
    null,
  );
  const [studioCityQuery, setStudioCityQuery] = useState(
    initial.studioPlace.city,
  );
  const [visitCityQuery, setVisitCityQuery] = useState(initial.visitPlace.city);
  const [studioCityError, setStudioCityError] = useState(false);
  const [visitCityError, setVisitCityError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "danger">("success");
  const [reviewDraft, setReviewDraft] = useState<MasterDraft>(initial);

  const cityQuery =
    activeCityField === "visit" ? visitCityQuery : studioCityQuery;
  const {
    suggestions: citySuggestions,
    loading: cityLoading,
  } = useCitySearch(Boolean(activeCityField), cityQuery, 8);

  useEffect(() => {
    void setMasterOnboardingStep(4).catch(() => undefined);
  }, []);

  const persist = useCallback(
    (
      nextMode = placeMode,
      nextStudio = studioPlace,
      nextVisit = visitPlace,
    ) => {
      const draft = loadMasterDraft();
      saveMasterDraft({
        ...draft,
        placeMode: nextMode,
        studioPlace: nextStudio,
        visitPlace: nextVisit,
        city: deriveDraftCity(nextStudio, nextVisit, draft.city),
      });
    },
    [placeMode, studioPlace, visitPlace],
  );

  const canContinueStage1 = canContinuePlaceStage1(placeMode);
  const canContinueStage2 = useMemo(
    () => canContinuePlaceStage2(placeMode, studioPlace, visitPlace),
    [placeMode, studioPlace, visitPlace],
  );

  const syncPlaceToServer = useCallback(async () => {
    const draft = loadMasterDraft();
    const place = draftToPlaceDto(draft);
    if (!place) return;
    try {
      const profile = await saveMasterPlace(place);
      cacheProfile(profile);
    } catch {
      // Local draft remains; retry on complete.
    }
  }, []);

  const goBack = useCallback(() => {
    if (activeCityField) {
      setActiveCityField(null);
      return;
    }
    if (stage > 1) {
      setStage((s) => prevPlaceStage(s));
      return;
    }
    persist();
    navigate("/onboarding/hours");
  }, [activeCityField, navigate, persist, stage]);

  const handleClose = useCallback(() => {
    persist();
    webApp?.close?.();
    navigate("/");
  }, [navigate, persist, webApp]);

  const showToast = useCallback(
    (message: string, tone: "success" | "danger" = "success") => {
      setToast(message);
      setToastTone(tone);
      setTimeout(() => setToast(null), 2500);
    },
    [],
  );

  const selectCity = useCallback(
    (field: CityField, hit: CityHit) => {
      if (field === "studio") {
        const next = { ...studioPlace, city: hit.name };
        setStudioPlace(next);
        setStudioCityQuery(hit.name);
        setStudioCityError(false);
        persist(placeMode, next, visitPlace);
      } else {
        const next = { ...visitPlace, city: hit.name };
        setVisitPlace(next);
        setVisitCityQuery(hit.name);
        setVisitCityError(false);
        persist(placeMode, studioPlace, next);
      }
      setActiveCityField(null);
      webApp?.HapticFeedback?.selectionChanged?.();
    },
    [persist, placeMode, studioPlace, visitPlace, webApp],
  );

  const onCityQueryChange = useCallback(
    (field: CityField, value: string) => {
      setActiveCityField(field);
      if (field === "studio") {
        setStudioCityQuery(value);
        setStudioCityError(false);
        if (studioPlace.city && value.trim() !== studioPlace.city) {
          const next = { ...studioPlace, city: "", address: "" };
          setStudioPlace(next);
          persist(placeMode, next, visitPlace);
        }
      } else {
        setVisitCityQuery(value);
        setVisitCityError(false);
        if (visitPlace.city && value.trim() !== visitPlace.city) {
          const next = { ...visitPlace, city: "" };
          setVisitPlace(next);
          persist(placeMode, studioPlace, next);
        }
      }
    },
    [persist, placeMode, studioPlace, visitPlace],
  );

  const onCityBlur = useCallback(
    (field: CityField) => {
      window.setTimeout(() => {
        setActiveCityField((cur) => (cur === field ? null : cur));
        const q =
          field === "studio" ? studioCityQuery.trim() : visitCityQuery.trim();
        const committed =
          field === "studio" ? studioPlace.city.trim() : visitPlace.city.trim();
        if (!q) return;
        if (committed && committed.toLowerCase() === q.toLowerCase()) return;
        const match = citySuggestions.find(
          (c) => c.name.toLowerCase() === q.toLowerCase(),
        );
        if (match) {
          selectCity(field, match);
          return;
        }
        if (field === "studio") setStudioCityError(true);
        else setVisitCityError(true);
      }, 180);
    },
    [
      citySuggestions,
      selectCity,
      studioCityQuery,
      studioPlace.city,
      visitCityQuery,
      visitPlace.city,
    ],
  );

  const handleContinue = useCallback(async () => {
    if (stage === 1) {
      if (!canContinueStage1) return;
      persist();
      webApp?.HapticFeedback?.impactOccurred("light");
      setStage(nextPlaceStage(1));
      return;
    }
    if (stage === 2) {
      if (!canContinueStage2) return;
      persist();
      void syncPlaceToServer();
      webApp?.HapticFeedback?.impactOccurred("light");
      setStage(nextPlaceStage(2));
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      persist();
      const draft = loadMasterDraft();
      const place = draftToPlaceDto(draft);
      const profile = await completeMasterOnboarding({
        hours: draft.hours,
        dayBreakMin: draft.dayBreakMin,
        place,
      });
      cacheProfile(profile);
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate("/cabinet");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Не удалось опубликовать",
        "danger",
      );
    } finally {
      setSaving(false);
    }
  }, [
    canContinueStage1,
    canContinueStage2,
    navigate,
    persist,
    saving,
    showToast,
    stage,
    syncPlaceToServer,
    webApp,
  ]);

  const handleSaveExit = useCallback(() => {
    persist();
    void syncPlaceToServer();
    webApp?.HapticFeedback?.notificationOccurred("success");
    navigate("/");
  }, [navigate, persist, syncPlaceToServer, webApp]);

  useEffect(() => {
    if (stage !== 3) return;
    persist();
    setReviewDraft(loadMasterDraft());
  }, [persist, stage]);

  const editProfile = useCallback(() => {
    persist();
    navigate("/onboarding");
  }, [navigate, persist]);

  const editServices = useCallback(() => {
    persist();
    navigate("/onboarding/services");
  }, [navigate, persist]);

  const editHours = useCallback(() => {
    persist();
    navigate("/onboarding/hours");
  }, [navigate, persist]);

  const editPlace = useCallback(() => {
    persist();
    setStage(1);
  }, [persist]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const primaryLabel =
    stage === 3
      ? saving
        ? "Публикация…"
        : "Опубликовать профиль"
      : "Продолжить";
  const primaryDisabled =
    stage === 1
      ? !canContinueStage1
      : stage === 2
        ? !canContinueStage2
        : saving;

  const stage2 = placeMode ? placeStage2Copy(placeMode) : null;

  const renderCityField = (
    field: CityField,
    query: string,
    committedCity: string,
    hasError: boolean,
  ) => {
    const open = activeCityField === field;
    const showSuggestions = open && query.trim().length > 0 && !hasError;
    const showEmptyError = hasError && query.trim().length > 0;

    return (
      <div className="ms-field ms-city-field">
        <span className="ms-label">Город</span>
        <div
          className={`ms-input-affix ms-input-affix-prefix ms-city-input-wrap ${
            hasError ? "is-invalid" : ""
          } ${open ? "is-open" : ""}`}
        >
          <span className="ms-affix ms-affix-icon" aria-hidden>
            <IconSearch />
          </span>
          <input
            className={`ms-input ms-input-search ${hasError ? "is-invalid" : ""}`}
            value={query}
            onChange={(e) => onCityQueryChange(field, e.target.value)}
            onFocus={() => setActiveCityField(field)}
            onBlur={() => onCityBlur(field)}
            placeholder="Начните вводить название города"
            autoComplete="off"
          />
        </div>

        {showSuggestions && citySuggestions.length > 0 && (
          <ul className="ms-city-suggest" role="listbox">
            {citySuggestions.map((hit) => (
              <li key={`${hit.name}-${hit.region ?? ""}`}>
                <button
                  type="button"
                  className="ms-city-suggest-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectCity(field, hit)}
                >
                  <IconMapPinSmall />
                  <span className="ms-city-suggest-text">
                    <span className="ms-city-suggest-name">{hit.name}</span>
                    {hit.region && (
                      <span className="ms-city-suggest-region">{hit.region}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {showSuggestions &&
          !cityLoading &&
          citySuggestions.length === 0 &&
          query.trim().length > 0 && (
            <div className="ms-city-miss" role="status">
              <IconMapPinSmall />
              <div>
                <p className="ms-city-miss-title">Город не найден</p>
                <p className="ms-city-miss-text">
                  Попробуйте изменить запрос или проверьте написание
                </p>
              </div>
            </div>
          )}

        {showEmptyError && (
          <div className="ms-city-miss" role="alert">
            <IconMapPinSmall />
            <div>
              <p className="ms-city-miss-title">Город не найден</p>
              <p className="ms-city-miss-text">
                Попробуйте изменить запрос или проверьте написание
              </p>
            </div>
          </div>
        )}

        {committedCity && !open && !hasError && (
          <span className="ms-sr-only">Выбран город {committedCity}</span>
        )}
      </div>
    );
  };

  const renderStudioBlock = () => {
    const cityLocked = !studioPlace.city.trim();
    const wrapInCard = placeMode === "both";
    const fields = (
      <>
          {renderCityField(
            "studio",
            studioCityQuery,
            studioPlace.city,
            studioCityError,
          )}

          <label className="ms-field">
            <span className="ms-label">Адрес кабинета или студии</span>
            <div
              className={`ms-input-affix ms-input-affix-prefix ms-input-affix-both ${
                cityLocked ? "is-disabled" : ""
              }`}
            >
              <span className="ms-affix ms-affix-icon" aria-hidden>
                <IconSearch />
              </span>
              <input
                className="ms-input"
                placeholder={
                  cityLocked ? "Сначала выберите город" : "Улица, дом, офис"
                }
                value={studioPlace.address}
                disabled={cityLocked}
                onChange={(e) => {
                  const next = { ...studioPlace, address: e.target.value };
                  setStudioPlace(next);
                  persist(placeMode, next, visitPlace);
                }}
              />
              {cityLocked && (
                <span className="ms-affix ms-affix-end" aria-hidden>
                  <IconLock />
                </span>
              )}
            </div>
          </label>

          <label className="ms-field">
            <span className="ms-label">Как найти вход?</span>
            <textarea
              className="ms-textarea"
              rows={3}
              placeholder="Этаж, номер кабинета, ориентир"
              value={studioPlace.comment}
              onChange={(e) => {
                const next = { ...studioPlace, comment: e.target.value };
                setStudioPlace(next);
                persist(placeMode, next, visitPlace);
              }}
            />
            <span className="ms-field-hint">
              <img src={infoIcon} alt="" className="ms-field-hint-icon" />
              Необязательно
            </span>
          </label>

          <div className="ms-field">
            <span className="ms-label">Когда показывать точный адрес?</span>
            <div
              className="ms-place-visibility"
              role="radiogroup"
              aria-label="Видимость адреса"
            >
              {ADDRESS_VISIBILITY_OPTIONS.map((opt) => {
                const active =
                  studioPlace.addressVisibility === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`ms-place-visibility-card ${
                      active ? "is-active" : ""
                    }`}
                    onClick={() => {
                      const next: PlaceDetails = {
                        ...studioPlace,
                        addressVisibility: opt.id as AddressVisibility,
                      };
                      setStudioPlace(next);
                      persist(placeMode, next, visitPlace);
                      webApp?.HapticFeedback?.selectionChanged?.();
                    }}
                  >
                    <span className="ms-place-text">
                      <span className="ms-place-title">{opt.title}</span>
                      <span className="ms-place-sub">{opt.subtitle}</span>
                    </span>
                    <span
                      className={`ms-radio ${active ? "is-on" : ""}`}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </div>
      </>
    );
    return (
      <section className="ms-place-block">
        {placeMode === "both" && (
          <SectionHeading
            icon="studio"
            title="Приём в кабинете или студии"
          />
        )}
        {wrapInCard ? (
          <div className="ms-place-card-form">{fields}</div>
        ) : (
          fields
        )}
      </section>
    );
  };

  const renderVisitBlock = () => {
    const wrapInCard = placeMode === "both";
    const fields = (
      <>
        {renderCityField(
          "visit",
          visitCityQuery,
          visitPlace.city,
          visitCityError,
        )}
        <label className="ms-field">
          <span className="ms-label">Районы выезда</span>
          <textarea
            className="ms-textarea"
            rows={3}
            placeholder="Например, Хамовники, Арбат, Пресня"
            value={visitPlace.comment}
            onChange={(e) => {
              const next = { ...visitPlace, comment: e.target.value };
              setVisitPlace(next);
              persist(placeMode, studioPlace, next);
            }}
          />
        </label>
        {placeMode === "visit" && (
          <div className="ms-info ms-place-client-info" role="note">
            <img src={infoIcon} alt="" className="ms-info-icon" />
            <div>
              <p className="ms-place-client-info-title">Как это увидит клиент</p>
              <p>
                На вашей странице будет указано, что вы выезжаете к клиентам в
                выбранном городе и районах.
              </p>
            </div>
          </div>
        )}
      </>
    );
    return (
      <section className="ms-place-block">
        {placeMode === "both" && (
          <SectionHeading icon="visit" title="Выезд к клиенту" />
        )}
        {wrapInCard ? (
          <div className="ms-place-card-form">{fields}</div>
        ) : (
          fields
        )}
      </section>
    );
  };

  return (
    <MasterSetupChrome
      step={4}
      progressFilled={4}
      onBack={goBack}
      onClose={handleClose}
      toast={toast}
      toastTone={toastTone}
      onToastDismiss={() => setToast(null)}
      footer={
        <>
          <button
            type="button"
            className="ms-btn-primary"
            disabled={primaryDisabled}
            onClick={() => void handleContinue()}
          >
            {primaryLabel}
            {stage < 3 && <MsArrowRight />}
          </button>
          <button
            type="button"
            className="ms-btn-secondary"
            onClick={handleSaveExit}
          >
            Сохранить и выйти
          </button>
        </>
      }
    >
      {stage === 1 && (
        <>
          <section className="ms-hero">
            <h2 className="ms-question">Где вы принимаете клиентов?</h2>
            <p className="ms-lead">
              Укажите формат приёма, чтобы клиенты понимали, где проходит встреча
            </p>
          </section>
          <p className="ms-stage-label">
            Этап 1 <span>/ 3</span>
          </p>
          <div
            className="ms-place-list"
            role="radiogroup"
            aria-label="Формат приёма"
          >
            {PLACE_OPTIONS.map((opt) => {
              const active = placeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`ms-place-card ${active ? "is-active" : ""}`}
                  onClick={() => {
                    setPlaceMode(opt.id);
                    persist(opt.id);
                    webApp?.HapticFeedback?.selectionChanged?.();
                  }}
                >
                  <PlaceIcon mode={opt.id} />
                  <span className="ms-place-text">
                    <span className="ms-place-title">{opt.title}</span>
                    <span className="ms-place-sub">{opt.subtitle}</span>
                  </span>
                  <span
                    className={`ms-radio ${active ? "is-on" : ""}`}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </>
      )}

      {stage === 2 && placeMode && stage2 && (
        <>
          <section className="ms-hero">
            <h2 className="ms-question">{stage2.title}</h2>
            <p className="ms-lead">{stage2.lead}</p>
          </section>
          <p className="ms-stage-label">
            Этап 2 <span>/ 3</span>
          </p>
          {needsStudioPlace(placeMode) && renderStudioBlock()}
          {needsVisitPlace(placeMode) && renderVisitBlock()}
        </>
      )}

      {stage === 3 && placeMode && (
        <>
          <section className="ms-hero">
            <h2 className="ms-question">Проверьте профиль</h2>
            <p className="ms-lead">
              Всё готово! Проверьте информацию перед публикацией. При
              необходимости вы сможете внести изменения.
            </p>
          </section>
          <p className="ms-stage-label">
            Этап 3 <span>/ 3</span>
          </p>
          <PlacePublishReview
            draft={{
              ...reviewDraft,
              placeMode,
              studioPlace,
              visitPlace,
            }}
            placeMode={placeMode}
            onEditProfile={editProfile}
            onEditServices={editServices}
            onEditHours={editHours}
            onEditPlace={editPlace}
          />
        </>
      )}
    </MasterSetupChrome>
  );
}
