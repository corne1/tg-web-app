import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  clearFromReview,
  clearRememberedPlaceStage,
  initialOnboardingPlaceStage,
  markFromReview,
  rememberOnboardingReview,
} from "../../lib/onboardingReviewEdit";
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
import { loadMasterAvatarDataUrl } from "../../lib/masterAvatar";
import { useBackButton } from "../../hooks/useBackButton";
import { useCitySearch } from "../../hooks/useCitySearch";
import { useMainButton } from "../../hooks/useMainButton";
import { useTelegram } from "../../hooks/useTelegram";
import {
  isPlaceDetailsValid,
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
  reviewAddressVisibilityNote,
  type PlaceStage,
} from "../../lib/placeStepFlow";

/** Cabinet «Место приёма» views (Figma 21446:19094 hub + format + detail). */
type CabinetPlaceView = "hub" | "format" | "studio" | "visit";
import { cacheProfile } from "../../lib/profileStorage";
import {
  Button,
  Chip,
  ChipGroup,
  Field,
  Input,
  RadioMark,
  Textarea,
  TEXTAREA_MAX_LEN,
  cx,
} from "../../ui";
import {
  IconLock,
  IconSearch,
  PlaceIcon,
  SectionHeading,
} from "./PlaceSettingsParts";
import { PlaceCityField } from "./PlaceCityField";

type CityField = "studio" | "visit";

export function PlaceSettings({ mode }: { mode: SettingsMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSettings = mode === "settings";
  const { webApp } = useTelegram();
  const initial = loadMasterDraft();

  const [stage, setStage] = useState<PlaceStage>(() =>
    isSettings ? 1 : initialOnboardingPlaceStage(location.state),
  );
  /** Editing place details via review «Изменить» — Save returns to stage 3. */
  const [placeEditFromReview, setPlaceEditFromReview] = useState(false);
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
  const [reviewAvatarUrl, setReviewAvatarUrl] = useState<string | null>(() =>
    loadMasterAvatarDataUrl(),
  );
  const [travelBufferMin, setTravelBufferMin] = useState<number>(30);
  const [cabinetView, setCabinetView] = useState<CabinetPlaceView>(() =>
    mode === "settings" ? (initial.placeMode ? "hub" : "format") : "hub",
  );

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

  // Remember the checklist so a later history POP (state was never written
  // onto the original place entry) still opens «Проверьте профиль».
  // Do not replace the history entry here: a new location key remounts the
  // route and used to drop the stage back to 1.
  useEffect(() => {
    if (isSettings || stage !== 3 || placeEditFromReview) return;
    rememberOnboardingReview();
    clearFromReview();
  }, [isSettings, placeEditFromReview, stage]);

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
    if (isSettings) {
      if (cabinetView === "studio" || cabinetView === "visit") {
        setCabinetView("hub");
        return;
      }
      if (cabinetView === "format") {
        setCabinetView(placeMode ? "hub" : "format");
        if (placeMode) return;
      }
      persist();
      navigate("/cabinet/profile");
      return;
    }
    // Review «Редактировать» (место): back returns to review, not prior wizard stage.
    if (placeEditFromReview && stage < 3) {
      persist();
      setPlaceEditFromReview(false);
      clearFromReview();
      setStage(3);
      return;
    }
    if (stage > 1) {
      setStage((s) => prevPlaceStage(s));
      return;
    }
    persist();
    clearFromReview();
    clearRememberedPlaceStage();
    navigate("/onboarding/hours");
  }, [
    activeCityField,
    cabinetView,
    isSettings,
    navigate,
    persist,
    placeEditFromReview,
    placeMode,
    stage,
  ]);

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
      if (placeEditFromReview) {
        // Same place block only: finish details if needed, else back to review.
        if (canContinueStage2) {
          void syncPlaceToServer();
          setPlaceEditFromReview(false);
          clearFromReview();
          setStage(3);
        } else {
          setStage(2);
        }
        return;
      }
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
      if (placeEditFromReview) {
        webApp?.HapticFeedback?.notificationOccurred("success");
        setPlaceEditFromReview(false);
        clearFromReview();
        setStage(3);
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
      clearFromReview();
      clearRememberedPlaceStage();
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
    placeEditFromReview,
    saving,
    showToast,
    stage,
    syncPlaceToServer,
    webApp,
  ]);

  useEffect(() => {
    if (stage !== 3) return;
    persist();
    setReviewDraft(loadMasterDraft());
    setReviewAvatarUrl(loadMasterAvatarDataUrl());
  }, [persist, stage]);

  const editProfile = useCallback(() => {
    if (isSettings) return;
    persist();
    markFromReview();
    navigate("/onboarding", { state: { fromReview: true } });
  }, [isSettings, navigate, persist]);

  const editServices = useCallback(() => {
    if (isSettings) return;
    persist();
    markFromReview();
    navigate("/onboarding/services", { state: { fromReview: true } });
  }, [isSettings, navigate, persist]);

  const editHours = useCallback(() => {
    if (isSettings) return;
    persist();
    markFromReview();
    navigate("/onboarding/hours", { state: { fromReview: true } });
  }, [isSettings, navigate, persist]);

  const editPlace = useCallback(() => {
    persist();
    markFromReview();
    setPlaceEditFromReview(true);
    // Open place details (stage 2); format only if mode not chosen yet.
    setStage(placeMode ? 2 : 1);
  }, [persist, placeMode]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const primaryLabel =
    placeEditFromReview && stage < 3
      ? "Сохранить"
      : isSettings && stage === 2
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
  ) => (
    <PlaceCityField
      query={query}
      committedCity={committedCity}
      hasError={hasError}
      open={activeCityField === field}
      loading={cityLoading}
      suggestions={citySuggestions}
      onQueryChange={(value) => onCityQueryChange(field, value)}
      onFocus={() => setActiveCityField(field)}
      onBlur={() => onCityBlur(field)}
      onSelect={(hit) => selectCity(field, hit)}
    />
  );

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
              maxLength={TEXTAREA_MAX_LEN}
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
        <div
          className={wrapInCard ? "ms-place-card-form" : "ms-place-fields"}
        >
          {fields}
        </div>
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
            maxLength={TEXTAREA_MAX_LEN}
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
        <div
          className={wrapInCard ? "ms-place-card-form" : "ms-place-fields"}
        >
          {fields}
        </div>
      </section>
    );
  };

  const formatList = (
    <>
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
  );

  const studioConfigured = isPlaceDetailsValid(studioPlace, true);
  const visitConfigured =
    placeMode === "both"
      ? Boolean(studioPlace.city.trim() || visitPlace.city.trim())
      : isPlaceDetailsValid(visitPlace, false);
  const studioLine = [studioPlace.city.trim(), studioPlace.address.trim()]
    .filter(Boolean)
    .join(", ");
  const visitLine = [
    visitPlace.city.trim() ||
      (placeMode === "both" ? studioPlace.city.trim() : ""),
    visitPlace.comment.trim()
      ? `районы: ${visitPlace.comment.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");

  const handleCabinetPrimary = useCallback(async () => {
    if (cabinetView === "hub") {
      setCabinetView("format");
      return;
    }
    if (cabinetView === "format") {
      if (!placeMode) return;
      persist();
      webApp?.HapticFeedback?.impactOccurred("light");
      if (needsStudioPlace(placeMode) && !isPlaceDetailsValid(studioPlace, true)) {
        setCabinetView("studio");
        return;
      }
      if (
        needsVisitPlace(placeMode) &&
        placeMode !== "both" &&
        !isPlaceDetailsValid(visitPlace, false)
      ) {
        setCabinetView("visit");
        return;
      }
      void syncPlaceToServer();
      setCabinetView("hub");
      showToast("Сохранено");
      return;
    }
    if (cabinetView === "studio") {
      if (!isPlaceDetailsValid(studioPlace, true)) return;
      persist();
      void syncPlaceToServer();
      webApp?.HapticFeedback?.notificationOccurred("success");
      if (needsVisitPlace(placeMode) && placeMode !== "both" && !visitConfigured) {
        setCabinetView("visit");
        return;
      }
      setCabinetView("hub");
      showToast("Сохранено");
      return;
    }
    if (cabinetView === "visit") {
      if (placeMode !== "both" && !isPlaceDetailsValid(visitPlace, false)) return;
      persist();
      void syncPlaceToServer();
      webApp?.HapticFeedback?.notificationOccurred("success");
      setCabinetView("hub");
      showToast("Сохранено");
    }
  }, [
    cabinetView,
    persist,
    placeMode,
    showToast,
    studioPlace,
    syncPlaceToServer,
    visitConfigured,
    visitPlace,
    webApp,
  ]);

  const cabinetFooterDisabled =
    cabinetView === "format"
      ? !placeMode
      : cabinetView === "studio"
        ? !studioConfigured
        : cabinetView === "visit"
          ? placeMode !== "both" && !isPlaceDetailsValid(visitPlace, false)
          : false;

  const cabinetFooterLabel =
    cabinetView === "hub" ? "Изменить формат работы" : "Сохранить";

  const cabinetShellTitle =
    cabinetView === "studio"
      ? "Кабинет"
      : cabinetView === "visit"
        ? "Выезд к клиенту"
        : cabinetView === "format"
          ? "Где вы принимаете клиентов?"
          : "Место приёма";

  const cabinetShellLead =
    cabinetView === "format"
      ? "Укажите формат приёма, чтобы клиенты понимали, где проходит встреча"
      : cabinetView === "hub"
        ? "Адрес кабинета и районы выезда"
        : undefined;

  const cabinetBody =
    cabinetView === "hub" ? (
      <div className="ms-place-hub">
        {placeMode && needsStudioPlace(placeMode) ? (
          <button
            type="button"
            className="ms-place-hub-card"
            onClick={() => setCabinetView("studio")}
          >
            <PlaceIcon mode="studio" />
            <span className="ms-place-hub-copy">
              <span className="ms-place-hub-title-row">
                <span className="ms-place-hub-title">Кабинет</span>
                <span
                  className={cx(
                    "ms-place-hub-badge",
                    studioConfigured ? "is-ok" : "is-empty",
                  )}
                >
                  {studioConfigured ? "Настроено" : "Пусто"}
                </span>
              </span>
              <span className="ms-place-hub-sub">
                {studioConfigured ? studioLine : "Адрес не указан"}
              </span>
              {studioConfigured ? (
                <span className="ms-place-hub-note">
                  {reviewAddressVisibilityNote(studioPlace.addressVisibility)}
                </span>
              ) : null}
            </span>
          </button>
        ) : null}
        {placeMode && needsVisitPlace(placeMode) ? (
          <button
            type="button"
            className="ms-place-hub-card"
            onClick={() => setCabinetView("visit")}
          >
            <PlaceIcon mode="visit" />
            <span className="ms-place-hub-copy">
              <span className="ms-place-hub-title-row">
                <span className="ms-place-hub-title">Выезд к клиенту</span>
                <span
                  className={cx(
                    "ms-place-hub-badge",
                    visitConfigured ? "is-ok" : "is-empty",
                  )}
                >
                  {visitConfigured ? "Настроено" : "Пусто"}
                </span>
              </span>
              <span className="ms-place-hub-sub">
                {visitConfigured
                  ? visitLine || "Районы не указаны"
                  : "Районы не указаны"}
              </span>
            </span>
          </button>
        ) : null}
      </div>
    ) : cabinetView === "format" ? (
      formatList
    ) : cabinetView === "studio" ? (
      renderStudioBlock()
    ) : (
      renderVisitBlock()
    );

  const footer = isSettings ? (
    <Button
      disabled={cabinetFooterDisabled}
      onClick={() => void handleCabinetPrimary()}
    >
      {cabinetFooterLabel}
    </Button>
  ) : (
    <>
      <Button
        disabled={primaryDisabled}
        onClick={() => void handleContinue()}
      >
        {primaryLabel}
        {stage < 3 && !placeEditFromReview && <MsArrowRight />}
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
          {formatList}
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
            avatarUrl={reviewAvatarUrl}
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
        title={cabinetShellTitle}
        lead={cabinetShellLead}
        titlePlacement="page"
        onBack={goBack}
        toast={toast}
        toastTone={toastTone}
        onToastDismiss={() => setToast(null)}
        footer={footer}
      >
        {cabinetBody}
      </SettingsPageShell>
    );
  }

  return (
    <MasterSetupChrome
      step={4}
      progressFilled={4}
      onBack={goBack}
      toast={toast}
      toastTone={toastTone}
      onToastDismiss={() => setToast(null)}
      footer={footer}
    >
      {body}
    </MasterSetupChrome>
  );
}
