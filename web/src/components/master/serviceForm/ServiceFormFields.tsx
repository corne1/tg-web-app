import {
  BREAK_OPTIONS,
  DURATION_OPTIONS,
  formatDuration,
} from "../../../lib/masterDraft";
import type { ServiceFormState } from "../../../lib/serviceFormState";
import type { ServiceFormErrors } from "../../../lib/serviceFormValidation";
import { Field, Input, SelectTrigger, Textarea } from "../../../ui";
import { ServicePriceBlock } from "./ServicePriceBlock";

type Form = ServiceFormState;
type Errors = ServiceFormErrors;

function durationLabel(form: Form): string {
  if (form.useCustomDuration) {
    return form.customDuration
      ? formatDuration(Number(form.customDuration) || 0)
      : "Выбрать другое время";
  }
  return (
    DURATION_OPTIONS.find((o) => o.value === form.durationMin)?.label ??
    formatDuration(form.durationMin)
  );
}

function breakLabel(form: Form): string {
  if (form.useCustomBreak) {
    return form.customBreak
      ? formatDuration(Number(form.customBreak) || 0)
      : "Выбрать другое время";
  }
  return (
    BREAK_OPTIONS.find((o) => o.value === form.breakAfterMin)?.label ??
    "Без перерыва"
  );
}

export function ServiceFormFields({
  form,
  showError,
  onChange,
  onOpenDuration,
  onOpenBreak,
}: {
  form: Form;
  showError: (key: keyof Errors) => string | undefined;
  onChange: (patch: Partial<Form>) => void;
  onOpenDuration: () => void;
  onOpenBreak: () => void;
}) {
  return (
    <div className="ms-form-stack ms-service-form">
      <Field label="Название услуги" as="label" error={showError("title")}>
        <Input
          invalid={Boolean(showError("title"))}
          type="text"
          placeholder="Маникюр с покрытием"
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </Field>

      <Field label="Длительность" error={showError("durationMin")}>
        <SelectTrigger
          invalid={Boolean(showError("durationMin"))}
          value={durationLabel(form)}
          onClick={onOpenDuration}
        />
      </Field>

      <ServicePriceBlock
        priceMode={form.priceMode}
        price={form.price}
        priceTo={form.priceTo}
        error={showError("price")}
        onPriceModeChange={(priceMode) => onChange({ priceMode })}
        onPriceChange={(price) => onChange({ price })}
        onPriceToChange={(priceTo) => onChange({ priceTo })}
      />

      <Field label="Перерыв после услуги" error={showError("breakAfterMin")}>
        <SelectTrigger
          invalid={Boolean(showError("breakAfterMin"))}
          value={breakLabel(form)}
          onClick={onOpenBreak}
        />
      </Field>

      <Field label="Описание" as="label" optional>
        <Textarea
          rows={4}
          maxLength={300}
          placeholder="Что входит в услугу"
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <span className="ms-char-count">{form.description.length}/300</span>
      </Field>
    </div>
  );
}
