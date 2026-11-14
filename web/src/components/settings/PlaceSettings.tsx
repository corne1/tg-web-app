import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  completeMasterOnboarding,
  fetchMe,
  saveMasterPlace,
  setMasterOnboardingStep,
  type CityHit,
} from "../../api";
import infoIcon from "../../assets/onboarding/info.svg";
import { MasterSetupChrome } from "../master/MasterSetupChrome";
import { MsArrowRight } from "../master/MsArrowRight";
import { PlacePublishReview } from "../master/PlacePublishReview";
import { SettingsPageShell } from "./SettingsPageShell";
import type { SettingsMode } from "./settingsMode";
import { useBackButton } from "../../hooks/useBackButton";
import { useCitySearch } from "../../hooks/useCitySearch";
import { useMainButton } from "../../hooks/useMainButton";
import { useTelegram } from "../../hooks/useTelegram";
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
} from "../../lib/masterDraft";
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
} from "../../lib/placeStepFlow";
import { cacheProfile } from "../../lib/profileStorage";
import {
  Button,
  Chip,
  ChipGroup,
  Field,
  Input,
  RadioMark,
  Textarea,
  cx,
} from "../../ui";

type CityField = "studio" | "visit";

/** Figma Fast setting card lead: white 40 circle + filled glyph (21091:28243). */
function PlaceLeadIcon({ children }: { children: ReactNode }) {
  return (
    <span className="ms-place-lead" aria-hidden>
      {children}
    </span>
  );
}

function IconHouse() {
  return (
    <PlaceLeadIcon>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="m13.942 1.713 7.097 6.085c.352.342.619.737.789 1.2.117.318.162.652.172.99l-.001 9.107a3.5 3.5 0 0 1-.09.64 3.006 3.006 0 0 1-2.203 2.181 3.3 3.3 0 0 1-.645.083L16.183 22c-.199-.013-.365-.166-.349-.376.007-.096.063-.172.097-.259.046-.118.064-.239.069-.365l-.001-8.058a2.3 2.3 0 0 0-.065-.453 2.01 2.01 0 0 0-.969-1.241A2.1 2.1 0 0 0 14 11l-4.058.001a2.3 2.3 0 0 0-.453.065c-.525.139-.98.494-1.241.969A2.1 2.1 0 0 0 8 13v8c.005.126.022.247.069.365.033.083.087.156.096.247.023.216-.145.371-.348.388l-2.924-.002a3.4 3.4 0 0 1-.628-.089 3.006 3.006 0 0 1-2.181-2.203 3.4 3.4 0 0 1-.083-.638V9.929c.02-.369.083-.723.223-1.067.178-.436.457-.801.799-1.119l7.053-6.045a3.1 3.1 0 0 1 1.35-.643 3 3 0 0 1 1.813.212c.255.115.487.268.703.446"
        />
      </svg>
    </PlaceLeadIcon>
  );
}

function IconCar() {
  return (
    <PlaceLeadIcon>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="m18.415 5.894.945 2.332.933-.933c.13-.121.276-.213.448-.259a1.01 1.01 0 0 1 .967.259c.25.251.35.625.258.967a1.06 1.06 0 0 1-.259.447l-.9.9a3 3 0 0 1 1.106 1.678c.056.237.08.472.087.715v4.031a3.1 3.1 0 0 1-.223 1.104 3.05 3.05 0 0 1-1.703 1.666l-.074.026V20a1.06 1.06 0 0 1-.134.5 1.01 1.01 0 0 1-.867.5 1.01 1.01 0 0 1-.901-.567A1.1 1.1 0 0 1 18 20v-1H6v1a1.06 1.06 0 0 1-.134.5 1.01 1.01 0 0 1-.867.5 1.01 1.01 0 0 1-.901-.567A1.1 1.1 0 0 1 4 20v-1.173l-.074-.026a3.05 3.05 0 0 1-1.703-1.666A3.1 3.1 0 0 1 2 16v-4.031c.012-.378.076-.753.223-1.104.211-.501.54-.926.97-1.258l-.9-.9a1.06 1.06 0 0 1-.259-.448 1.01 1.01 0 0 1 .259-.967c.251-.25.625-.35.967-.258.172.047.318.138.447.259l.928.928.965-2.41c.139-.302.308-.581.533-.828a3.03 3.03 0 0 1 2.135-.982L15.666 4c.668.025 1.306.235 1.832.655.413.33.711.755.917 1.239M6.927 13.003a1.1 1.1 0 0 0-.426.13 1.01 1.01 0 0 0-.501.866 1.01 1.01 0 0 0 1.083.998 1.01 1.01 0 0 0 .902-1.219 1.01 1.01 0 0 0-.68-.734 1.2 1.2 0 0 0-.378-.041m10 0a1.1 1.1 0 0 0-.426.13 1.01 1.01 0 0 0-.501.866 1.01 1.01 0 0 0 1.083.998 1.01 1.01 0 0 0 .902-1.219 1.01 1.01 0 0 0-.68-.734 1.2 1.2 0 0 0-.378-.041"
        />
      </svg>
    </PlaceLeadIcon>
  );
}

function IconPin() {
  return (
    <PlaceLeadIcon>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="m19.317 15.498-.211.358c-.194.316-.096.159-.293.47l-.227.345-.233.339-.238.334-.241.326-.246.32-.247.313-.249.306-.332.395-.333.382-.332.368-.407.438-.475.491-.531.527-.492.468-.617.564-.357.313a2.04 2.04 0 0 1-1.271.445c-.453 0-.887-.166-1.241-.445l-.594-.526-.588-.547-.511-.494-.385-.387-.397-.412-.407-.438-.331-.368-.333-.382-.333-.396-.25-.306-.246-.313-.246-.32-.242-.328-.237-.333-.234-.34-.227-.346-.221-.351-.214-.357a16 16 0 0 1-.985-1.99c-.511-1.271-.812-2.625-.755-4A9.03 9.03 0 0 1 5.36 3.925c1.653-1.807 4.052-2.91 6.509-2.924a9.4 9.4 0 0 1 2.083.211 9 9 0 0 1 3.026 1.289 9.1 9.1 0 0 1 2.463 2.435 8.94 8.94 0 0 1 1.546 4.575 8.6 8.6 0 0 1-.155 2.143c-.28 1.364-.833 2.635-1.515 3.844m-7.479-9.495a4.008 4.008 0 0 0-1.911.576 4.03 4.03 0 0 0-1.925 3.306 4.03 4.03 0 0 0 1.202 2.975 4.03 4.03 0 0 0 3.002 1.135 4.03 4.03 0 0 0 3.215-1.923 4.06 4.06 0 0 0 .538-2.643c-.184-1.394-1.165-2.614-2.46-3.137a4 4 0 0 0-1.661-.289"
        />
      </svg>
    </PlaceLeadIcon>
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

export function PlaceSettings({ mode }: { mode: SettingsMode }) {
  const navigate = useNavigate();
  const isSettings = mode === "settings";
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
  const [travelBufferMin, setTravelBufferMin] = useState<number>(30);

  const cityQuery =
    activeCityField === "visit" ? visitCityQuery : studioCityQuery;
  const {
    suggestions: citySuggestions,
    loading: cityLoading,
  } = useCitySearch(Boolean(activeCityField), cityQuery, 8);

  useEffect(() => {
    if (isSettings) return;
    void setMasterOnboardingStep(4).catch(() => undefined);
  }, [isSettings]);

  useEffect(() => {
    let cancelled = false;
    void fetchMe()
      .then((me) => {
        if (cancelled) return;
        const buf = me.profile?.travelBufferMin;
        if (buf != null && buf > 0) setTravelBufferMin(buf);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
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
      const profile = await saveMasterPlace(place, {
        travelBufferMin:
          place.mode === "studio" ? null : travelBufferMin,
      });
      cacheProfile(profile);
      if (profile.travelBufferMin != null) {
        setTravelBufferMin(profile.travelBufferMin);
      }
    } catch {
      // Local draft remains; retry on complete.
    }
  }, [travelBufferMin]);

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
    navigate(isSettings ? "/cabinet/profile" : "/onboarding/hours");
  }, [activeCityField, isSettings, navigate, persist, stage]);

  const handleClose = useCallback(() => {
    persist();
    if (isSettings) {
      navigate("/cabinet/profile");
      return;
    }
    webApp?.close?.();
    navigate("/");
  }, [isSettings, navigate, persist, webApp]);

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
        // Figma both-mode: visit has no city field — inherit studio city.
        const nextVisit =
          placeMode === "both"
            ? { ...visitPlace, city: hit.name }
            : visitPlace;
        if (placeMode === "both") {
          setVisitPlace(nextVisit);
          setVisitCityQuery(hit.name);
        }
        persist(placeMode, next, nextVisit);
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
          const nextVisit =
            placeMode === "both" ? { ...visitPlace, city: "" } : visitPlace;
          if (placeMode === "both") {
            setVisitPlace(nextVisit);
            setVisitCityQuery("");
          }
          persist(placeMode, next, nextVisit);
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
      if (isSettings) {
        webApp?.HapticFeedback?.notificationOccurred("success");
        navigate("/cabinet/profile");
        return;
      }
      webApp?.HapticFeedback?.impactOccurred("light");
      setStage(nextPlaceStage(2));
      return;
    }
    if (isSettings) {
      persist();
      void syncPlaceToServer();
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate("/cabinet/profile");
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
        scheduleBreak: draft.scheduleBreak,
        place,
      });
      cacheProfile(profile);
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate("/onboarding/success", {
        replace: true,
        state: {
          profile,
          bookingLink: profile.bookingLink ?? null,
        },
      });
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
    isSettings,
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
    navigate(isSettings ? "/cabinet/profile" : "/");
  }, [isSettings, navigate, persist, syncPlaceToServer, webApp]);

  useEffect(() => {
    if (stage !== 3) return;
    persist();
    setReviewDraft(loadMasterDraft());
  }, [persist, stage]);

  const editProfile = useCallback(() => {
    if (isSettings) return;
    persist();
    navigate("/onboarding");
  }, [isSettings, navigate, persist]);

  const editServices = useCallback(() => {
    if (isSettings) return;
    persist();
    navigate("/onboarding/services");
  }, [isSettings, navigate, persist]);

  const editHours = useCallback(() => {
    if (isSettings) return;
    persist();
    navigate("/onboarding/hours");
  }, [isSettings, navigate, persist]);

  const editPlace = useCallback(() => {
    persist();
    setStage(1);
  }, [persist]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const primaryLabel =
    isSettings && stage === 2
      ? "Сохранить"
      : stage === 3
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
      <Field label="Город" className="ms-city-field">
        <div
          className={cx(
            "ms-input-affix",
            "ms-input-affix-prefix",
            "ms-city-input-wrap",
            hasError && "is-invalid",
            open && "is-open",
          )}
        >
          <span className="ms-affix ms-affix-icon" aria-hidden>
            <IconSearch />
          </span>
          <Input
            className="ms-input-search"
            invalid={hasError}
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
      </Field>
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

          <Field label="Адрес кабинета или студии" as="label">
            <div
              className={cx(
                "ms-input-affix",
                "ms-input-affix-prefix",
                "ms-input-affix-both",
                cityLocked && "is-disabled",
              )}
            >
              <span className="ms-affix ms-affix-icon" aria-hidden>
                <IconSearch />
              </span>
              <Input
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
          </Field>

          <Field label="Как найти вход?" as="label">
            <Textarea
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
          </Field>

          <Field label="Когда показывать точный адрес?">
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
                    className={cx(
                      "ms-place-visibility-card",
                      active && "is-active",
                    )}
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
                    <RadioMark checked={active} />
                  </button>
                );
              })}
            </div>
          </Field>
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
        {/* Figma 21126:6981 both-mode: only areas; city comes from studio. */}
        {placeMode !== "both" &&
          renderCityField(
            "visit",
            visitCityQuery,
            visitPlace.city,
            visitCityError,
          )}
        <Field label="Районы выезда" as="label">
          <Textarea
            rows={3}
            placeholder="Например, Хамовники, Арбат, Пресня"
            value={visitPlace.comment}
            onChange={(e) => {
              const next = {
                ...visitPlace,
                comment: e.target.value,
                city:
                  placeMode === "both"
                    ? studioPlace.city
                    : visitPlace.city,
              };
              setVisitPlace(next);
              persist(placeMode, studioPlace, next);
            }}
          />
        </Field>
        <Field label="Время на дорогу" as="div">
          <ChipGroup label="Время на дорогу">
            {[15, 30, 45, 60, 90, 120].map((min) => (
              <Chip
                key={min}
                active={travelBufferMin === min}
                onClick={() => setTravelBufferMin(min)}
              >
                {min} мин
              </Chip>
            ))}
          </ChipGroup>
        </Field>
        <p className="ms-place-travel-hint">
          Резервируется перед началом визита. Клиент видит время начала приёма.
        </p>
        {placeMode === "visit" && (
          <div className="ms-info ms-place-client-info" role="note">
            <img
              src={infoIcon}
              alt=""
              className="ms-info-icon"
              width={20}
              height={20}
            />
            <div className="ms-info-copy">
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

  const footer = isSettings ? (
    <Button
      disabled={primaryDisabled}
      onClick={() => void handleContinue()}
    >
      {primaryLabel}
      {stage === 1 ? <MsArrowRight /> : null}
    </Button>
  ) : (
    <>
      <Button
        disabled={primaryDisabled}
        onClick={() => void handleContinue()}
      >
        {primaryLabel}
        {stage < 3 && <MsArrowRight />}
      </Button>
      <Button variant="secondary" onClick={handleSaveExit}>
        Сохранить и выйти
      </Button>
    </>
  );

  const body = (
    <>
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
                  <RadioMark checked={active} />
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
    </>
  );

  if (isSettings) {
    return (
      <SettingsPageShell
        title="Место приёма"
        onBack={goBack}
        onClose={handleClose}
        toast={toast}
        toastTone={toastTone}
        onToastDismiss={() => setToast(null)}
        footer={footer}
      >
        {body}
      </SettingsPageShell>
    );
  }

  return (
    <MasterSetupChrome
      step={4}
      progressFilled={4}
      onBack={goBack}
      onClose={handleClose}
      toast={toast}
      toastTone={toastTone}
      onToastDismiss={() => setToast(null)}
      footer={footer}
    >
      {body}
    </MasterSetupChrome>
  );
}
