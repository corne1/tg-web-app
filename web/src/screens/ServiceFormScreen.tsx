import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { saveMasterService } from "../api";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  BREAK_OPTIONS,
  DURATION_OPTIONS,
  formatDuration,
  getService,
  MAX_BREAK_AFTER_MIN,
  upsertService,
} from "../lib/masterDraft";
import {
  emptyServiceForm,
  formFromService,
  formToMasterService,
  type ServiceFormState,
} from "../lib/serviceFormState";
import {
  breakError,
  splitDurationMinutes,
  validateServiceForm,
  type ServiceFormErrors,
} from "../lib/serviceFormValidation";

type Mode = "new" | "edit" | "duplicate";
type FormState = ServiceFormState;
type Errors = ServiceFormErrors;

type Sheet = "duration" | "break" | null;
type SheetPanel = "list" | "custom";

export function ServiceFormScreen({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const { serviceId } = useParams();
  const { webApp } = useTelegram();

  const source = serviceId ? getService(serviceId) : null;
  const [form, setForm] = useState<FormState>(() => {
    if ((mode === "edit" || mode === "duplicate") && source) {
      return formFromService(source, mode === "duplicate");
    }
    return emptyServiceForm();
  });
  const [errors, setErrors] = useState<Errors>({});
  const [sheet, setSheet] = useState<Sheet>(null);
  const [sheetPanel, setSheetPanel] = useState<SheetPanel>("list");
  const [sheetDraftBreak, setSheetDraftBreak] = useState(0);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(40);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const headings = useMemo(() => {
    if (mode === "edit") {
      return { title: "Редактирование услуги", cta: "Сохранить изменения" };
    }
    if (mode === "duplicate") {
      return { title: "Дублирование услуги", cta: "Создать услугу" };
    }
    return { title: "Новая услуга", cta: "Создать услугу" };
  }, [mode]);

  const breakLabel = form.useCustomBreak
    ? form.customBreak
      ? formatDuration(Number(form.customBreak) || 0)
      : "Выбрать другое время"
    : (BREAK_OPTIONS.find((o) => o.value === form.breakAfterMin)?.label ??
      "Без перерыва");

  const goBack = useCallback(
    () => navigate("/onboarding/services"),
    [navigate],
  );

  const handleClose = useCallback(() => {
    webApp?.close?.();
    navigate("/");
  }, [navigate, webApp]);

  const openCustomDuration = useCallback(() => {
    const mins = form.useCustomDuration
      ? Number(form.customDuration) || 40
      : 40;
    const parts = splitDurationMinutes(mins);
    setCustomHours(parts.hours);
    setCustomMinutes(parts.minutes);
    setSheetPanel("custom");
    setSheet("duration");
  }, [form.customDuration, form.useCustomDuration]);

  const openSheet = useCallback(
    (next: Sheet) => {
      if (next === "duration") {
        openCustomDuration();
        return;
      }
      if (next === "break") {
        setSheetDraftBreak(form.useCustomBreak ? 0 : form.breakAfterMin);
        setSheetPanel(form.useCustomBreak ? "custom" : "list");
      }
      setSheet(next);
    },
    [form.breakAfterMin, form.useCustomBreak, openCustomDuration],
  );

  const closeSheet = useCallback(() => {
    setSheet(null);
    setSheetPanel("list");
  }, []);

  const validate = useCallback((): Errors => validateServiceForm(form), [form]);

  const submit = useCallback(async () => {
    if (saving) return;
    setTried(true);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      webApp?.HapticFeedback?.notificationOccurred("error");
      return;
    }

    const service = formToMasterService(form, {
      mode,
      sourceId: source?.id,
    });

    setSaving(true);
    setSubmitError(null);
    try {
      const saved = await saveMasterService(service);
      upsertService({
        ...service,
        id: saved.id,
        title: saved.title,
        durationMin: saved.durationMin,
        price: saved.price,
        priceTo: service.priceTo ?? null,
        priceMode: saved.priceMode,
        breakAfterMin: saved.breakAfterMin,
        description: saved.description,
      });
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate("/onboarding/services", {
        state: { toast: mode === "edit" ? "saved" : "added" },
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Не удалось сохранить");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setSaving(false);
    }
  }, [form, mode, navigate, saving, source, validate, webApp]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  if ((mode === "edit" || mode === "duplicate") && !source) {
    return (
      <div className="master-setup">
        <div className="ms-body">
          <p className="ms-lead">Услуга не найдена</p>
          <button type="button" className="ms-btn-secondary" onClick={goBack}>
            К списку
          </button>
        </div>
      </div>
    );
  }

  const showErr = (key: keyof Errors) => tried && errors[key];

  return (
    <>
      <MasterSetupChrome
        step={2}
        progressFilled={2}
        topTitle={headings.title}
        onBack={goBack}
        onClose={handleClose}
        footer={
          <div className="ms-footer-actions">
            {submitError && <p className="ms-field-error ms-footer-error">{submitError}</p>}
            <button
              type="button"
              className="ms-btn-primary"
              disabled={saving}
              onClick={() => void submit()}
            >
              {saving ? "Сохранение…" : headings.cta}
            </button>
            <button
              type="button"
              className="ms-btn-secondary"
              disabled={saving}
              onClick={goBack}
            >
              Отмена
            </button>
          </div>
        }
      >
        <div className="ms-form-stack ms-service-form">
          <label className="ms-field">
            <span className="ms-label">Название услуги</span>
            <input
              className={`ms-input ${showErr("title") ? "is-invalid" : ""}`}
              type="text"
              placeholder="Маникюр с покрытием"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            {showErr("title") && (
              <span className="ms-field-error">{errors.title}</span>
            )}
          </label>

          <fieldset className="ms-field ms-duration-block">
            <legend className="ms-label">Длительность</legend>
            <div
              className={`ms-duration-options ${
                showErr("durationMin") ? "is-invalid" : ""
              }`}
              role="radiogroup"
              aria-label="Длительность услуги"
            >
              {DURATION_OPTIONS.filter((o) => o.value !== -1).map((opt) => {
                const active =
                  sheet !== "duration" &&
                  !form.useCustomDuration &&
                  form.durationMin === opt.value;
                const id = `duration-${opt.value}`;
                return (
                  <label
                    key={opt.value}
                    className="ms-duration-option"
                    htmlFor={id}
                  >
                    <input
                      id={id}
                      type="radio"
                      name="service-duration"
                      className="ms-sheet-radio-input"
                      checked={active}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          useCustomDuration: false,
                          durationMin: opt.value,
                        }))
                      }
                    />
                    <span
                      className={`ms-radio ${active ? "is-on" : ""}`}
                      aria-hidden
                    />
                    <span className="ms-duration-option-label">{opt.label}</span>
                  </label>
                );
              })}
              <label
                className="ms-duration-option"
                htmlFor="duration-custom"
              >
                <input
                  id="duration-custom"
                  type="radio"
                  name="service-duration"
                  className="ms-sheet-radio-input"
                  checked={form.useCustomDuration || sheet === "duration"}
                  onChange={openCustomDuration}
                  onClick={() => {
                    if (form.useCustomDuration || sheet === "duration") {
                      openCustomDuration();
                    }
                  }}
                />
                <span
                  className={`ms-radio ${
                    form.useCustomDuration || sheet === "duration" ? "is-on" : ""
                  }`}
                  aria-hidden
                />
                <span className="ms-duration-option-label">
                  {form.useCustomDuration && form.customDuration
                    ? formatDuration(Number(form.customDuration) || 0)
                    : "Выбрать другое время"}
                </span>
              </label>
            </div>
            {showErr("durationMin") && (
              <span className="ms-field-error">{errors.durationMin}</span>
            )}
          </fieldset>

          <fieldset className="ms-field ms-price-block">
            <legend className="ms-label">Цена</legend>
            <div className="ms-price-options" role="radiogroup" aria-label="Тип цены">
              <div className="ms-price-option">
                <label
                  className="ms-price-option-row"
                  htmlFor="price-mode-fixed"
                >
                  <input
                    id="price-mode-fixed"
                    type="radio"
                    name="price-mode"
                    className="ms-sheet-radio-input"
                    checked={form.priceMode === "fixed"}
                    onChange={() =>
                      setForm((f) => ({ ...f, priceMode: "fixed" }))
                    }
                  />
                  <span
                    className={`ms-radio ${form.priceMode === "fixed" ? "is-on" : ""}`}
                    aria-hidden
                  />
                  <span className="ms-price-option-label">Фиксированная цена</span>
                </label>
                <div
                  className={`ms-input-affix ${
                    form.priceMode !== "fixed" ? "is-disabled" : ""
                  }`}
                >
                  <input
                    className={`ms-input ${
                      showErr("price") && form.priceMode === "fixed"
                        ? "is-invalid"
                        : ""
                    }`}
                    type="text"
                    inputMode="decimal"
                    placeholder="2500"
                    value={form.priceMode === "fixed" ? form.price : ""}
                    disabled={form.priceMode !== "fixed"}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                  />
                  <span className="ms-affix">₽</span>
                </div>
              </div>

              <div className="ms-price-option">
                <label
                  className="ms-price-option-row"
                  htmlFor="price-mode-from"
                >
                  <input
                    id="price-mode-from"
                    type="radio"
                    name="price-mode"
                    className="ms-sheet-radio-input"
                    checked={form.priceMode === "from"}
                    onChange={() =>
                      setForm((f) => ({ ...f, priceMode: "from" }))
                    }
                  />
                  <span
                    className={`ms-radio ${form.priceMode === "from" ? "is-on" : ""}`}
                    aria-hidden
                  />
                  <span className="ms-price-option-label">
                    Цена от указанной суммы
                  </span>
                </label>
                <div
                  className={`ms-price-range ${
                    form.priceMode !== "from" ? "is-disabled" : ""
                  }`}
                >
                  <div className="ms-input-affix ms-input-affix-prefix">
                    <span className="ms-prefix">от</span>
                    <input
                      className={`ms-input ${
                        showErr("price") && form.priceMode === "from"
                          ? "is-invalid"
                          : ""
                      }`}
                      type="text"
                      inputMode="decimal"
                      placeholder="2500"
                      value={form.priceMode === "from" ? form.price : ""}
                      disabled={form.priceMode !== "from"}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, price: e.target.value }))
                      }
                    />
                    <span className="ms-affix">₽</span>
                  </div>
                  <div className="ms-input-affix ms-input-affix-prefix">
                    <span className="ms-prefix">до</span>
                    <input
                      className={`ms-input ${
                        showErr("price") && form.priceMode === "from"
                          ? "is-invalid"
                          : ""
                      }`}
                      type="text"
                      inputMode="decimal"
                      placeholder="3500"
                      value={form.priceMode === "from" ? form.priceTo : ""}
                      disabled={form.priceMode !== "from"}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, priceTo: e.target.value }))
                      }
                    />
                    <span className="ms-affix">₽</span>
                  </div>
                </div>
              </div>
            </div>
            {showErr("price") && (
              <span className="ms-field-error">{errors.price}</span>
            )}
          </fieldset>

          <div className="ms-field">
            <span className="ms-label">Перерыв после услуги</span>
            <button
              type="button"
              className={`ms-select ${showErr("breakAfterMin") ? "is-invalid" : ""}`}
              onClick={() => openSheet("break")}
            >
              <span>{breakLabel}</span>
              <Chevron />
            </button>
            {showErr("breakAfterMin") && (
              <span className="ms-field-error">{errors.breakAfterMin}</span>
            )}
          </div>

          <label className="ms-field">
            <span className="ms-label">
              Описание <span className="ms-optional">необязательно</span>
            </span>
            <textarea
              className="ms-textarea"
              rows={4}
              maxLength={300}
              placeholder="Что входит в услугу"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <span className="ms-char-count">{form.description.length}/300</span>
          </label>
        </div>
      </MasterSetupChrome>

      {sheet && (
        <div className="ms-sheet-root" role="presentation">
          <button
            type="button"
            className="ms-modal-backdrop"
            aria-label="Закрыть"
            onClick={closeSheet}
          />
          <div
            className={`ms-sheet ms-sheet-picker ${sheetPanel === "custom" ? "is-compact" : ""}`}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <ServiceSheetHeader
              title={
                sheet === "duration"
                  ? "Своя длительность"
                  : sheetPanel === "custom"
                    ? "Выбрать другое время"
                    : "Длительность перерыва"
              }
              onClose={closeSheet}
              onBack={
                sheet === "break" && sheetPanel === "custom"
                  ? () => setSheetPanel("list")
                  : undefined
              }
            />
            {sheet === "break" && sheetPanel === "list" ? (
              <>
                <div className="ms-sheet-picker-group">
                  <ul
                    className="ms-sheet-list ms-sheet-picker-list"
                    role="radiogroup"
                    aria-label="Длительность перерыва"
                  >
                    {BREAK_OPTIONS.filter((o) => o.value !== -1).map((opt) => {
                      const active = sheetDraftBreak === opt.value;
                      return (
                        <li key={opt.value}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={active}
                            className={`ms-sheet-item ms-sheet-item-row ${active ? "is-active" : ""}`}
                            onClick={() => setSheetDraftBreak(opt.value)}
                          >
                            <span className="ms-sheet-item-label">
                              {opt.label}
                            </span>
                            <span
                              className={`ms-radio ${active ? "is-on" : ""}`}
                              aria-hidden
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    className="ms-sheet-alt-action"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        customBreak: f.customBreak || "20",
                      }));
                      setSheetPanel("custom");
                    }}
                  >
                    <span className="ms-sheet-alt-action-label">
                      Выбрать другое время
                    </span>
                    <SheetChevronRight />
                  </button>
                </div>
                <div className="ms-sheet-footer">
                  <button
                    type="button"
                    className="ms-btn-primary"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        useCustomBreak: false,
                        breakAfterMin: sheetDraftBreak,
                      }));
                      closeSheet();
                    }}
                  >
                    Готово
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="ms-sheet-custom-body">
                  {sheet === "duration" ? (
                    <div className="ms-sheet-dual">
                      <label className="ms-sheet-segment">
                        <span className="ms-sheet-segment-label">Часы</span>
                        <select
                          className="ms-sheet-segment-control"
                          value={customHours}
                          onChange={(e) =>
                            setCustomHours(Number(e.target.value))
                          }
                        >
                          {DURATION_HOUR_OPTIONS.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="ms-sheet-segment">
                        <span className="ms-sheet-segment-label">Минуты</span>
                        <select
                          className="ms-sheet-segment-control"
                          value={customMinutes}
                          onChange={(e) =>
                            setCustomMinutes(Number(e.target.value))
                          }
                        >
                          {DURATION_MINUTE_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <label className="ms-field ms-sheet-custom-field">
                      <span className="ms-label">Минуты</span>
                      <input
                        className={`ms-input ${
                          showErr("breakAfterMin") ? "is-invalid" : ""
                        }`}
                        type="number"
                        min={1}
                        max={MAX_BREAK_AFTER_MIN}
                        inputMode="numeric"
                        placeholder="20"
                        value={form.customBreak}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            customBreak: e.target.value,
                          }))
                        }
                        autoFocus
                      />
                      {showErr("breakAfterMin") && (
                        <span className="ms-field-error">
                          {errors.breakAfterMin}
                        </span>
                      )}
                    </label>
                  )}
                </div>
                <div className="ms-sheet-footer">
                  <button
                    type="button"
                    className="ms-btn-primary"
                    onClick={() => {
                      if (sheet === "duration") {
                        const mins = customHours * 60 + customMinutes;
                        if (mins <= 0) {
                          setTried(true);
                          setErrors((e) => ({
                            ...e,
                            durationMin:
                              "Длительность должна быть больше 0 мин",
                          }));
                          return;
                        }
                        setForm((f) => ({
                          ...f,
                          useCustomDuration: true,
                          customDuration: String(mins),
                          durationMin: mins,
                        }));
                      } else {
                        const msg = breakError(
                          true,
                          form.customBreak || "20",
                        );
                        if (msg) {
                          setTried(true);
                          setErrors((e) => ({ ...e, breakAfterMin: msg }));
                          return;
                        }
                        const mins = Number(form.customBreak);
                        setForm((f) => ({
                          ...f,
                          useCustomBreak: true,
                          breakAfterMin: mins,
                        }));
                      }
                      closeSheet();
                    }}
                  >
                    Применить
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const DURATION_HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => i);
const DURATION_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);

function ServiceSheetHeader({
  title,
  onClose,
  onBack,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="ms-sheet-toolbar">
      <div className="ms-sheet-grabber" aria-hidden />
      <div className="ms-sheet-toolbar-row">
        {onBack ? (
          <button
            type="button"
            className="ms-icon-btn ms-sheet-icon-btn"
            aria-label="Назад"
            onClick={onBack}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M12.5 4.5 7 10l5.5 5.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span className="ms-sheet-toolbar-side" aria-hidden />
        )}
        <h3 className="ms-sheet-toolbar-title">{title}</h3>
        <button
          type="button"
          className="ms-icon-btn ms-sheet-icon-btn"
          aria-label="Закрыть"
          onClick={onClose}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path
              d="M4.5 4.5l9 9M13.5 4.5l-9 9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function SheetChevronRight() {
  return (
    <svg
      className="ms-sheet-chevron-right"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M7.5 4.167 13.333 10 7.5 15.833"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      className="ms-select-chevron"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
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
