import type { ServiceFormState } from "../../../lib/serviceFormState";
import { AffixInput, Field, RadioInput, RadioMark, cx } from "../../../ui";

type PriceMode = ServiceFormState["priceMode"];

export function ServicePriceBlock({
  priceMode,
  price,
  priceTo,
  error,
  onPriceModeChange,
  onPriceChange,
  onPriceToChange,
}: {
  priceMode: PriceMode;
  price: string;
  priceTo: string;
  error?: string;
  onPriceModeChange: (mode: PriceMode) => void;
  onPriceChange: (value: string) => void;
  onPriceToChange: (value: string) => void;
}) {
  return (
    <Field label="Цена" as="fieldset" className="ms-price-block" error={error}>
      <div className="ms-price-options" role="radiogroup" aria-label="Тип цены">
        <div className="ms-price-option">
          <label className="ms-price-option-row" htmlFor="price-mode-fixed">
            <RadioInput
              id="price-mode-fixed"
              name="price-mode"
              checked={priceMode === "fixed"}
              onChange={() => onPriceModeChange("fixed")}
            />
            <RadioMark checked={priceMode === "fixed"} />
            <span className="ms-price-option-label">Фиксированная цена</span>
          </label>
          <AffixInput
            disabledVisual={priceMode !== "fixed"}
            invalid={Boolean(error) && priceMode === "fixed"}
            inputMode="decimal"
            placeholder="2500"
            value={priceMode === "fixed" ? price : ""}
            disabled={priceMode !== "fixed"}
            onChange={(e) => onPriceChange(e.target.value)}
          />
        </div>

        <div className="ms-price-option">
          <label className="ms-price-option-row" htmlFor="price-mode-from">
            <RadioInput
              id="price-mode-from"
              name="price-mode"
              checked={priceMode === "from"}
              onChange={() => onPriceModeChange("from")}
            />
            <RadioMark checked={priceMode === "from"} />
            <span className="ms-price-option-label">Цена от указанной суммы</span>
          </label>
          <div
            className={cx(
              "ms-price-range",
              priceMode !== "from" && "is-disabled",
            )}
          >
            <AffixInput
              prefix="от"
              invalid={Boolean(error) && priceMode === "from"}
              inputMode="decimal"
              placeholder="2500"
              value={priceMode === "from" ? price : ""}
              disabled={priceMode !== "from"}
              onChange={(e) => onPriceChange(e.target.value)}
            />
            <AffixInput
              prefix="до"
              invalid={Boolean(error) && priceMode === "from"}
              inputMode="decimal"
              placeholder="3500"
              value={priceMode === "from" ? priceTo : ""}
              disabled={priceMode !== "from"}
              onChange={(e) => onPriceToChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Field>
  );
}
