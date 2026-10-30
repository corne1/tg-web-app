import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { saveMasterService } from "../api";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  BREAK_OPTIONS,
  DURATION_OPTIONS,
  formatDuration,
  getService,
  MAX_BREAK_AFTER_MIN,
  MAX_SERVICE_PRICE,
  type MasterService,
  type PriceMode,
  upsertService,
} from "../lib/masterDraft";

type Mode = "new" | "edit" | "duplicate";

type FormState = {
  title: string;
  durationMin: number;
  customDuration: string;
  useCustomDuration: boolean;
  price: string;
  priceMode: PriceMode;
  breakAfterMin: number;
  customBreak: string;
  useCustomBreak: boolean;
  description: string;
};

type Errors = Partial<
  Record<"title" | "durationMin" | "price" | "breakAfterMin", string>
>;

function priceError(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return "Укажите стоимость услуги";
  if (/[^\d\s.,]/.test(value) || /[a-zA-Zа-яА-ЯёЁ]/.test(value)) {
    return "Введите стоимость числом";
  }
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const price = Number(normalized);
  if (!Number.isFinite(price)) return "Введите стоимость числом";
  if (price < 0) return "Введите корректную стоимость";
  if (price === 0) return "Стоимость должна быть больше 0 ₽";
  if (price > MAX_SERVICE_PRICE) return "Проверьте указанную стоимость";
  return undefined;
}

function breakError(useCustom: boolean, custom: string): string | undefined {
  if (!useCustom) return undefined;
  const mins = Number(custom);
  if (!Number.isFinite(mins) || mins <= 0) {
    return "Перерыв должен быть больше 0 минут";
  }
  if (mins > MAX_BREAK_AFTER_MIN) {
    return `Укажите перерыв не более ${MAX_BREAK_AFTER_MIN} минут`;
  }
  return undefined;
}

type Sheet = "duration" | "break" | null;

function emptyForm(): FormState {
  return {
    title: "",
    durationMin: 60,
    customDuration: "",
    useCustomDuration: false,
    price: "",
    priceMode: "fixed",
    breakAfterMin: 0,
    customBreak: "",
    useCustomBreak: false,
    description: "",
  };
}

function fromService(s: MasterService, asCopy = false): FormState {
  const preset = DURATION_OPTIONS.some(
    (o) => o.value === s.durationMin && o.value !== -1,
  );
  const breakPreset = BREAK_OPTIONS.some(
    (o) => o.value === s.breakAfterMin && o.value !== -1,
  );
  return {
    title: asCopy ? `${s.title} (копия)` : s.title,
    durationMin: s.durationMin,
    customDuration: preset ? "" : String(s.durationMin),
    useCustomDuration: !preset,
    price: s.price ? String(s.price) : "",
    priceMode: s.priceMode,
    breakAfterMin: breakPreset ? s.breakAfterMin : 0,
    customBreak: breakPreset ? "" : String(s.breakAfterMin),
    useCustomBreak: !breakPreset,
    description: s.description,
  };
}

export function ServiceFormScreen({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const { serviceId } = useParams();
  const { webApp } = useTelegram();

  const source = serviceId ? getService(serviceId) : null;
  const [form, setForm] = useState<FormState>(() => {
    if ((mode === "edit" || mode === "duplicate") && source) {
      return fromService(source, mode === "duplicate");
    }
    return emptyForm();
  });
  const [errors, setErrors] = useState<Errors>({});
  const [sheet, setSheet] = useState<Sheet>(null);
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

  const durationLabel = form.useCustomDuration
    ? form.customDuration
      ? formatDuration(Number(form.customDuration) || 0)
      : "Своя длительность"
    : formatDuration(form.durationMin);

  const breakLabel = form.useCustomBreak
    ? form.customBreak
      ? formatDuration(Number(form.customBreak) || 0)
      : "Другое время"
    : (BREAK_OPTIONS.find((o) => o.value === form.breakAfterMin)?.label ??
      "Без перерыва");

  const goBack = useCallback(
    () => navigate("/onboarding/services"),
    [navigate],
  );

  const validate = useCallback((): Errors => {
    const next: Errors = {};
    if (!form.title.trim()) next.title = "Введите название";
    const duration = form.useCustomDuration
      ? Number(form.customDuration)
      : form.durationMin;
    if (!Number.isFinite(duration) || duration <= 0) {
      next.durationMin = "Длительность должна быть больше 0 мин";
    }
    const priceMsg = priceError(form.price);
    if (priceMsg) next.price = priceMsg;
    const breakMsg = breakError(form.useCustomBreak, form.customBreak);
    if (breakMsg) next.breakAfterMin = breakMsg;
    return next;
  }, [form]);

  const submit = useCallback(async () => {
    if (saving) return;
    setTried(true);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      webApp?.HapticFeedback?.notificationOccurred("error");
      return;
    }

    const duration = form.useCustomDuration
      ? Number(form.customDuration)
      : form.durationMin;
    const breakAfterMin = form.useCustomBreak
      ? Number(form.customBreak)
      : form.breakAfterMin;
    const price = Number(form.price.trim().replace(/\s/g, "").replace(",", "."));

    const service: MasterService = {
      id: mode === "edit" && source ? source.id : crypto.randomUUID(),
      title: form.title.trim(),
      durationMin: duration,
      price,
      priceMode: form.priceMode,
      breakAfterMin,
      description: form.description.trim(),
    };

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
    <div className="master-setup">
      <header className="ms-top">
        <button type="button" className="ms-icon-btn" aria-label="Назад" onClick={goBack}>
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
        <div className="ms-top-titles">
          <h1 className="ms-top-title">{headings.title}</h1>
          <p className="ms-top-sub">Шаг 2 из 4</p>
        </div>
        <button type="button" className="ms-icon-btn" aria-label="Закрыть" onClick={goBack}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path
              d="M4.5 4.5l9 9M13.5 4.5l-9 9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <div className="ms-body ms-form-body">
        <label className="ms-field">
          <span className="ms-label">Название услуги</span>
          <input
            className={`ms-input ${showErr("title") ? "is-invalid" : ""}`}
            type="text"
            placeholder="Маникюр с покрытием"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          {showErr("title") && <span className="ms-field-error">{errors.title}</span>}
        </label>

        <div className="ms-field">
          <span className="ms-label">Длительность</span>
          <button
            type="button"
            className={`ms-select ${showErr("durationMin") ? "is-invalid" : ""}`}
            onClick={() => setSheet("duration")}
          >
            <span>{durationLabel}</span>
            <Chevron />
          </button>
          {showErr("durationMin") && (
            <span className="ms-field-error">{errors.durationMin}</span>
          )}
          {form.useCustomDuration && (
            <input
              className={`ms-input mt-2 ${showErr("durationMin") ? "is-invalid" : ""}`}
              type="number"
              min={1}
              placeholder="Минуты"
              value={form.customDuration}
              onChange={(e) =>
                setForm((f) => ({ ...f, customDuration: e.target.value }))
              }
            />
          )}
        </div>

        <div className="ms-field">
          <span className="ms-label">Цена</span>
          <div className="ms-price-modes" role="radiogroup" aria-label="Тип цены">
            <button
              type="button"
              role="radio"
              aria-checked={form.priceMode === "fixed"}
              className={`ms-chip ${form.priceMode === "fixed" ? "is-active" : ""}`}
              onClick={() => setForm((f) => ({ ...f, priceMode: "fixed" }))}
            >
              Фиксированная
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={form.priceMode === "from"}
              className={`ms-chip ${form.priceMode === "from" ? "is-active" : ""}`}
              onClick={() => setForm((f) => ({ ...f, priceMode: "from" }))}
            >
              От суммы
            </button>
          </div>
          <div className="ms-input-affix">
            <input
              className={`ms-input ${showErr("price") ? "is-invalid" : ""}`}
              type="text"
              inputMode="decimal"
              placeholder="2500"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
            <span className="ms-affix">₽</span>
          </div>
          {showErr("price") && <span className="ms-field-error">{errors.price}</span>}
        </div>

        <div className="ms-field">
          <span className="ms-label">Перерыв после услуги</span>
          <button
            type="button"
            className={`ms-select ${showErr("breakAfterMin") ? "is-invalid" : ""}`}
            onClick={() => setSheet("break")}
          >
            <span>{breakLabel}</span>
            <Chevron />
          </button>
          {showErr("breakAfterMin") && (
            <span className="ms-field-error">{errors.breakAfterMin}</span>
          )}
          {form.useCustomBreak && (
            <input
              className={`ms-input mt-2 ${showErr("breakAfterMin") ? "is-invalid" : ""}`}
              type="number"
              min={1}
              max={MAX_BREAK_AFTER_MIN}
              placeholder="Минуты"
              value={form.customBreak}
              onChange={(e) =>
                setForm((f) => ({ ...f, customBreak: e.target.value }))
              }
            />
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
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <span className="ms-char-count">{form.description.length}/300</span>
        </label>
      </div>

      <footer className="ms-footer">
        {submitError && <p className="error">{submitError}</p>}
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
      </footer>

      {sheet && (
        <div className="ms-sheet-root" role="presentation">
          <button
            type="button"
            className="ms-modal-backdrop"
            aria-label="Закрыть"
            onClick={() => setSheet(null)}
          />
          <div className="ms-sheet" role="dialog" aria-modal="true">
            <div className="ms-sheet-handle" aria-hidden />
            <h3 className="ms-sheet-title">
              {sheet === "duration" ? "Длительность" : "Перерыв после услуги"}
            </h3>
            <ul className="ms-sheet-list">
              {sheet === "duration" &&
                DURATION_OPTIONS.map((opt) => {
                  const active =
                    opt.value === -1
                      ? form.useCustomDuration
                      : !form.useCustomDuration && form.durationMin === opt.value;
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        className={`ms-sheet-item ${active ? "is-active" : ""}`}
                        onClick={() => {
                          if (opt.value === -1) {
                            setForm((f) => ({
                              ...f,
                              useCustomDuration: true,
                              customDuration: f.customDuration || "40",
                            }));
                          } else {
                            setForm((f) => ({
                              ...f,
                              useCustomDuration: false,
                              durationMin: opt.value,
                            }));
                          }
                          setSheet(null);
                        }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  );
                })}
              {sheet === "break" &&
                BREAK_OPTIONS.map((opt) => {
                  const active =
                    opt.value === -1
                      ? form.useCustomBreak
                      : !form.useCustomBreak && form.breakAfterMin === opt.value;
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        className={`ms-sheet-item ${active ? "is-active" : ""}`}
                        onClick={() => {
                          if (opt.value === -1) {
                            setForm((f) => ({
                              ...f,
                              useCustomBreak: true,
                              customBreak: f.customBreak || "20",
                            }));
                          } else {
                            setForm((f) => ({
                              ...f,
                              useCustomBreak: false,
                              breakAfterMin: opt.value,
                            }));
                          }
                          setSheet(null);
                        }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      )}
    </div>
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
