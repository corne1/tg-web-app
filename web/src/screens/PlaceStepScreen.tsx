import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeMasterOnboarding, setMasterOnboardingStep } from "../api";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { MsArrowRight } from "../components/master/MsArrowRight";
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
  type PlaceDetails,
  type PlaceMode,
} from "../lib/masterDraft";
import {
  canContinuePlaceStage1,
  canContinuePlaceStage2,
  deriveDraftCity,
  nextPlaceStage,
  prevPlaceStage,
  type PlaceStage,
} from "../lib/placeStepFlow";
import { cacheProfile } from "../lib/profileStorage";

type Stage = PlaceStage;
type CityField = "studio" | "visit";

function IconStudio() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="20" fill="#6B4EFF" />
      <path
        d="M12 20.5 20 14l8 6.5V28a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 12 28v-7.5Z"
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

function IconVisit() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="20" fill="#6B4EFF" />
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

function IconBoth() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="20" fill="#6B4EFF" />
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
  if (mode === "studio") return <IconStudio />;
  if (mode === "visit") return <IconVisit />;
  return <IconBoth />;
}

export function PlaceStepScreen() {
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const initial = loadMasterDraft();

  const [stage, setStage] = useState<Stage>(1);
  const [placeMode, setPlaceMode] = useState<PlaceMode | null>(
    initial.placeMode,
  );
  const [studioPlace, setStudioPlace] = useState<PlaceDetails>(
    initial.studioPlace,
  );
  const [visitPlace, setVisitPlace] = useState<PlaceDetails>(
    initial.visitPlace,
  );
  const [cityField, setCityField] = useState<CityField | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const {
    suggestions: citySuggestions,
    loading: cityLoading,
    error: cityError,
    setError: setCityError,
    commitQuery: commitCityQuery,
  } = useCitySearch(Boolean(cityField), cityQuery, 12);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "danger">("success");

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

  const goBack = useCallback(() => {
    if (cityField) {
      setCityField(null);
      setCityQuery("");
      setCityError(null);
      return;
    }
    if (stage > 1) {
      setStage((s) => prevPlaceStage(s));
      return;
    }
    persist();
    navigate("/onboarding/hours");
  }, [cityField, navigate, persist, setCityError, stage]);

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
      webApp?.HapticFeedback?.impactOccurred("light");
      setStage(nextPlaceStage(2));
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      persist();
      const draft = loadMasterDraft();
      const profile = await completeMasterOnboarding({
        hours: draft.hours,
        dayBreakMin: draft.dayBreakMin,
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
    webApp,
  ]);

  const handleSaveExit = useCallback(() => {
    persist();
    webApp?.HapticFeedback?.notificationOccurred("success");
    navigate("/");
  }, [navigate, persist, webApp]);

  const openCitySearch = useCallback(
    (field: CityField) => {
      const current =
        field === "studio" ? studioPlace.city : visitPlace.city;
      setCityField(field);
      setCityQuery(current);
      setCityError(null);
    },
    [setCityError, studioPlace.city, visitPlace.city],
  );

  const selectCity = useCallback(
    (city: string) => {
      if (!cityField) return;
      if (cityField === "studio") {
        const next = { ...studioPlace, city };
        setStudioPlace(next);
        persist(placeMode, next, visitPlace);
      } else {
        const next = { ...visitPlace, city };
        setVisitPlace(next);
        persist(placeMode, studioPlace, next);
      }
      setCityField(null);
      setCityQuery("");
      setCityError(null);
      webApp?.HapticFeedback?.selectionChanged?.();
    },
    [cityField, persist, placeMode, setCityError, studioPlace, visitPlace, webApp],
  );

  const tryCommitCityQuery = useCallback(async () => {
    const q = cityQuery.trim();
    if (!q) {
      setCityError("Укажите город");
      return;
    }
    const local = citySuggestions.find(
      (c) => c.toLowerCase() === q.toLowerCase(),
    );
    if (local) {
      selectCity(local);
      return;
    }
    const match = await commitCityQuery(q);
    if (!match) {
      setCityError("Город не найден. Выберите город из списка");
      return;
    }
    selectCity(match);
  }, [cityQuery, citySuggestions, commitCityQuery, selectCity, setCityError]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const primaryLabel =
    stage === 3 ? (saving ? "Публикация…" : "Опубликовать") : "Продолжить";
  const primaryDisabled =
    stage === 1
      ? !canContinueStage1
      : stage === 2
        ? !canContinueStage2
        : saving;

  if (cityField) {
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
          <button
            type="button"
            className="ms-btn-primary"
            disabled={cityLoading}
            onClick={() => void tryCommitCityQuery()}
          >
            Готово
          </button>
        }
      >
        <section className="ms-hero">
          <h2 className="ms-question">Город</h2>
          <p className="ms-lead">Начните вводить название и выберите из списка</p>
        </section>
        <label className="ms-field">
          <span className="ms-label">Поиск города</span>
          <input
            className={`ms-input ms-input-search ${cityError ? "is-invalid" : ""}`}
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              setCityError(null);
            }}
            placeholder="Например, Москва"
            autoFocus
          />
          {cityError && <span className="ms-field-error">{cityError}</span>}
        </label>
        {citySuggestions.length > 0 ? (
          <ul className="ms-city-list">
            {citySuggestions.map((city) => (
              <li key={city}>
                <button
                  type="button"
                  className="ms-city-item"
                  onClick={() => selectCity(city)}
                >
                  {city}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="ms-city-empty">
            <p className="ms-city-empty-title">
              {cityLoading
                ? "Поиск…"
                : cityQuery.trim()
                  ? "Ничего не найдено"
                  : "Введите город"}
            </p>
            <p className="ms-city-empty-text">
              {cityLoading
                ? "Загружаем список городов России"
                : cityQuery.trim()
                  ? "Проверьте написание или выберите другой город"
                  : "Начните вводить название — появятся подсказки"}
            </p>
          </div>
        )}
      </MasterSetupChrome>
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
          <button type="button" className="ms-btn-secondary" onClick={handleSaveExit}>
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
          <div className="ms-place-list" role="radiogroup" aria-label="Формат приёма">
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
                  <span className={`ms-radio ${active ? "is-on" : ""}`} aria-hidden />
                </button>
              );
            })}
          </div>
        </>
      )}

      {stage === 2 && placeMode && (
        <>
          <section className="ms-hero">
            <h2 className="ms-question">Где вы принимаете клиентов?</h2>
            <p className="ms-lead">
              Укажите формат приёма, чтобы клиенты понимали, где проходит встреча
            </p>
          </section>
          <p className="ms-stage-label">
            Этап 2 <span>/ 3</span>
          </p>

          {needsStudioPlace(placeMode) && (
            <section className="ms-place-block">
              <h3 className="ms-hours-section-title">Кабинет или студия</h3>
              <label className="ms-field">
                <span className="ms-label">Город</span>
                <button
                  type="button"
                  className={`ms-select ${!studioPlace.city ? "is-placeholder" : ""}`}
                  onClick={() => openCitySearch("studio")}
                >
                  <span>{studioPlace.city || "Выберите город"}</span>
                  <Chevron />
                </button>
              </label>
              <label className="ms-field">
                <span className="ms-label">Адрес</span>
                <input
                  className="ms-input"
                  placeholder="Улица, дом, офис"
                  value={studioPlace.address}
                  onChange={(e) => {
                    const next = { ...studioPlace, address: e.target.value };
                    setStudioPlace(next);
                    persist(placeMode, next, visitPlace);
                  }}
                />
              </label>
              <label className="ms-field">
                <span className="ms-label">
                  Комментарий <span className="ms-optional">необязательно</span>
                </span>
                <textarea
                  className="ms-textarea"
                  rows={3}
                  placeholder="Как пройти, этаж, домофон"
                  value={studioPlace.comment}
                  onChange={(e) => {
                    const next = { ...studioPlace, comment: e.target.value };
                    setStudioPlace(next);
                    persist(placeMode, next, visitPlace);
                  }}
                />
              </label>
            </section>
          )}

          {needsVisitPlace(placeMode) && (
            <section className="ms-place-block">
              <h3 className="ms-hours-section-title">Выезд к клиенту</h3>
              <label className="ms-field">
                <span className="ms-label">Город выезда</span>
                <button
                  type="button"
                  className={`ms-select ${!visitPlace.city ? "is-placeholder" : ""}`}
                  onClick={() => openCitySearch("visit")}
                >
                  <span>{visitPlace.city || "Выберите город"}</span>
                  <Chevron />
                </button>
              </label>
              <label className="ms-field">
                <span className="ms-label">
                  Комментарий <span className="ms-optional">необязательно</span>
                </span>
                <textarea
                  className="ms-textarea"
                  rows={3}
                  placeholder="Районы выезда, условия"
                  value={visitPlace.comment}
                  onChange={(e) => {
                    const next = { ...visitPlace, comment: e.target.value };
                    setVisitPlace(next);
                    persist(placeMode, studioPlace, next);
                  }}
                />
              </label>
            </section>
          )}
        </>
      )}

      {stage === 3 && placeMode && (
        <>
          <section className="ms-hero">
            <h2 className="ms-question">Готово к публикации</h2>
            <p className="ms-lead">
              Проверьте формат приёма. После публикации клиенты смогут записаться
              по вашей ссылке.
            </p>
          </section>
          <p className="ms-stage-label">
            Этап 3 <span>/ 3</span>
          </p>
          <div className="ms-place-summary">
            <div className="ms-place-card is-active is-static">
              <PlaceIcon mode={placeMode} />
              <span className="ms-place-text">
                <span className="ms-place-title">
                  {PLACE_OPTIONS.find((o) => o.id === placeMode)?.title}
                </span>
                <span className="ms-place-sub">
                  {PLACE_OPTIONS.find((o) => o.id === placeMode)?.subtitle}
                </span>
              </span>
            </div>
            {needsStudioPlace(placeMode) && (
              <div className="ms-place-summary-block">
                <h3 className="ms-hours-section-title">Кабинет или студия</h3>
                <p className="ms-place-summary-line">{studioPlace.city}</p>
                <p className="ms-place-summary-line">{studioPlace.address}</p>
                {studioPlace.comment.trim() && (
                  <p className="ms-place-summary-muted">{studioPlace.comment}</p>
                )}
              </div>
            )}
            {needsVisitPlace(placeMode) && (
              <div className="ms-place-summary-block">
                <h3 className="ms-hours-section-title">Выезд к клиенту</h3>
                <p className="ms-place-summary-line">{visitPlace.city}</p>
                {visitPlace.comment.trim() && (
                  <p className="ms-place-summary-muted">{visitPlace.comment}</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </MasterSetupChrome>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
