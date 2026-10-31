import {
  BREAK_OPTIONS,
  DURATION_OPTIONS,
  type MasterService,
  type PriceMode,
} from "./masterDraft";
import {
  parsePriceInput,
  type ServiceFormState,
} from "./serviceFormValidation";

export type { ServiceFormState };

export function emptyServiceForm(): ServiceFormState {
  return {
    title: "",
    durationMin: 60,
    customDuration: "",
    useCustomDuration: false,
    price: "",
    priceTo: "",
    priceMode: "fixed",
    breakAfterMin: 0,
    customBreak: "",
    useCustomBreak: false,
    description: "",
  };
}

export function formFromService(
  s: MasterService,
  asCopy = false,
): ServiceFormState {
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
    priceTo: s.priceTo ? String(s.priceTo) : "",
    priceMode: s.priceMode,
    breakAfterMin: breakPreset ? s.breakAfterMin : 0,
    customBreak: breakPreset ? "" : String(s.breakAfterMin),
    useCustomBreak: !breakPreset,
    description: s.description,
  };
}

export function formToMasterService(
  form: ServiceFormState,
  opts: { mode: "new" | "edit" | "duplicate"; sourceId?: string },
): MasterService {
  const duration = form.useCustomDuration
    ? Number(form.customDuration)
    : form.durationMin;
  const breakAfterMin = form.useCustomBreak
    ? Number(form.customBreak)
    : form.breakAfterMin;
  const price = parsePriceInput(form.price) ?? 0;
  const priceToRaw = form.priceTo.trim()
    ? parsePriceInput(form.priceTo)
    : null;
  const priceTo =
    form.priceMode === "from" &&
    priceToRaw != null &&
    Number.isFinite(priceToRaw) &&
    priceToRaw > 0
      ? priceToRaw
      : null;

  return {
    id:
      opts.mode === "edit" && opts.sourceId
        ? opts.sourceId
        : crypto.randomUUID(),
    title: form.title.trim(),
    durationMin: duration,
    price,
    priceTo,
    priceMode: form.priceMode as PriceMode,
    breakAfterMin,
    description: form.description.trim(),
  };
}
