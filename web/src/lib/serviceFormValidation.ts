import { MAX_BREAK_AFTER_MIN, MAX_SERVICE_PRICE } from "./masterDraft";

export type ServiceFormState = {
  title: string;
  durationMin: number;
  customDuration: string;
  useCustomDuration: boolean;
  price: string;
  priceTo: string;
  priceMode: "fixed" | "from";
  breakAfterMin: number;
  customBreak: string;
  useCustomBreak: boolean;
  description: string;
};

export type ServiceFormErrors = Partial<
  Record<"title" | "durationMin" | "price" | "breakAfterMin", string>
>;

export function parsePriceInput(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  if (/[^\d\s.,]/.test(value) || /[a-zA-Zа-яА-ЯёЁ]/.test(value)) {
    return NaN;
  }
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  return Number(normalized);
}

export function priceError(
  raw: string,
  opts?: { required?: boolean; emptyMessage?: string },
): string | undefined {
  const required = opts?.required !== false;
  const value = raw.trim();
  if (!value) {
    return required
      ? (opts?.emptyMessage ?? "Укажите стоимость услуги")
      : undefined;
  }
  const price = parsePriceInput(raw);
  if (price == null || !Number.isFinite(price)) return "Введите стоимость числом";
  if (price < 0) return "Введите корректную стоимость";
  if (price === 0) return "Стоимость должна быть больше 0 ₽";
  if (price > MAX_SERVICE_PRICE) return "Проверьте указанную стоимость";
  return undefined;
}

export function priceBlockError(form: ServiceFormState): string | undefined {
  if (form.priceMode === "fixed") {
    return priceError(form.price);
  }
  const fromMsg = priceError(form.price, {
    emptyMessage: "Укажите стоимость услуги",
  });
  if (fromMsg) return fromMsg;
  const toMsg = priceError(form.priceTo, { required: false });
  if (toMsg) return toMsg;
  const from = parsePriceInput(form.price);
  const to = form.priceTo.trim() ? parsePriceInput(form.priceTo) : null;
  if (
    from != null &&
    Number.isFinite(from) &&
    to != null &&
    Number.isFinite(to) &&
    to < from
  ) {
    return "Введите корректную стоимость";
  }
  return undefined;
}

export function breakError(useCustom: boolean, custom: string): string | undefined {
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

export function validateServiceForm(form: ServiceFormState): ServiceFormErrors {
  const next: ServiceFormErrors = {};
  if (!form.title.trim()) next.title = "Введите название";
  const duration = form.useCustomDuration
    ? Number(form.customDuration)
    : form.durationMin;
  if (!Number.isFinite(duration) || duration <= 0) {
    next.durationMin = "Длительность должна быть больше 0 мин";
  }
  const priceMsg = priceBlockError(form);
  if (priceMsg) next.price = priceMsg;
  const breakMsg = breakError(form.useCustomBreak, form.customBreak);
  if (breakMsg) next.breakAfterMin = breakMsg;
  return next;
}

export function splitDurationMinutes(total: number): {
  hours: number;
  minutes: number;
} {
  const safe = Number.isFinite(total) && total > 0 ? Math.floor(total) : 40;
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}
